#!/bin/bash

export ADMINS=admins
export LDAP_URL=ldap://localhost
export LDAP_BASE_DN=dc=example,dc=com
export LDAP_USER=cn=admin,dc=example,dc=com
export LDAP_PASSWORD=password
export MESOS_MASTER_URL=http://localhost:5050
export SESSION_SECRET=abcd
export MESOS_TASK_EXEC_DIR=3rdparties/mesos-task-exec/src
