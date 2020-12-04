#!/bin/bash

set -e

usage() {
    echo "Usage: setup.sh <flavor>"
    echo "Flavor can be 'standard', 'noadmin', 'noauth', 'taskadmins'"
}

if (( $# != 1 )); then
    echo "Illegal number of parameters"
    usage
    exit 1
fi

set -x

docker-compose down -v
docker-compose -f docker-compose.yml -f ./tests/"$1"/docker-compose.override.yml up --force-recreate --build -d

sleep 30

docker run -it --network host -v "$(pwd)"/tests/resources/ldap/base.ldif:/base.ldif --rm mbentley/ldap-utils ldapadd -h 172.16.130.6 -D "cn=admin,dc=example,dc=com" -f /base.ldif -w password -x

./tests/resources/create_apps.sh

docker-compose exec mesos-term npm run test -- ./tests/"$1"/*.ts
