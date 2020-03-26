FROM ubuntu:18.04
MAINTAINER Grisha Hushchyn <gh13@sanger.ac.uk>


ENV NODE_VERSION=10.16.3 \
    MONGODB_VERSION=3.6.14 \
    APT_DEPENDENCIES="wget git xz-utils"

RUN apt-get update -qq \
  && apt-get install -qq $APT_DEPENDENCIES \
\
# Get Node.js
  && wget -q "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
  && tar xJf "node-v${NODE_VERSION}-linux-x64.tar.xz" -C /usr/local --strip-components=1 \
  && rm "node-v${NODE_VERSION}-linux-x64.tar.xz" \
  && npm update -g npm

RUN git clone https://github.com/wtsi-npg/npg_sentry \
  && cd npg_sentry \
  # Make sure that Bower can execute it's install
  && echo '{ "allow_root": true }' >> /root/.bowerrc \
  && npm --unsafe-perm true install

# Remove build-time dependencies
RUN apt-get remove -qq $APT_DEPENDENCIES \
  && apt-get autoremove --purge -qq \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /npg_sentry

ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /wait-for-it.sh

RUN chmod 0555 /wait-for-it.sh

# RUN npm start -- --configfile=/config.json

EXPOSE 9000
CMD [ "/bin/bash" ]
