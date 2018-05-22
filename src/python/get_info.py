import argparse
import fnmatch
import itertools
import urllib.parse

from mesos.errors import MesosException
from mesos import http
from mesos import recordio
from mesos import util

def get_master_state(master_url):
        """Get the Mesos master state json object

        :returns: Mesos' master state json object
        :rtype: dict
        """

        url = urllib.parse.urljoin(master_url, 'master/state.json')
        return http.get(url, timeout=30).json()

def parse_pid(pid):
    """ Parse the mesos pid string,

    :param pid: pid of the form "id@ip:port"
    :type pid: str
    :returns: (id, ip, port)
    :rtype: (str, str, str)
    """

    id_, second = pid.split('@')
    ip, port = second.split(':')
    return id_, ip, port

def _merge(d, keys):
    """ Merge multiple lists from a dictionary into one iterator.
        e.g. _merge({'a': [1, 2], 'b': [3]}, ['a', 'b']) ->
             iter(1, 2, 3)

    :param d: dictionary
    :type d: dict
    :param keys: keys to merge
    :type keys: [hashable]
    :returns: iterator
    :rtype: iter
    """

    return itertools.chain(*[d[k] for k in keys])

class Master(object):
    """Mesos Master Model

    :param state: Mesos master's state.json
    :type state: dict
    """

    def __init__(self, state):
        self._state = state
        self._frameworks = {}
        self._slaves = {}

    def state(self):
        """Returns master's master/state.json.

        :returns: state.json
        :rtype: dict
        """

        return self._state

    def slave(self, fltr):
        """Returns the slave that has `fltr` in its ID. If any slaves
        are an exact match, returns that task, id not raises a
        MesosException if there is not exactly one such slave.

        :param fltr: filter string
        :type fltr: str
        :returns: the slave that has `fltr` in its ID
        :rtype: Slave
        """

        slaves = self.slaves(fltr)

        if len(slaves) == 0:
            raise MesosException('No agent found with ID "{}".'.format(fltr))

        elif len(slaves) > 1:

            exact_matches = [s for s in slaves if s['id'] == fltr]
            if len(exact_matches) == 1:
                return exact_matches[0]

            else:
                matches = ['\t{0}'.format(s['id']) for s in slaves]
                raise MesosException(
                    "There are multiple agents with that ID. " +
                    "Please choose one:\n{}".format('\n'.join(matches)))

        else:
            return slaves[0]

    def task(self, fltr, completed=False):
        """Returns the task with `fltr` in its ID.  Raises a MesosException if
        there is not exactly one such task.

        :param fltr: filter string
        :type fltr: str
        :returns: the task that has `fltr` in its ID
        :param completed: also include completed tasks
        :type completed: bool
        :rtype: Task
        """

        tasks = self.tasks(fltr, completed)

        if len(tasks) == 0:
            raise MesosException(
                'Cannot find a task with ID containing "{}"'.format(fltr))

        elif len(tasks) > 1:
            msg = [("There are multiple tasks with ID matching [{}]. " +
                    "Please choose one:").format(fltr)]
            msg += ["\t{0}".format(t["id"]) for t in tasks]
            raise MesosException('\n'.join(msg))

        else:
            return tasks[0]

    def framework(self, framework_id):
        """Returns a framework by ID

        :param framework_id: the framework's ID
        :type framework_id: str
        :returns: the framework
        :rtype: Framework
        """

        for f in self._framework_dicts(True, True):
            if f['id'] == framework_id:
                return self._framework_obj(f)
        return None

    def slaves(self, fltr=""):
        """Returns those slaves that have `fltr` in their 'id'

        :param fltr: filter string
        :type fltr: str
        :returns: Those slaves that have `fltr` in their 'id'
        :rtype: [Slave]
        """

        return [self._slave_obj(slave)
                for slave in self.state()['slaves']
                if fltr in slave['id']]

    def tasks(self, fltr=None, completed=False, all_=False):
        """Returns tasks running under the master

        :param fltr: May be None, a substring or regex. None returns all tasks,
                     else return tasks whose 'id' matches `fltr`.
        :type fltr: str | None
        :param completed: completed tasks only
        :type completed: bool
        :param all_: If True, include all tasks
        :type all_: bool
        :returns: a list of tasks
        :rtype: [Task]
        """

        keys = ['tasks']
        show_completed = completed or all_
        if show_completed:
            keys.extend(['completed_tasks'])

        tasks = []
        # get all frameworks
        for framework in self._framework_dicts(True, True, True):
            for task in _merge(framework, keys):
                state = task.get("state")
                if completed and state not in COMPLETED_TASK_STATES:
                        continue

                if fltr is None or \
                        fltr in task['id'] or \
                        fnmatch.fnmatchcase(task['id'], fltr):
                    task = self._framework_obj(framework).task(task['id'])
                    tasks.append(task)

        return tasks

    def get_container_id(self, task_id):
        """Returns the container ID for a task ID matching `task_id`

        :param task_id: The task ID which will be mapped to container ID
        :type task_id: str
        :returns: The container ID associated with 'task_id'
        :rtype: str
        """

        def _get_task(task_id):
            candidates = []
            if 'frameworks' in self.state():
                for framework in self.state()['frameworks']:
                    if 'tasks' in framework:
                        for task in framework['tasks']:
                            if 'id' in task:
                                if task['id'].startswith(task_id):
                                    candidates.append(task)

            if len(candidates) == 1:
                return candidates[0]

            raise MesosException(
                "More than one task matching '{}' found: {}"
                .format(task_id, candidates))

        def _get_container_status(task):
            if 'statuses' in task:
                if len(task['statuses']) > 0:
                    if 'container_status' in task['statuses'][0]:
                        return task['statuses'][0]['container_status']

            raise MesosException(
                "Unable to obtain container status for task '{}'"
                .format(task['id']))

        def _get_container_id(container_status):
            if 'container_id' in container_status:
                if 'value' in container_status['container_id']:
                    return container_status['container_id']

            raise MesosException(
                "No container found for the specified task."
                " It might still be spinning up."
                " Please try again.")

        if not task_id:
            raise MesosException("Invalid task ID")

        task = _get_task(task_id)
        container_status = _get_container_status(task)
        return _get_container_id(container_status)

    def frameworks(self, inactive=False, completed=False):
        """Returns a list of all frameworks

        :param inactive: also include inactive frameworks
        :type inactive: bool
        :param completed: also include completed frameworks
        :type completed: bool
        :returns: a list of frameworks
        :rtype: [Framework]
        """

        return [self._framework_obj(framework)
                for framework in self._framework_dicts(inactive, completed)]

    # @util.duration
    def fetch(self, path, **kwargs):
        """GET the resource located at `path`

        :param path: the URL path
        :type path: str
        :param **kwargs: http.get kwargs
        :type **kwargs: dict
        :returns: the response object
        :rtype: Response
        """

        url = urllib.parse.urljoin(self._base_url(), path)
        return http.get(url, **kwargs)

    def _slave_obj(self, slave):
        """Returns the Slave object corresponding to the provided `slave`
        dict.  Creates it if it doesn't exist already.

        :param slave: slave
        :type slave: dict
        :returns: Slave
        :rtype: Slave
        """

        if slave['id'] not in self._slaves:
            self._slaves[slave['id']] = Slave(slave, None, self)
        return self._slaves[slave['id']]

    def _framework_obj(self, framework):
        """Returns the Framework object corresponding to the provided `framework`
        dict.  Creates it if it doesn't exist already.

        :param framework: framework
        :type framework: dict
        :returns: Framework
        :rtype: Framework
        """

        if framework['id'] not in self._frameworks:
            self._frameworks[framework['id']] = Framework(framework, self)
        return self._frameworks[framework['id']]

    def _framework_dicts(self, inactive=False, completed=False, active=True):
        """Returns a list of all frameworks as their raw dictionaries

        :param inactive: include inactive frameworks
        :type inactive: bool
        :param completed: include completed frameworks
        :type completed: bool
        :param active: include active frameworks
        :type active: bool
        :returns: a list of frameworks
        """

        if completed:
            for framework in self.state()['completed_frameworks']:
                yield framework

        for framework in self.state()['frameworks']:
            active_state = framework['active']
            if (active_state and active) or (not active_state and inactive):
                yield framework

