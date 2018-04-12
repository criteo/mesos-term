#!/bin/bash

docker build -t clems4ever/mesos-term:$TRAVIS_TAG .

if [ "$TRAVIS_BRANCH" == "master" ]; then
  docker push clems4ever/mesos-term:$TRAVIS_TAG
fi
