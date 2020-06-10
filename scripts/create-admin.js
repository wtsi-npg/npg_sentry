#!/usr/bin/env node
'use strict';

const ACL = require('acl');
const MongoClient = require('mongodb').MongoClient;

const configger    = require('../lib/configger');
const sentry_utils = require('../lib/sentry_utils');
const constants    = require('../lib/constants');

const optionsList = [
  ['m','mongourl=STRING'  ,'url to connect to mongodb. required.'],
  ['t','type=STRING'      ,'type of operation to perform. ' +
                           '"user" -> add username to role. ' +
                           '"role" -> create role with permissions'],
  ['u','username=STRING'  ,'add role to this user.'],
  ['r','role=STRING'      ,'role to operate upon. default: administrator'],
  ['p','permission=STRING','permission to add to this role'],
  ['h','help'             ,'show this help'],
];

const defaultOptions = {
  role: 'administrator',
  mongoopt: {
    db: {
      numberofRetries: 5
    },
    server: {
      auto_reconnect: true,
      poolSize:       40,
      socketOptions:  {
        connectTimeoutMS: 5000
      }
    },
    replSet: {},
    mongos:  {}
  }
};

function generateConfigs() {
  return configger.fromCommandLine(optionsList);
}

let provideOpts = {
  generateConfigs,
  defaultOptions,
  immutable: false,
  ro_key: null,
  adjustOptions: null
};
let options = configger.provide(provideOpts);

function isValidInvocation() {
  let type = options.get('type');
  if (type === 'user') {
    return !options.get('permission') && options.get('role') && options.get('username');
  } else if (type === 'role') {
    return !options.get('username') && options.get('role') && options.get('permission');
  }
  return false;
}

if (!isValidInvocation()) {
  console.error('Invalid combination of options passed. Exiting...');
  process.exit(1);
}

let acl;
let p_db = MongoClient.connect(options.get('mongourl'), options.get('mongoopt'))

p_db.then(function(db) {
  acl = new ACL(new ACL.mongodbBackend(db, 'sentry_acl'));
  if (options.get('type') === 'user') {
    return acl.addUserRoles(options.get('username'), options.get('role'));
  } else if (options.get('type') === 'role') {
    try {
      let resource = sentry_utils.formatResourceNameForACL(constants.ADMIN_RESOURCE);
      return acl.allow(options.get('role'), resource, options.get('permission'));
    } catch (e) {
      return Promise.reject(e);
    }
  } else {
    return Promise.reject(new Error('Unknown operation type.'));
  }
})
  .catch(function(err) {
    throw err;
  })
  .then(function() {
    p_db.then(function(db) {
      db.close();
    });
  });
