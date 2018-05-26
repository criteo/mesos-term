#!/bin/bash

script_dir=`dirname "$0"`

pushd $script_dir

docker-compose down

popd
