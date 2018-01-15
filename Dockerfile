FROM node:latest
MAINTAINER David Chobotsky <david.chobotsky@bizztreat.com>

WORKDIR /code

RUN git clone https://github.com/bizztreat/keboola-ex-plantyst.git . && npm install

ENTRYPOINT node /code/run.js --data=/data