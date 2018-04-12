#!/bin/bash

docker build -t clems4ever/mesos-term .

if [ "$TRAVIS_TAG" == "" ]; then
  exit 0
fi

docker tag clems4ever/mesos-term clems4ever/mesos-term:$TRAVIS_TAG
docker push clems4ever/mesos-term:$TRAVIS_TAG
