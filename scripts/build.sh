#!/bin/bash

set -e
set -x

script_dir=`dirname "$0"`

npm run-script lint
rm -r $script_dir/../dist
npm run-script compile
npm run-script dist
