#!/bin/bash

docker-compose build
docker-compose up -d

# import users in LDAP
ldapadd -D "cn=admin,dc=example,dc=com" -f ldap/base.ldif -w password -x

./mesos/create_app.sh mesos/apps/app1.json
./mesos/create_app.sh mesos/apps/app2.json
./mesos/create_app.sh mesos/apps/app3.json
./mesos/create_app.sh mesos/apps/app4.json
./mesos/create_app.sh mesos/apps/app5.json
