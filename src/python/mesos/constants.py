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

MESOS_LOG_LEVEL_ENV = 'MESOS_LOG_LEVEL'
"""Name of the environment variable for the Mesos log level"""

MESOS_DEBUG_ENV = 'MESOS_DEBUG'
"""Name of the environment variable to enable Mesos debug messages"""

PATH_ENV = 'PATH'
"""Name of the environment variable pointing to the executable directories."""

VALID_LOG_LEVEL_VALUES = ['debug', 'info', 'warning', 'error', 'critical']
"""List of all the supported log level values for the CLIs"""
