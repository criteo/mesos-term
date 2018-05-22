# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Credits for this code goes to https://github.com/dcos/dcos-cli. Please
# note, it might have been slightly edited.

"""
Exception Classes
"""

class MesosException(Exception):
    """Exceptions class to handle all mesos exceptions."""
    pass


class HTTPException(MesosException):
    """
    A wrapper around Response objects for HTTP error codes.

    :param response: requests Response object
    :type response: Response
    """
    def __init__(self, response):
        super(HTTPException, self).__init__()
        self.response = response

    def status(self):
        """
        Return status code from response.

        :return: status code
        :rtype: int
        """
        return self.response.status_code

    def __str__(self):
        return "HTTP {status_code}: {text}".format(
            status_code=self.response.status_code,
            text=self.response.text)
