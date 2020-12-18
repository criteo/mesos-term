#!/bin/bash

echo "TODO: Wait for LDAP to be ready"
sleep 5

# import users in LDAP
docker run -it --network host -v $(pwd)/tests/resources/ldap/base.ldif:/base.ldif --rm mbentley/ldap-utils ldapadd -h 172.16.130.6 -D "cn=admin,dc=example,dc=com" -f /base.ldif -w password -x

echo "TODO: Wait for Marathon to be ready"
sleep 15 # Wait for Marathon to start

./tests/resources/create_apps.sh

echo "TODO: Wait for apps to be ready"
sleep 20 # Let the applications be scheduled

docker ps -a
