#!/bin/bash

usage() {
    echo "Usage: setup.sh <flavor>"
    echo "Flavor can be 'standard', 'noadmin', 'noauth', 'taskadmins'"
}

if (( $# != 1 )); then
    echo "Illegal number of parameters"
    usage
    exit 1
fi

source bootstrap.sh

docker-compose -f docker-compose.yml -f tests/$1/docker-compose.yml build
docker-compose -f docker-compose.yml -f tests/$1/docker-compose.yml up -d zookeeper mesos-slave mesos-master marathon openldap
docker ps -a


echo "Wait for LDAP to be ready"
sleep 5

# import users in LDAP
docker run -it --network host -v $(pwd)/tests/resources/ldap/base.ldif:/base.ldif --rm mbentley/ldap-utils ldapadd -h 172.16.130.6 -D "cn=admin,dc=example,dc=com" -f /base.ldif -w password -x
docker-compose -f docker-compose.yml -f tests/$1/docker-compose.yml up -d mesos-term mesos-term-ui

echo "Wait for Marathon to be ready"
sleep 15 # Wait for Marathon to start

./tests/resources/create_apps.sh

echo "Wait for apps to be ready"
sleep 20 # Let the applications be scheduled

docker ps -a
