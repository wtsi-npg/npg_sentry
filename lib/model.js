'use strict';

/**
 * Methods for creating, manipulating, storing and retrieving data.
 * @module lib/model
 * @copyright 2017 Genome Research Ltd
 * @author Andrew Nowak
 */

// This module uses 'p_' prefix to signify promises
// e.g., p_db is a promise that, when fulfilled,
// provides the db object.

/**
 * @external assert
 * @see {@link https://nodejs.org/docs/latest-v6.x/api/assert.html|assert}
 */
const assert      = require('assert');
const randomBytes = require('crypto').randomBytes;

/**
 * @external moment
 * @see {@link https://momentjs.com/docs/|moment}
 */
const moment      = require('moment');

/**
 * @external mongodb
 * @see {@link http://mongodb.github.io/node-mongodb-native/2.2/api/|mongodb}
 */
const MongoClient = require('mongodb').MongoClient;

const constants = require('./constants.js');
const config    = require('./config.js');
const dbConn    = require('./db_conn.js');
const logger    = require('./logger.js');

const UNEXPECTED_NUM_DOCS  = constants.UNEXPECTED_NUM_DOCS;
const USER_NOT_TOKEN_OWNER = constants.USER_NOT_TOKEN_OWNER;

/**
 * Returns a function which gets a collection from the database. Should be
 * passed as a parameter to a promise chain
 * @example new Promise(getDB).then(getCollection('my_collection'));
 * @param {String} collName - name of desired collection
 * @return Function
 */
function getCollection(collName) {
  return function(db) {
    logger.debug('Searching for collection ' + collName);
    return new Promise(function(resolve, reject) {
      db.collection(collName, function(err, collection) {
        if (err) {
          reject(err);
        } else {
          logger.debug('Found collection ' + collName);
          resolve(collection);
        }
      });
    });
  };
}

/**
 * Used to validate that a value is defined, and optionally is of expected type.
 * @private
 * @param {String} scope - used to identify where the value is from in errors
 * @param {String} name - used to identify the value in errors
 * @param {*} value - value which should be defined
 * @param {*} [type] - expected type of value
 * @throws external:assert.AssertionError
 */
function _validate(scope, name, value, type) {
  assert(value, `${scope}: ${name} is not defined`);
  if ( type ) {
    assert(typeof value === type, `${scope}: ${name} must be a ${type}`);
  }
}

/**
 * Validates that a value is defined, is not an empty string, and optionally
 * is of the expected type.
 * @private
 * @param {String} scope - used to identify where the value is from in errors
 * @param {String} name - used to identify the value in errors
 * @param {*} value - value which should be defined
 * @param {*} [type] - expected type of value
 * @throws external:assert.AssertionError
 */
function _validateNoEmptyString(scope, name, value, type) {
  _validate(scope, name, value, type);
  assert(
    value.trim() !== '',
    `${scope}: ${name} cannot be empty string`
  );
}

/**
 * Promise which takes the value of a mongodb.MongoClient connection when
 * resolved.
 *
 * @type Promise
 * @TODO probably these variables should not be in the whole module scope
 */
let p_db = MongoClient.connect(config.provide().get('mongourl'));

p_db.then(function() {
  logger.debug('Successfully connected to database');
});

p_db.catch(function(reason) {
  logger.error(reason);
  throw reason;
});

/**
 * Promise which takes the value of the 'tokens' mongodb.Collection when
 * resolved.
 *
 * @type Promise
 * @TODO probably these variables should not be in the whole module scope
 */
let p_collection = p_db.then(getCollection(constants.COLLECTION_TOKENS));

p_collection.catch(function(reason) {
  logger.error(reason);
  throw reason;
});

/**
 * Generates a new 32 character, base64 string.
 *
 * @return Promise
 */
