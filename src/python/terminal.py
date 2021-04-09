import argparse
import base64
import json
import os
import signal
import sys
import threading
import time
import uuid
import urllib.parse
import re
from requests.auth import HTTPBasicAuth

from functools import partial
from queue import Queue

from mesos.errors import MesosException
from mesos import http
from mesos import recordio
from mesos import util

if not util.is_windows_platform():
    import termios
    import tty

class TaskIO(object):
    """Object used to stream I/O between a
    running Mesos task and the local terminal.

    :param task: task ID
    :type task: str
    :param cmd: a command to launch inside the task's container
    :type cmd: str
    :param args: Additional arguments for the command
    :type args: str
    :param env: List of environment variable to enrich the shell with (NAME=value, colon separated)
    :type env: str
    :param interactive: whether to attach STDIN of the current
                        terminal to the new command being launched
    :type interactive: bool
    :param tty: whether to allocate a tty for this command and attach
                the local terminal to it
    :type tty: bool
    """

    # The interval to send heartbeat messages to
    # keep persistent connections alive.
    HEARTBEAT_INTERVAL = 30
    HEARTBEAT_INTERVAL_NANOSECONDS = HEARTBEAT_INTERVAL * 1000000000

    def __init__(self, agent_url, container_id, parent_container_id=None, user=None, cmd=None,
                 env=None, env_separator=':',
                 http_principal=None, http_password=None,
                 args=None, interactive=False, tty=False):
        # Store relevant parameters of the call for later.
        self.cmd = cmd
        self.env = env
        self.env_separator = env_separator
        self.interactive = interactive
        self.tty = tty
        self.args = args

        # Get the URL to the agent running the task.
        self.agent_url = urllib.parse.urljoin(agent_url, 'api/v1')
        self.auth = None
        if http_principal is not None and http_password is not None:
            self.auth = HTTPBasicAuth(http_principal, http_password)

        # Grab a reference to the container ID for the task.
        self.parent_id = container_id
        self.parent_container_id = parent_container_id
        self.user = user

        # Generate a new UUID for the nested container
        # used to run commands passed to `task exec`.
        self.container_id = str(uuid.uuid4())

        # Set up a recordio encoder and decoder
        # for any incoming and outgoing messages.
        self.encoder = recordio.Encoder(
            lambda s: bytes(json.dumps(s, ensure_ascii=False), "UTF-8"))
        self.decoder = recordio.Decoder(
            lambda s: json.loads(s.decode("UTF-8")))

        # Set up queues to send messages between threads used for
        # reading/writing to STDIN/STDOUT/STDERR and threads
        # sending/receiving data over the network.
        self.input_queue = Queue()
        self.output_queue = Queue()

        # Set up an event to block attaching
        # input until attaching output is complete.
        self.attach_input_event = threading.Event()
        self.attach_input_event.clear()

        # Set up an event to block printing the output
        # until an attach input event has successfully
        # been established.
        self.print_output_event = threading.Event()
        self.print_output_event.clear()

        # Set up an event to block the main thread
        # from exiting until signaled to do so.
        self.exit_event = threading.Event()
        self.exit_event.clear()

        # Use a class variable to store exceptions thrown on
        # other threads and raise them on the main thread before
        # exiting.
        self.exception = None

    def run(self):
        """Run the helper threads in this class which enable streaming
        of STDIN/STDOUT/STDERR between the CLI and the Mesos Agent API.

        If a tty is requested, we take over the current terminal and
        put it into raw mode. We make sure to reset the terminal back
        to its original settings before exiting.
        """

        # Without a TTY.
        if not self.tty:
            try:
                self._start_threads()
                self.exit_event.wait()
            except Exception as e:
                self.exception = e

            if self.exception:
                raise self.exception
            return

        # With a TTY.
        if util.is_windows_platform():
            raise MesosException(
                "Running with the '--tty' flag is not supported on windows.")

        if not sys.stdin.isatty():
            raise MesosException(
                "Must be running in a tty to pass the '--tty flag'.")

        fd = sys.stdin.fileno()
        oldtermios = termios.tcgetattr(fd)

        try:
            if self.interactive:
                tty.setraw(fd, when=termios.TCSANOW)
                self._window_resize(signal.SIGWINCH, None)
                signal.signal(signal.SIGWINCH, self._window_resize)

            self._start_threads()
            self.exit_event.wait()
        except Exception as e:
            self.exception = e

        termios.tcsetattr(
            sys.stdin.fileno(),
            termios.TCSAFLUSH,
            oldtermios)

        if self.exception:
            raise self.exception

    def _thread_wrapper(self, func):
        """A wrapper around all threads used in this class

        If a thread throws an exception, it will unblock the main
        thread and save the exception in a class variable. The main
        thread will then rethrow the exception before exiting.

        :param func: The start function for the thread
        :type func: function
        """
        try:
            func()
        except Exception as e:
            self.exception = e
            self.exit_event.set()

    def _start_threads(self):
        """Start all threads associated with this class
        """
        if self.interactive:
            # Collects input from STDIN and puts
            # it in the input_queue as data messages.
            thread = threading.Thread(
                target=self._thread_wrapper,
                args=(self._input_thread,))
            thread.daemon = True
            thread.start()

            # Prepares heartbeat control messages and
            # puts them in the input queueaat a specific
            # heartbeat interval.
            thread = threading.Thread(
                 target=self._thread_wrapper,
                 args=(self._heartbeat_thread,))
            thread.daemon = True
            thread.start()

            # Opens a persistent connection with the mesos agent and
            # feeds it both control and data messages from the input
            # queue via ATTACH_CONTAINER_INPUT messages.
            thread = threading.Thread(
                 target=self._thread_wrapper,
                 args=(self._attach_container_input,))
            thread.daemon = True
            thread.start()

        # Opens a persistent connection with a mesos agent, reads
        # data messages from it and feeds them to an output_queue.
        thread = threading.Thread(
            target=self._thread_wrapper,
            args=(self._launch_nested_container_session,))
        thread.daemon = True
        thread.start()

        # Collects data messages from the output queue and writes
        # their content to STDOUT and STDERR.
        thread = threading.Thread(
            target=self._thread_wrapper,
            args=(self._output_thread,))
        thread.daemon = True
        thread.start()

    def _launch_nested_container_session(self):
        """Sends a request to the Mesos Agent to launch a new
        nested container and attach to its output stream.
        The output stream is then sent back in the response.
        """

        message = {
            'type': "LAUNCH_NESTED_CONTAINER_SESSION",
            'launch_nested_container_session': {
                'container_id': {
                    'parent': { 'value': self.parent_id },
                    'value': self.container_id
                },
                'command': {
                    'value': self.cmd,
                    'arguments': [self.cmd] + self.args,
                    'shell': False}}}
        # If we have to launch in a task group, we need double nesting
        if self.parent_container_id is not None:
            message['launch_nested_container_session']['container_id']['parent']['parent'] = { 'value': self.parent_container_id }
        if self.env is not None:
            env_vars = []
            env_var_regex = re.compile('^([A-Z_][A-Z0-9_]*)=(.*)$')
            for env_var in self.env.split(self.env_separator):
                matches = env_var_regex.match(env_var)
                if matches and len(matches.groups()) == 2:
                    env_vars.append({
                        'name': matches.group(1),
                        'type': 'VALUE',
                        'value': matches.group(2)
                    })
            message['launch_nested_container_session']['command']['environment'] = {
                'variables': env_vars
            }

        if not self.user is None:
          message['launch_nested_container_session']['command']['user'] =\
             self.user

        if self.tty:
            message[
                'launch_nested_container_session'][
                    'container'] = {
                        'type': 'MESOS',
                        'tty_info': {}}

        req_extra_args = {
            'stream': True,
            'headers': {
                'Content-Type': 'application/json',
                'Accept': 'application/recordio',
                'Message-Accept': 'application/json'}}

        response = http.post(
            self.agent_url,
            data=json.dumps(message),
            auth=self.auth,
            timeout=None,
            **req_extra_args)

        self._process_output_stream(response)

    def _process_output_stream(self, response):
        """Gets data streamed over the given response and places the
        returned messages into our output_queue. Only expects to
        receive data messages.

        :param response: Response from an http post
        :type response: requests.models.Response
        """

        # Now that we are ready to process the output stream (meaning
        # our output connection has been established), allow the input
        # stream to be attached by setting an event.
        self.attach_input_event.set()

        # If we are running in interactive mode, wait to make sure that
        # our input connection succeeds before pushing any output to the
        # output queue.
        if self.interactive:
            self.print_output_event.wait()

        try:
            for chunk in response.iter_content(chunk_size=None):
                records = self.decoder.decode(chunk)

                for r in records:
                    if r.get('type') and r['type'] == 'DATA':
                        self.output_queue.put(r['data'])
        except Exception as e:
            raise MesosException(
                "Error parsing output stream: {error}".format(error=e))

        self.output_queue.join()
        self.exit_event.set()

    def _attach_container_input(self):
        """Streams all input data (e.g. STDIN) from the client to the agent
        """

        def _initial_input_streamer():
            """Generator function yielding the initial ATTACH_CONTAINER_INPUT
            message for streaming. We have a separate generator for this so
            that we can attempt the connection once before committing to a
            persistent connection where we stream the rest of the input.

            :returns: A RecordIO encoded message
            """

            message = {
                'type': 'ATTACH_CONTAINER_INPUT',
                'attach_container_input': {
                    'type': 'CONTAINER_ID',
                    'container_id': {
                        'parent': { 'value': self.parent_id },
                        'value': self.container_id}}}
            if self.parent_container_id is not None:
                message['attach_container_input']['container_id']['parent']['parent'] = { 'value': self.parent_container_id }

            yield self.encoder.encode(message)

        def _input_streamer():
            """Generator function yielding ATTACH_CONTAINER_INPUT
            messages for streaming. It yields the _intitial_input_streamer()
            message, followed by messages from the input_queue on each
            subsequent call.

            :returns: A RecordIO encoded message
            """

            yield next(_initial_input_streamer())

            while True:
                record = self.input_queue.get()
                if not record:
                    break
                yield record

        req_extra_args = {
            'headers': {
                'Content-Type': 'application/recordio',
                'Message-Content-Type': 'application/json',
                'Accept': 'application/json',
                'Connection': 'close',
                'Transfer-Encoding': 'chunked'
            }
        }

        # Ensure we don't try to attach our input to a container that isn't
        # fully up and running by waiting until the
        # `_process_output_stream` function signals us that it's ready.
        self.attach_input_event.wait()

        # Send an intial "Test" message to ensure that we are able to
        # establish a connection with the agent. If we aren't we will throw
        # an exception and break out of this thread. However, in cases where
        # we receive a 500 response from the agent, we actually want to
        # continue without throwing an exception. A 500 error indicates that
        # we can't connect to the container because it has already finished
        # running. In that case we continue running to allow the output queue
        # to be flushed.
        try:
            http.post(
                self.agent_url,
                data=_initial_input_streamer(),
                auth=self.auth,
                **req_extra_args)
        except MesosHTTPException as e:
            if not e.response.status_code == 500:
                raise e

        # If we succeeded with that connection, unblock process_output_stream()
        # from sending output data to the output thread.
        self.print_output_event.set()

        # Begin streaming the input.
        http.post(
            self.agent_url,
            data=_input_streamer(),
            timeout=None,
            auth=self.auth,
            **req_extra_args)

    def _input_thread(self):
        """Reads from STDIN and places a message
        with that data onto the input_queue.
        """

        message = {
            'type': 'ATTACH_CONTAINER_INPUT',
            'attach_container_input': {
                'type': 'PROCESS_IO',
                'process_io': {
                    'type': 'DATA',
                    'data': {
                        'type': 'STDIN',
                        'data': ''}}}}

        for chunk in iter(partial(os.read, sys.stdin.fileno(), 1024), b''):
            message[
                'attach_container_input'][
                    'process_io'][
                        'data'][
                            'data'] = base64.b64encode(chunk).decode('utf-8')

            self.input_queue.put(self.encoder.encode(message))

        # Push an empty string to indicate EOF to the server and push
        # 'None' to signal that we are done processing input.
        message['attach_container_input']['process_io']['data']['data'] = ''
        self.input_queue.put(self.encoder.encode(message))
        self.input_queue.put(None)

    def _output_thread(self):
        """Reads from the output_queue and writes the data
        to the appropriate STDOUT or STDERR.
        """

        while True:
            # Get a message from the output queue and decode it.
            # Then write the data to the appropriate stdout or stderr.
            output = self.output_queue.get()
            if not output.get('data'):
                raise MesosException("Error no 'data' field in output message")

            data = output['data']
            data = base64.b64decode(data.encode('utf-8'))

            if output.get('type') and output['type'] == 'STDOUT':
                sys.stdout.buffer.write(data)
                sys.stdout.flush()
            elif output.get('type') and output['type'] == 'STDERR':
                sys.stderr.buffer.write(data)
                sys.stderr.flush()
            else:
                raise MesosException("Unsupported data type in output stream")

            self.output_queue.task_done()

    def _heartbeat_thread(self):
        """Generates a heartbeat message to send over the
        ATTACH_CONTAINER_INPUT stream every `interval` seconds and
        inserts it in the input queue.
        """

        interval = self.HEARTBEAT_INTERVAL
        nanoseconds = self.HEARTBEAT_INTERVAL_NANOSECONDS

        message = {
            'type': 'ATTACH_CONTAINER_INPUT',
            'attach_container_input': {
                'type': 'PROCESS_IO',
                'process_io': {
                    'type': 'CONTROL',
                    'control': {
                        'type': 'HEARTBEAT',
                        'heartbeat': {
                              'interval': {
                                   'nanoseconds': nanoseconds}}}}}}

        while True:
            self.input_queue.put(self.encoder.encode(message))
            time.sleep(interval)

    def _window_resize(self, signum, frame):
        """Signal handler for SIGWINCH.

        Generates a message with the current demensions of the
        terminal and puts it in the input_queue.

        :param signum: the signal number being handled
        :type signum: int
        :param frame: current stack frame
        :type frame: frame
        """

        # Determine the size of our terminal, and create the message to be sent
        rows, columns = os.popen('stty size', 'r').read().split()

        message = {
            'type': 'ATTACH_CONTAINER_INPUT',
            'attach_container_input': {
                'type': 'PROCESS_IO',
                'process_io': {
                    'type': 'CONTROL',
                    'control': {
                        'type': 'TTY_INFO',
                        'tty_info': {
                              'window_size': {
                                  'rows': int(rows),
                                  'columns': int(columns)}}}}}}

        self.input_queue.put(self.encoder.encode(message))

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='Run commands in a nested container of a mesos task.')

  parser.add_argument('agent_url', type=str, help='The url of the agent to connect to.')
  parser.add_argument('container_id', type=str, help='The container id to connect to.')
  parser.add_argument('--user', type=str, help='The user to run the command as.')
  parser.add_argument('--cmd', type=str, default="/bin/sh", help='The command to run in the container.')
  parser.add_argument('--env', type=str, help='List of environment variable to enrich the shell with (NAME=value, colon separated by default).')
  parser.add_argument('--env-separator', type=str, help='Separator for --env argument (default :)')
  parser.add_argument('--parent', type=str, help='The parent container id if the container id to connect to is nested (task groups)')
  parser.add_argument('--http_principal', type=str, help='The principal to connect to API v1 of the Mesos agent.')
  parser.add_argument('--http_password', type=str, help='The password to connect to API v1 of the Mesos agent.')
  args = parser.parse_args()

  t = TaskIO(agent_url=args.agent_url, container_id=args.container_id,
             parent_container_id=args.parent,
             tty=True, user=args.user, interactive=True, cmd=args.cmd,
             env=args.env, env_separator=args.env_separator,
             http_principal=args.http_principal,
             http_password=args.http_password, args=[])
  t.run()

