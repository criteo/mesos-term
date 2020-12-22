#!/bin/bash

set +e

if [[ "$1" -ne "" ]]; then
  SUITE_NAME="$1"
fi

forbid_only_flag=""
if [ "$CI" == "true" ];
then
    forbid_only_flag="--forbid-only"
fi

./node_modules/.bin/mocha --colors --require ts-node/register $forbid_only_flag --recursive tests/$SUITE_NAME/*.ts

# if [ "$?" -ne "0" ];
# then
#     echo "Test failed"

#     docker ps -a
#     docker-compose logs mesos-term
#     docker-compose logs mesos-slave
#     docker-compose logs mesos-master
#     exit 1
# fi
