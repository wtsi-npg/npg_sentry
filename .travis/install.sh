#!/bin/bash

set -e -x

pushd /tmp

### mongodb
#if [ ! "$(ls -A /tmp/mongodb)" ]; then
if [[ $(mongo --version) != *$MONGODB_VERSION* ]]; then
    rm -rf /tmp/mongodb
    mkdir -p /tmp/mongodb
    wget "http://fastdl.mongodb.org/linux/mongodb-linux-x86_64-${MONGODB_VERSION}.tgz"
    tar xvf "mongodb-linux-x86_64-${MONGODB_VERSION}.tgz" -C /tmp/mongodb --strip-components 1
fi

### phantomjs

# caching and mirror instructions taken from
# https://github.com/Medium/phantomjs/tree/750d5f32e1586fe0b34c782dd87f60cbb21e6441#continuous-integration
if [ $(phantomjs --version) != $PHANTOMJS_VERSION ]; then
    rm -rf /tmp/phantomjs
    mkdir -p /tmp/phantomjs
    wget https://github.com/Medium/phantomjs/releases/download/v$PHANTOMJS_VERSION/phantomjs-$PHANTOMJS_VERSION-linux-x86_64.tar.bz2 -O /tmp/phantomjs-$PHANTOMJS_VERSION-linux-x86_64.tar.bz2
    tar xvf "/tmp/phantomjs-$PHANTOMJS_VERSION-linux-x86_64.tar.bz2" -C /tmp/phantomjs --strip-components 1
fi

#npm i -g node-qunit-phantomjs

popd
