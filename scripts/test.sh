#!/bin/bash

set -e
set -x

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

npm run test-int

docker ps -a
docker-compose logs mesos-term

./cleanup.sh
popd
