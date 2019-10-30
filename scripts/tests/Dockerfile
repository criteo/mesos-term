FROM owncloudci/nodejs:11.x

COPY google-chrome.list /etc/apt/sources.list.d/google-chrome.list

RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN apt-get update
RUN apt-get -y install libgif-dev google-chrome-stable xvfb

ENV MESOS_MASTER_URL=http://172.16.130.3:5050

WORKDIR /in_and_out
CMD ["xvfb-run" , "npm", "run", "test-int"]
