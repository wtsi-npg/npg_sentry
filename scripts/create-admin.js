#!/usr/bin/env node
'use strict';

const ACL = require('acl');
const MongoClient = require('mongodb').MongoClient;

const configger = require('../lib/configger');

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
  role: 'administrator'
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
let p_db = MongoClient.connect(options.get('mongourl'))

p_db.then(function(db) {
  acl = new ACL(new ACL.mongodbBackend(db, 'sentry_acl'));
  if (options.get('type') === 'user') {
    return acl.addUserRoles(options.get('username'), options.get('role'));
  } else if (options.get('type') === 'role') {
    return acl.allow(options.get('role'), '/admin', options.get('permission'));
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