class Slave(object):
    """Mesos Slave Model

    :param short_state: slave's entry from the master's state.json
    :type short_state: dict
    :param state: slave's state.json
    :type state: dict | None
    :param master: slave's master
    :type master: Master
    """

    def __init__(self, short_state, state, master):
        self._short_state = short_state
        self._state = state
        self._master = master

    def state(self):
        """Get the slave's state.json object.  Fetch it if it's not already
        an instance variable.

        :returns: This slave's state.json object
        :rtype: dict
        """
        return self._state

    def http_url(self):
        """
        :returns: The private HTTP URL of the slave.  Derived from the
                  `pid` property.
        :rtype: str
        """

        parsed_pid = parse_pid(self['pid'])
        return 'http://{}:{}'.format(parsed_pid[1], parsed_pid[2])

    def _framework_dicts(self):
        """Returns the framework dictionaries from the state.json dict

        :returns: frameworks
        :rtype: [dict]
        """

        return _merge(self.state(), ['frameworks', 'completed_frameworks'])

    def executor_dicts(self):
        """Returns the executor dictionaries from the state.json

        :returns: executors
        :rtype: [dict]
        """

        iters = [_merge(framework, ['executors', 'completed_executors'])
                 for framework in self._framework_dicts()]
        return itertools.chain(*iters)

    def fault_domain(self):
        """ Fault domain for a given task e.g.

        :returns: fault domain structure from state.json
        :rtype: dict | None
        """
        if 'domain' not in self._short_state:
            return None

        return {'domain': self._short_state['domain']}

    def __getitem__(self, name):
        """Support the slave[attr] syntax

        :param name: attribute to get
        :type name: str
        :returns: the value for this attribute in the underlying
                  slave dictionary
        :rtype: object
        """

        return self._short_state[name]


