# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
#         "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

# Credits for this code goes to https://github.com/dcos/dcos-cli. Please
# note, it might have been slightly edited.

import requests

from requests.auth import AuthBase

from six.moves.urllib.parse import urlparse

from mesos import util
from mesos.errors import (MesosAuthenticationException,
                          MesosAuthorizationException, MesosBadRequest,
                          MesosConnectionError, MesosException,
                          MesosHTTPException, MesosUnprocessableException)


logger = util.get_logger(__name__)

DEFAULT_TIMEOUT = 5


def _default_is_success(status_code):
    """Returns true if the success status is between [200, 300).

    :param response_status: the http response status
    :type response_status: int
    :returns: True for success status; False otherwise
    :rtype: bool
    """

    return 200 <= status_code < 300

@util.duration
def _request(method,
             url,
             is_success=_default_is_success,
             timeout=DEFAULT_TIMEOUT,
             auth=None,
             verify=None,
             toml_config=None,
             **kwargs):
    """Sends an HTTP request.

    :param method: method for the new Request object
    :type method: str
    :param url: URL for the new Request object
    :type url: str
    :param is_success: Defines successful status codes for the request
    :type is_success: Function from int to bool
    :param timeout: request timeout
    :type timeout: int
    :param auth: authentication
    :type auth: AuthBase
    :param verify: whether to verify SSL certs or path to cert(s)
    :type verify: bool | str
    :param toml_config: cluster config to use
    :type toml_config: Toml
    :param kwargs: Additional arguments to requests.request
        (see http://docs.python-requests.org/en/latest/api/#requests.request)
    :type kwargs: dict
    :rtype: Response
    """

    if 'headers' not in kwargs:
        kwargs['headers'] = {'Accept': 'application/json'}

    verify = False

    # Silence 'Unverified HTTPS request' and 'SecurityWarning' for bad certs
    if verify is not None:
        silence_requests_warnings()

    logger.info(
        'Sending HTTP [%r] to [%r]: %r',
        method,
        url,
        kwargs.get('headers'))

    try:
        response = requests.request(
            method=method,
            url=url,
            timeout=timeout,
            auth=auth,
            verify=verify,
            **kwargs)
    except requests.exceptions.SSLError as e:
        logger.exception("HTTP SSL Error")
        msg = ("An SSL error occurred.")
        if description is not None:
            msg += "\n<value>: {}".format(description)
        raise MesosException(msg)
    except requests.exceptions.ConnectionError as e:
        logger.exception("HTTP Connection Error")
        raise MesosConnectionError(url)
    except requests.exceptions.Timeout as e:
        logger.exception("HTTP Timeout")
        raise MesosException('Request to URL [{0}] timed out.'.format(url))
    except requests.exceptions.RequestException as e:
        logger.exception("HTTP Exception")
        raise MesosException('HTTP Exception: {}'.format(e))

    logger.info('Received HTTP response [%r]: %r',
                response.status_code,
                response.headers)

    return response


def request(method,
            url,
            is_success=_default_is_success,
            timeout=DEFAULT_TIMEOUT,
            verify=None,
            toml_config=None,
            **kwargs):
    """Sends an HTTP request. If the server responds with a 401, ask the
    user for their credentials, and try request again (up to 3 times).

    :param method: method for the new Request object
    :type method: str
    :param url: URL for the new Request object
    :type url: str
    :param is_success: Defines successful status codes for the request
    :type is_success: Function from int to bool
    :param timeout: request timeout
    :type timeout: int
    :param verify: whether to verify SSL certs or path to cert(s)
    :type verify: bool | str
    :param toml_config: cluster config to use
    :type toml_config: Toml
    :param kwargs: Additional arguments to requests.request
        (see http://docs.python-requests.org/en/latest/api/#requests.request)
    :type kwargs: dict
    :rtype: Response
    """

    auth = None

    response = _request(method, url, is_success, timeout,
                        auth=auth, verify=verify, toml_config=toml_config,
                        **kwargs)

    if is_success(response.status_code):
        return response
    elif response.status_code == 401:
        raise MesosAuthenticationException(response)
    elif response.status_code == 422:
        raise MesosUnprocessableException(response)
    elif response.status_code == 403:
        raise MesosAuthorizationException(response)
    elif response.status_code == 400:
        raise MesosBadRequest(response)
    else:
        raise MesosHTTPException(response)


def head(url, **kwargs):
    """Sends a HEAD request.

    :param url: URL for the new Request object
    :type url: str
    :param kwargs: Additional arguments to requests.request
                   (see py:func:`request`)
    :type kwargs: dict
    :rtype: Response
    """

    return request('head', url, **kwargs)


def get(url, **kwargs):
    """Sends a GET request.

    :param url: URL for the new Request object
    :type url: str
    :param kwargs: Additional arguments to requests.request
                   (see py:func:`request`)
    :type kwargs: dict
    :rtype: Response
    """

    return request('get', url, **kwargs)


def post(url, data=None, json=None, **kwargs):
    """Sends a POST request.

    :param url: URL for the new Request object
    :type url: str
    :param data: Request body
    :type data: dict, bytes, or file-like object
    :param json: JSON request body
    :type data: dict
    :param kwargs: Additional arguments to requests.request
                   (see py:func:`request`)
    :type kwargs: dict
    :rtype: Response
    """

    return request('post', url, data=data, json=json, **kwargs)


def put(url, data=None, **kwargs):
    """Sends a PUT request.

    :param url: URL for the new Request object
    :type url: str
    :param data: Request body
    :type data: dict, bytes, or file-like object
    :param kwargs: Additional arguments to requests.request
                   (see py:func:`request`)
    :type kwargs: dict
    :rtype: Response
    """

    return request('put', url, data=data, **kwargs)


def patch(url, data=None, **kwargs):
    """Sends a PATCH request.

    :param url: URL for the new Request object
    :type url: str
    :param data: Request body
    :type data: dict, bytes, or file-like object
    :param kwargs: Additional arguments to requests.request
                   (see py:func:`request`)
    :type kwargs: dict
    :rtype: Response
    """

    return request('patch', url, data=data, **kwargs)


def delete(url, **kwargs):
    """Sends a DELETE request.

    :param url: URL for the new Request object
    :type url: str
    :param kwargs: Additional arguments to requests.request
                   (see py:func:`request`)
    :type kwargs: dict
    :rtype: Response
    """

    return request('delete', url, **kwargs)


def silence_requests_warnings():
    """Silence warnings from requests.packages.urllib3."""
    requests.packages.urllib3.disable_warnings()

