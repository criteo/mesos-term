This document describes how to test mesos-term.

Integration testing
===================

```
cd scripts/tests/
docker-compose up -d
cd ../..
docker build -t mesos-term/ci  scripts/tests/
docker run -v $(pwd):/in_and_out --network=host  -ti mesos-term/ci  /bin/bash
```

And then type: `xvfb-run npm run test-int`
