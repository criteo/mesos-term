FROM node:8.11.2-alpine

RUN apk add --no-cache python python-dev python3 python3-dev \
    linux-headers build-base bash git ca-certificates && \
    python3 -m ensurepip && \
    rm -r /usr/lib/python*/ensurepip && \
    pip3 install --upgrade pip setuptools && \
    if [ ! -e /usr/bin/pip ]; then ln -s pip3 /usr/bin/pip ; fi && \
    rm -r /root/.cache

WORKDIR /usr/app


ADD package.json package.json
ADD package-lock.json package-lock.json
RUN npm install --production

ADD scripts/entrypoint.sh /entrypoint.sh
ADD dist dist

RUN cd dist/python && pip3 install -r requirements.txt

# The URL to the Mesos master to retrieve the state from.
ENV MESOS_MASTER_URL=http://localhost:5050

# Put Mesos state in cache every 60 seconds.
ENV MESOS_STATE_CACHE_TIME=60

# Secrets to encrypt session cookie and authorization tokens
ENV SESSION_SECRET=unsecure-session-secret
ENV JWT_SECRET=unsecure-jwt-secret

CMD ["/entrypoint.sh"]
