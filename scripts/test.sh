#!/bin/bash

set -e
set -x

script_dir=`dirname "$0"`

npm run test

pushd $script_dir/tests

docker-compose up -d
./setup.sh

npm run test-int

./cleanup.sh
popd
