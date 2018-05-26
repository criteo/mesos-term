#!/bin/bash

set -x
set -e

script_dir=`dirname "$0"`

export SESSION_SECRET=abcd
export JWT_SECRET=abcd
export MESOS_STATE_CACHE_TIME=60
export MESOS_MASTER_URL=http://localhost:5050

# npm run test

pushd $script_dir/tests

docker-compose build
docker-compose up -d
./setup.sh

set +x
set +e

npm run test-int

if [ "$?" -ne "0" ];
then
  echo "Test failed"
  docker ps -a
  docker-compose logs mesos-term
  docker-compose logs mesos-term-no-auth
  docker-compose logs marathon
  docker-compose logs mesos-slave
  exit 1
fi

set -x
set -e

./cleanup.sh
popd
