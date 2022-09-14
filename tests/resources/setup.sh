#!/bin/bash

set -e

# just in case showing docker status
docker ps -a | head -n10

echo "TODO: Wait for LDAP to be ready"
sleep 5

# import users in LDAP. This operation is not idempotent and will fail if users already exists
# to reset: sudo docker-compose stop openldap; sudo docker-compose rm openldap; sudo docker-compose up -d openldap
docker run -t --network host -v $(pwd)/tests/resources/ldap/base.ldif:/base.ldif --rm mbentley/ldap-utils ldapadd -H "ldap://172.16.130.6" -D "cn=admin,dc=example,dc=com" -f /base.ldif -w password -x

echo "TODO: Wait for Marathon to be ready"
sleep 15 # Wait for Marathon to start

./tests/resources/create_apps.sh

echo "TODO: Wait for apps to be ready"
sleep 20 # Let the applications be scheduled

