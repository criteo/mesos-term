#!/bin/bash

script_dir=`dirname "$0"`


if [ $(id -u) = 0 ]; then
  echo "Cannot run as root, defaulting to UID 1000"
  export USER_ID=1000
else
  export USER_ID=$(id -u)
fi

if [ $(id -g) = 0 ]; then
  echo "Cannot run as root, defaulting to GID 1000"
  export GROUP_ID=1000
else
  export GROUP_ID=$(id -g)
fi

pushd $script_dir

docker-compose up -d --build


echo "Wait for LDAP to be ready"
sleep 3

# import users in LDAP
docker run -it --network host -v $(pwd)/ldap/base.ldif:/base.ldif --rm mbentley/ldap-utils ldapadd -h 172.16.130.6 -D "cn=admin,dc=example,dc=com" -f /base.ldif -w password -x


echo "Wait for Marathon to be ready"
sleep 15 # Wait for Marathon to start

./create_apps.sh

echo "Wait for apps to be ready"
sleep 20 # Let the applications be scheduled

popd
