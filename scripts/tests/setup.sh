#!/bin/bash

script_dir=`dirname "$0"`

pushd $script_dir

docker-compose build
docker-compose up -d

echo "Wait for LDAP to be ready"
sleep 3

# import users in LDAP
docker run -it --network host -v $(pwd)/ldap/base.ldif:/base.ldif --rm mbentley/ldap-utils ldapadd -h 172.16.130.6 -D "cn=admin,dc=example,dc=com" -f /base.ldif -w password -x

echo "Wait for Marathon to be ready"
sleep 15 # Wait for Marathon to start

./create_apps.sh

echo "Wait for apps to be ready"
sleep 20 # Let the applications be scheduled

popd
