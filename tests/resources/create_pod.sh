#!/bin/bash

curl -XPOST -H 'Content-Type: application/json' -H 'Accept: application/json' -d @$1 http://localhost:8080/v2/pods/
