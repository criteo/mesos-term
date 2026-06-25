#!/bin/bash

script_dir=`dirname "$0"`

pushd $script_dir

if docker compose version >/dev/null 2>&1; then
  docker compose down -v
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose down -v
else
  echo "Docker Compose is required. Install Docker Compose v2 ('docker compose') or legacy docker-compose." >&2
  exit 1
fi

popd
