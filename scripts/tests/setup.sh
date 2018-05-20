#!/bin/bash

docker-compose build
docker-compose up -d

# import users in LDAP
ldapadd -D "cn=admin,dc=example,dc=com" -f ldap/base.ldif -w password -x

echo "Wait for Marathon to be ready"
sleep 15 # Wait for Marathon to start

./create_apps.sh

echo "Wait for apps to be ready"
sleep 10 # Let the applications be scheduled
