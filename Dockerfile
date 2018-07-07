FROM ubuntu:18.04

ENV _CACHE=1
RUN apt-get update &&\
    apt-get install -y curl gpg &&\
    curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - &&\
    echo 'deb https://deb.nodesource.com/node_10.x bionic main' >/etc/apt/sources.list.d/nodesource.list &&\
    echo 'deb-src https://deb.nodesource.com/node_10.x bionic main' >>/etc/apt/sources.list.d/nodesource.list &&\
    apt-get update &&\
    apt-get purge -y gpg
RUN apt-get install -y make nodejs jq

WORKDIR /app
ADD . .
RUN cd ./viewer && npm install && npm run build && cd .. &&\
    cd ./database && npm install && cd .. &&\
    cd ./segmentator && npm install ../digdown && cd ..

VOLUME /app/jobs
ENV DIGDOWN_RESOURCES_ROOT=/app/jobs
EXPOSE 8080
CMD ["/app/viewer/index.js"]
