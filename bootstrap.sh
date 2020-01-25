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
