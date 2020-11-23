#!/bin/bash

set -e
set -x

script_dir=`dirname "$0"`

# Clean dist if it exists
rm -rf $script_dir/../dist

npm run-script lint
npm run-script compile

pushd web
npm install
npm ci
npm run build
popd

npm run-script dist
