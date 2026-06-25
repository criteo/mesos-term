#!/bin/bash

set -e

dump_compose_logs() {
  docker compose logs --no-color mesos-slave mesos-master marathon mesos-term
}

require_compose_service_running() {
  local service="$1"
  local container_id

  container_id="$(docker compose ps -q "$service")"
  if [[ -z "$container_id" || "$(docker inspect -f '{{.State.Running}}' "$container_id")" != "true" ]]; then
    echo "Service '$service' is not running."
    docker ps -a || true
    dump_compose_logs || true
    exit 1
  fi
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local attempts="${3:-60}"

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$url" >/dev/null; then
      return 0
    fi
    sleep 1
  done

  echo "$name did not become ready at $url."
  docker ps -a || true
  dump_compose_logs || true
  exit 1
}

# just in case showing docker status
docker ps -a | head -n10
require_compose_service_running mesos-slave
wait_for_http "Mesos master" "http://localhost:5050/master/state.json"

echo "TODO: Wait for LDAP to be ready"
sleep 5

# import users in LDAP. This operation is not idempotent and will fail if users already exists
# to reset: sudo docker compose stop openldap; sudo docker compose rm openldap; sudo docker compose up -d openldap
docker run -t --network host -v $(pwd)/tests/resources/ldap/base.ldif:/base.ldif --rm mbentley/ldap-utils ldapadd -H "ldap://172.16.130.6" -D "cn=admin,dc=example,dc=com" -f /base.ldif -w password -x

echo "TODO: Wait for Marathon to be ready"
wait_for_http "Marathon" "http://localhost:8080/v2/info"

./tests/resources/create_apps.sh

echo "TODO: Wait for apps to be ready"
sleep 20 # Let the applications be scheduled
