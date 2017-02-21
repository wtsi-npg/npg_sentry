'use strict';

const configger = require('./configger');

const optionsList = [
  ['p','port=PORT'        ,'PORT to listen on'],
  ['m','mongourl=URI'     ,'URI to connect to mongodb'],
  ['c','configfile=PATH'  ,'location of config file'],
  ['' ,'loglevel=[error|warn|info|debug]','set logging level [default: error]'],
  ['s','ssl'              ,'run server on https'],
  ['' ,'sslcert=PATH'     ,'certificate for https server'],
  ['' ,'sslkey=PATH'      ,'private key for https server'],
  ['V','version'          ,'show version'],
  ['h','help'             ,'show this help'],
];

const SECRET_OPTIONS = ['sslpassphrase'];

const defaultOptions = {
  port: 8000,
  mongourl: 'mongodb://localhost:27017/test',
  loglevel: 'error',
};

function fromCommandLine() {
  return configger.fromCommandLine(optionsList);
}

function provide(generateConfigs, immutable) {
  let provideOpts = {
    generateConfigs,
    immutable,
    defaultOptions,
    ro_key: 'config_ro',
    adjustOptions: null
  };
  return configger.provide(provideOpts);
}

function logOpts() {
  return configger.logOpts(optionsList, defaultOptions, SECRET_OPTIONS);
}

module.exports = {
  fromCommandLine,
  provide,
  logOpts,
  tempFilePath: configger.tempFilePath,
};
