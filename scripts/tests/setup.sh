#!/bin/bash

docker-compose build
docker-compose up -d

# import users in LDAP
ldapadd -D "cn=admin,dc=example,dc=com" -f ldap/base.ldif -w password -x

sleep 15 # Wait for Marathon to start

./create_apps.sh

sleep 5 # Let the applications be scheduled
