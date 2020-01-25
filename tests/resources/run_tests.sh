#!/bin/bash

set +x
set +e

./node_modules/.bin/mocha --colors --require ts-node/register --forbid-only --recursive tests/$1/*.ts

if [ "$?" -ne "0" ];
then
  echo "Test failed"

  docker ps -a
  docker-compose logs mesos-term
  docker-compose logs mesos-term-no-auth
  docker-compose logs mesos-slave
  exit 1
fi

set -x
set -e
