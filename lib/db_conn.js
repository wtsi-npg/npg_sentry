'use strict';

const MongoClient = require('mongodb').MongoClient;

const config = require('./config.js');
const logger = require('./logger.js');

class DbError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DbError';
  }
}

let p_db = MongoClient.connect(config.provide().get('mongourl'));

p_db.then(function() {
  logger.debug('Successfully connected to database');
});

p_db.catch(function(reason) {
  logger.error(reason);
  throw reason;
});

module.exports = {
  DbError,
  p_db,
};
