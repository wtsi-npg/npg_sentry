'use strict';

const log4js = require('log4js');

const config = require('./config.js');

let loglevel = config.provide().get('loglevel');

log4js.configure({
  appenders: [
    {
      type: 'stderr',
    },
  ],
});

let logger = log4js.getLogger();

logger.setLevel(loglevel || 'error');

module.exports = logger;
module.exports.connectLogger = log4js.connectLogger;
