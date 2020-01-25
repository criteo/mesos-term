#!/bin/bash

./tests/resources/cleanup.sh
./tests/resources/setup.sh $1
./tests/resources/run_tests.sh $1
./tests/resources/cleanup.sh