class Framework(object):
    """ Mesos Framework Model

    :param framework: framework properties
    :type framework: dict
    :param master: framework's master
    :type master: Master
    """

    def __init__(self, framework, master):
        self._framework = framework
        self._master = master
        self._tasks = {}  # id->Task map

    def task(self, task_id):
        """Returns a task by id

        :param task_id: the task's id
        :type task_id: str
        :returns: the task
        :rtype: Task
        """

        for task in _merge(self._framework, ['tasks', 'completed_tasks']):
            if task['id'] == task_id:
                return self._task_obj(task)
        return None

    def _task_obj(self, task):
        """Returns the Task object corresponding to the provided `task`
        dict.  Creates it if it doesn't exist already.

        :param task: task
        :type task: dict
        :returns: Task
        :rtype: Task
        """

        if task['id'] not in self._tasks:
            self._tasks[task['id']] = Task(task, self._master)
        return self._tasks[task['id']]

    def dict(self):
        return self._framework

    def __getitem__(self, name):
        """Support the framework[attr] syntax

        :param name: attribute to get
        :type name: str
        :returns: the value for this attribute in the underlying
                  framework dictionary
        :rtype: object
        """

        return self._framework[name]


class Task(object):
    """Mesos Task Model.

    :param task: task properties
    :type task: dict
    :param master: mesos master
    :type master: Master
    """

    def __init__(self, task, master):
        self._task = task
        self._master = master

        if 'slave_id' not in self._task or not master:
            return

        fd = self.fault_domain()
        if fd:
            self._task.update(fd)

    def dict(self):
        """
        :returns: dictionary representation of this Task
        :rtype: dict
        """

        return self._task

    def framework(self):
        """Returns this task's framework

        :returns: task's framework
        :rtype: Framework
        """

        return self._master.framework(self["framework_id"])

    def slave(self):
        """Returns the task's slave

        :returns: task's slave
        :rtype: Slave
        """

        return self._master.slave(self["slave_id"])

    def user(self):
        """Task owner

        :returns: task owner
        :rtype: str
        """

        return self.framework()['user']

    def executor(self):
        """ Returns this tasks' executor

        :returns: task's executor
        :rtype: dict
        """
        for executor in self.slave().executor_dicts():
            tasks = _merge(executor,
                           ['completed_tasks',
                            'tasks',
                            'queued_tasks'])
            if any(task['id'] == self['id'] for task in tasks):
                return executor
        return None

    def directory(self):
        """ Sandbox directory for this task

        :returns: path to task's sandbox
        :rtype: str
        """

        return self.executor()['directory']

    def fault_domain(self):
        """ Fault domain for a given task

        :returns: fault domain structure
        :rtype: dict | None
        """
        return self.slave().fault_domain()

    def __getitem__(self, name):
        """Support the task[attr] syntax

        :param name: attribute to get
        :type name: str
        :returns: the value for this attribute in the underlying
                  task dictionary
        :rtype: object
        """

        return self._task[name]

    def __contains__(self, name):
        """Supprt the `attr in task` syntax

        :param name: attribute to test
        :type name: str
        :returns: True if attribute is present in the underlying dict
        :rtype: bool
        """

        return name in self._task

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='Get info of task ID to run a nested container.')
  parser.add_argument('master_url', type=str, help='The url of the master to connect to.')
  parser.add_argument('task_id', type=str, help='The task ID to get info of.')
  args = parser.parse_args()

  master = Master(get_master_state(args.master_url))

  task_obj = master.task(args.task_id)
  agent_url = urllib.parse.urljoin(task_obj.slave().http_url(), 
      'api/v1')
  parent_id = master.get_container_id(args.task_id)

  print("Agent=%s" % agent_url)
  print("Parent container=%s" % parent_id)
