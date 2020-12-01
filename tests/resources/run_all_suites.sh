#!/bin/bash

set -e

for suite in standard noauth noadmin taskadmins; do
  ./tests/resources/run_suite.sh $suite
done
