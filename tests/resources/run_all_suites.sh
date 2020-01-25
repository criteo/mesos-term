#!/bin/bash

./tests/resources/run_suite.sh standard
./tests/resources/run_suite.sh noauth
./tests/resources/run_suite.sh noadmin
./tests/resources/run_suite.sh taskadmins