function generateTokenPromise() {
  return new Promise(function(resolve, reject) {
    // TODO refactor to prevent collisions with tokens in db
    // 24 bytes will generate a 32 character base64 string
    logger.debug('Generating new token');
    randomBytes(24, function(err, buf) {
      if (err) {
        reject(err);
      }
      // http://stackoverflow.com/questions/8838624/node-js-send-email-on-
      // registration/8842959#8842959
      resolve(buf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-'));
    });
  });
}

/**
 * Finds all matching tokens in {@link p_collection}. May return zero or
 * multiple matches.
 * @param {String} token - token string to find.
 * @return Promise
 */
function findMatchingTokens(token) {
  return p_collection.then(function(collection) {
    logger.debug('Searching database for token: ' + token);
    let query = {token: token};
    // This will automatically reject if collection.find() throws an error.
    // No need to manually catch and reject.
    return collection.find(query);
  });
}

/**
 * Returns a function which will find the next document in the cursor.
 * Should be called as a parameter to a promise chain.
 * @example cursorHasExactlyOneDoc(p_cursor)
 *   .then(getDocument(p_cursor))
 *   .then(function(doc) {...
 * @param {Promise} p_cursor - promise which takes value of a mongodb.Cursor
 *   when fulfilled
 * @return Function
 */
function getDocument(p_cursor) {
  return function() {
    return p_cursor.then(function(cursor) {
      logger.debug('Retrieving next document from cursor');
      return cursor.next();
    });
  };
}

/**
 * Checks that a cursor only contains one result. Returned promise rejects if
 * there was no results or more than one.
 *
 * @param {Promise} p_cursor - takes value of a mongodb.Cursor when fulfilled.
 * @return {Promise} Fulfills if only one token exists in the db, otherwise
 *   rejects with a {@link DbError}.
 */
function cursorHasExactlyOneDoc(p_cursor) {
  return p_cursor.then(function(cursor) {
    logger.debug('Checking db only found one result');
    return cursor.count();
  })
  .then(function(count) {
    return count === 1 ? Promise.resolve()
                       : Promise.reject(new dbConn.DbError(UNEXPECTED_NUM_DOCS));
  });
}

/**
 * Creates an object to be inserted into the database, containing the token
 * and assorted metadata.
 * @private
 * @param {String} token
 * @param {String} user
 * @param {String} justification - a manually entered reason for this
 *   token's generation
 * @return {Object}
 */
function _buildToken(token, user, justification) {
  let now = moment();
  let validDuration = moment.duration(
    constants.TOKEN_DURATION, constants.TOKEN_DURATION_UNIT
  );
  return {
    token: token,
    status: constants.TOKEN_STATUS_VALID,
    issueTime: now.format(),
    creationReason: justification,
    user: user,
    expiryTime: now.clone().add(validDuration).format()
  };
}

/**
 * Creates a token, inserts it into the database.
 * @alias module:lib/model.createToken
 * @param {String} user - the user who the token belongs to.
 * @param {String} justification - the reason for the token's creation.
 * @returns {Promise} Promise is either fulfilled with an Object containing the
 *   token and its metadata, or rejected with any error that occurred.
 */
let createToken = function createToken(user, justification) {
  // TODO what if user is unknown?
  try {
    let fName = 'createToken';
    _validateNoEmptyString(fName, 'user', user, 'string');
    _validateNoEmptyString(fName, 'justification', justification, 'string');
  } catch ( e ) {
    return Promise.reject(e);
  }

  return generateTokenPromise().then(function(token) {
    let doc = _buildToken(token, user, justification);
    return p_collection.then(function(collection) {
      logger.debug('Inserting new token into database');
      return collection.insertOne(doc)
        .then(function() {
          return Promise.resolve(doc);
        });
    });
  })
  .catch(function(reason) {
    logger.error(reason);
    return Promise.reject(reason);
  });
};

/**
 * Updates a token in the database.
 * @private
 * @param {Object} doc
 * @param {String} doc.token - the token which is to be updated.
 * @param {Object} update - a MongoDB update document to be applied upon doc.
 *   See: {@link https://docs.mongodb.com/manual/tutorial/update-documents/}
 * @return Promise Fulfills on completion with the value of the new document.
 */
function _updateToken(doc, update) {
  return p_collection.then(function(collection) {
    logger.debug('Updating token ' + doc.token +
                 '; update obj ' + JSON.stringify(update));
    return collection.updateOne({token: doc.token}, update).then(function() {
      doc.status = constants.TOKEN_STATUS_REVOKED;
      return doc;
    });
  });
}

/**
 * Revokes a token in the database.
 * @alias module:lib/model.revokeToken
 * @param {String} user
 * @param {String} token
 * @param {String} justification
 * @return {Promise} Fulfills on completion with the document of the revoked
 *   token.
 */
let revokeToken = function revokeToken(user, token, justification) {
  logger.debug('Revoking ' + token + ' for user ' + user);
  try {
    let fName = 'revokeToken';
    _validateNoEmptyString(fName, 'user', user, 'string');
    _validateNoEmptyString(fName, 'token', token, 'string');
    _validateNoEmptyString(fName, 'justification', justification, 'string');
  } catch ( e ) {
    return Promise.reject(e);
  }
  let p_cursor = findMatchingTokens(token);

  // Need to be sure that there was only one instance of this token in the db
  let p_onlyOneDoc = cursorHasExactlyOneDoc(p_cursor);

  let p_document = p_onlyOneDoc.then(getDocument(p_cursor));

  // Need to be sure that the user requesting revocation is the same
  // as the one who created the token
  let p_correctUser = p_document.then(function(doc) {
    return user === doc.user ? Promise.resolve()
                             : Promise.reject(new Error(USER_NOT_TOKEN_OWNER));
  });

  let p_updated = p_correctUser.then(function() {
    return p_document.then(function(doc) {
      let update = {$set: {
        status: constants.TOKEN_STATUS_REVOKED,
        revocationReason: justification,
        revocationTime: moment().format()
      }};
      return _updateToken(doc, update);
    });
  });

  return p_updated;
};


/**
 * Lists all tokens belonging to the user.
 * @alias module:lib/model.listTokens
 * @param {String} user
 * @return {Promise} Fulfills on completion with a list of all tokens belonging
 *   to the user.
 */
let listTokens = function listTokens(user) {
  // TODO: what if user not recognised?
  logger.debug('Listing tokens for user', user);
  try {
    let functionName = 'listTokens';
    _validateNoEmptyString(functionName, 'user', user, 'string');
  } catch (e) {
    return Promise.reject(e);
  }

  return p_collection.then(function(collection) {
    // sort so valid tokens at top
    return collection.find({user}).sort('status', -1).toArray();
  });
};

/**
 * Decides whether token authorises the bearer for a file owned by the list
 * of groups.
 * @alias module:lib/model.validateToken
 * @param {String[]} groups
 * @param {String} token
 * @return {Promise} Fulfills on completion with authorisation decision.
 *   Decision is an Object of form {ok: <Boolean>}.
 */
let validateToken = function validateToken(groups, token) {
  logger.debug('Validating token ' + token + ' authorises bearer');
  try {
    let fName = 'validateToken';
    _validate(fName, 'groups', groups);
    assert(groups instanceof Array, `${fName}: groups must be an Array`);
    _validateNoEmptyString(fName, 'token', token, 'string');
  } catch ( e ) {
    return Promise.reject(e);
  }
  let p_cursor = findMatchingTokens(token);

  let p_onlyOneDoc = cursorHasExactlyOneDoc(p_cursor);

  let p_document = p_onlyOneDoc.then(getDocument(p_cursor));

  return p_document.then(function(doc) {
    if (doc.status === constants.TOKEN_STATUS_REVOKED) {
      return false;
    }
    let now = moment();
    if (doc.expiryTime && now.isAfter(doc.expiryTime)) {
      return false;
    }
    return validateUser(groups, doc.user);
  });
};

/**
 * Decides whether the user is authorised for a file owned by the list
 * of groups.
 * @alias module:lib/model.validateUser
 * @param {String[]} groups
 * @param {String} user
 * @return {Promise} Fulfills on completion with authorisation decision.
 *   Decision is an Object of form {ok: <Boolean>}.
 */
let validateUser = function validateUser(groups, user) {
  logger.debug('Validating that user ' + user + ' is member of all groups ' +
               JSON.stringify(groups));
  try {
    let fName = 'validateUser';
    _validate(fName, 'groups', groups);
    assert(groups instanceof Array, `${fName}: groups must be an Array`);
    _validateNoEmptyString(fName, 'user', user, 'string');
  } catch ( e ) {
    return Promise.reject(e);
  }

  let p_user_collection = dbConn.p_db.then(getCollection(constants.COLLECTION_USERS));

  let p_user_cursor = p_user_collection.then(function(collection) {
    return collection.find({user: user});
  });

  let p_user_onlyOneDoc = cursorHasExactlyOneDoc(p_user_cursor);

  let p_user_document = p_user_onlyOneDoc.then(getDocument(p_user_cursor));

  let p_groups = p_user_document.then(function(doc) {
    return doc.groups;
  });

  return p_groups.then(function(userGroups) {
    if (!userGroups) {
      return false;
    }
    return groups.every(function(val) {
      return userGroups.indexOf(val) >= 0;
    });
  });
};

module.exports = {
  createToken,
  revokeToken,
  listTokens,
  validateUser,
  validateToken,
};
