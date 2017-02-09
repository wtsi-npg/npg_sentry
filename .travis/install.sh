#!/bin/bash

set -e -x

pushd /tmp

wget "http://fastdl.mongodb.org/linux/mongodb-linux-x86_64-${MONGODB_VERSION}.tgz"
tar xfz "mongodb-linux-x86_64-${MONGODB_VERSION}.tgz"

mkdir -p /tmp/usr/bin

ln -s "/tmp/mongodb-linux-x86_64-${MONGODB_VERSION}/bin/mongo" /tmp/usr/bin/mongo
ln -s "/tmp/mongodb-linux-x86_64-${MONGODB_VERSION}/bin/mongod" /tmp/usr/bin/mongod
ln -s "/tmp/mongodb-linux-x86_64-${MONGODB_VERSION}/bin/mongoimport" /tmp/usr/bin/mongoimport

npm i -g node-qunit-phantomjs

popd
