#!/bin/bash

set -e
set -x

npm run-script lint
npm run-script compile
npm run-script dist
