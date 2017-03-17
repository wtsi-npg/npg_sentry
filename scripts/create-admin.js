'use strict';

const ACL = require('acl');
const MongoClient = require('mongodb').MongoClient;

const configger = require('../lib/configger');

const optionsList = [
  ['m','mongourl=STRING'  ,'url to connect to mongodb. required.'],
  ['u','username=STRING'  ,'add role to this user. required.'],
  ['r','role=STRING'      ,'role to add to this user. default: administrator'],
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

let acl;
let p_db = MongoClient.connect(options.get('mongourl'))

p_db.then(function(db) {
  acl = new ACL(new ACL.mongodbBackend(db, 'sentry_acl'));
  return acl.addUserRoles(options.get('username'), options.get('role'));
})
  .catch(function(err) {
    throw err;
  })
  .then(function() {
    p_db.then(function(db) {
      db.close();
    });
  });
