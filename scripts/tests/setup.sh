#!/bin/bash

docker-compose build
docker-compose up -d

# import users in LDAP
ldapadd -D "cn=admin,dc=example,dc=com" -f ldap/base.ldif -w password -x

sleep 8 # Wait for Marathon to start

./create_apps.sh
