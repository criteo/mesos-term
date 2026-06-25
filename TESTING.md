Just look at how the github action CI is launched and reproduce it.

Things to be noticed:
- the openldap container is quite fragile to stop/restart. Better to `docker-compose rm` it when necessary

## Local dependency and build checks

Use Node.js 20. The Dockerfiles use `node:20-bookworm`, and the web build toolchain expects a modern Node runtime.

Install reproducible dependencies from both lockfiles:

```bash
npm ci
(cd web && npm ci)
```

Check the security audit for both Node projects, including production-only dependency trees:

```bash
npm audit
npm audit --omit=dev
(cd web && npm audit)
(cd web && npm audit --omit=dev)
```

Run the backend typecheck, compile, and unit tests:

```bash
npm run lint
npm run compile
MESOS_TERM_SESSION_SECRET=test-session \
MESOS_TERM_JWT_SECRET=test-jwt \
MESOS_TERM_MESOS_MASTER_URL=http://localhost:5050 \
MESOS_TERM_MESOS_STATE_CACHE_TIME=60 \
  npm test
```

Build the web UI and assemble the distribution folder:

```bash
(cd web && npm run build)
npm run dist
```

If Docker is available locally, also verify the container build:

```bash
docker build -f Dockerfile.build .
```
