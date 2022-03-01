FROM ubuntu:xenial as worker

RUN apt-get update && apt-get --no-install-recommends install -y \
    apt-transport-https \
    curl \
    git
RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN echo "deb https://deb.nodesource.com/node_8.x xenial main" >> /etc/apt/sources.list.d/nodejs.list
RUN echo "deb-src https://deb.nodesource.com/node_8.x xenial main" >> /etc/apt/sources.list.d/nodejs.list

RUN apt-get update && apt-get --no-install-recommends install -y nodejs

ADD . /opt/webgl-operate

WORKDIR /opt/webgl-operate
RUN npm install
RUN npm run doc
RUN npm run website

FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=worker /opt/webgl-operate/build /usr/share/nginx/html
