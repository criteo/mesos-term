#!/bin/bash

script_dir=$(dirname "$0")

for ressource_name in app pod; do
  for ressource in "$script_dir"/apps/"$ressource_name"*.json; do
    curl \
      -XPOST \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      -d @"$ressource" \
      http://localhost:8080/v2/${ressource_name}s/
  done
done
