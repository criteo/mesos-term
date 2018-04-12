FROM node:8.9.1

RUN apt-get update
RUN apt-get install -y python3 python3-pip

WORKDIR /usr/app

ADD package.json package.json
ADD package-lock.json package-lock.json
RUN npm install

ADD scripts/entrypoint.sh /entrypoint.sh
ADD src src

ADD https://github.com/clems4ever/mesos-task-exec/archive/v0.4.1.tar.gz .
RUN tar xzvf v0.4.1.tar.gz -C /tmp && cd /tmp/mesos-task-exec-0.4.1 && pip3 install -r requirements.yml

ENV MESOS_TASK_EXEC_DIR=/tmp/mesos-task-exec-0.4.1/src
ENV MESOS_MASTER_URL=http://localhost:5050

CMD ["/entrypoint.sh"]
