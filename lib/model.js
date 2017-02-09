/**
 * Copyright (C) 2017 Genome Research Ltd
 * See license in LICENSE
 */

// This module uses 'p_' prefix to signify promises
// e.g., p_db is a promise that, when fulfilled,
// provides the db object.
//

'use strict';

const assert      = require('assert');
const randomBytes = require('crypto').randomBytes;

const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;

const config = require('./config.js');

class DbError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DbError';
  }
}
module.exports.DbError = DbError;

function getCollection(collName) {
  return function(db) {
    return new Promise(function(resolve, reject) {
      db.collection(collName, function(err, collection) {
        if (err) {
          reject(err);
        } else {
          resolve(collection);
        }
      });
    });
  };
}

function _validate(scope, name, value, type) {
  assert(value, `${scope}: ${name} is not defined`);
  if ( type ) {
    assert(typeof value === type, `${scope}: ${name} must be a ${type}`);
  }
}

function _validateNoEmptyString(scope, name, value, type) {
  _validate(scope, name, value, type);
  assert(
    value.trim() !== '',
    `${scope}: ${name} cannot be empty string`
  );
}

// TODO check if mongo works as a pool already, probably this variables should
// not be in the whole module scope
let p_db = MongoClient.connect(config.provide().get('mongourl'));

p_db.catch(function(reason) {
  console.error(reason);
  throw reason;
});

let p_collection = p_db.then(getCollection('tokens'));

p_collection.catch(function(reason) {
  console.error(reason);
  throw reason;
});


function generateTokenPromise() {
  return new Promise(function(resolve, reject) {
    // 24 bytes will generate a 32 character base64 string
    randomBytes(24, function(err, buf) {
      if (err) {
        reject(err);
        return;
      }
      // http://stackoverflow.com/questions/8838624/node-js-send-email-on-
      // registration/8842959#8842959
      resolve(buf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-'));
    });
  });
}

function findMatchingTokens(token, status) {
  return p_collection.then(function(collection) {
    return new Promise(function(resolve, reject) {
      let query = {token: token};
      if (status) {
        query.status = status;
      }
      try {
        resolve(collection.find(query));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function getDocument(p_cursor) {
  return function() {
    return p_cursor.then(function(cursor) {
      return cursor.next();
    });
  };
}

function cursorHasExactlyOneDoc(p_cursor) {
  return p_cursor.then(function(cursor) {
    cursor.rewind();
    return cursor;
  })
  .then(function(cursor) {
    return cursor.count();
  })
  .then(function(count) {
    return new Promise(function(resolve, reject) {
      if (count === 1) {
        resolve();
      } else {
        reject(
          new DbError('Unexpected number of documents containing this token')
        );
      }
    });
  });
}


module.exports.createToken = function createToken(user, justification) {
  // TODO what if user is unknown?
  try {
    let fName = 'createToken';
    _validateNoEmptyString(fName, 'user', user, 'string');
    _validateNoEmptyString(fName, 'justification', justification, 'string');
  } catch ( e ) {
    return Promise.reject(e);
  }
  return generateTokenPromise().then(function(token) {
    let now = moment();
    let validDuration = moment.duration(7, 'days');
    let doc = {
      token: token,
      status: 'valid',
      issueTime: now.format(),
      creationReason: justification,
      user: user,
      expiryTime: now.clone().add(validDuration).format()
    };
    return p_collection.then(function(collection) {
      return new Promise(function(resolve, reject) {
        collection.insertOne(doc)
          .then(function() {
            resolve(doc);
          }, function(reason) {
            reject(reason);
          });
      });
    });
  })
  .catch(function(reason) {
    return new Promise(function(resolve, reject) {
      console.error(reason);
      reject(reason);
    });
  });
};

module.exports.revokeToken = function revokeToken(user, token, justification) {
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
    return new Promise(function(resolve, reject) {
      if (user !== doc.user) {
        reject(new Error('This user does not own this token'));
      } else {
        resolve();
      }
    });
  });

  let p_updated = p_correctUser.then(function() {
    return p_document.then(function(doc) {
      return p_collection.then(function(collection) {
        return collection.updateOne({token: token},
          {$set: {
            status: 'revoked',
            revocationReason: justification,
            revocationTime: moment().format()
          }})
          .then(function() {
            doc.status = 'revoked';
            return doc;
          });
      });
    });
  });

  return p_updated;
};


module.exports.listTokens = function listTokens(user) {
  // TODO: what if user not recognised?
  try {
    let functionName = 'listTokens';
    assert(user, `${functionName}: user is not defined`);
    assert(typeof user === 'string', `${functionName}: user must be a string`);
  } catch (e) {
    return Promise.reject(e);
  }

  return p_collection.then(function(collection) {
    // sort so valid tokens at top
    return collection.find({user}).sort('status', -1).toArray();
  });
};


module.exports.checkToken = function checkToken(groups, token) {
  if (! groups instanceof Array || typeof token !== 'string') {
    return Promise.reject(new Error('checkToken: undefined argument(s)'));
  }
  let p_cursor = findMatchingTokens(token, 'valid');

  let p_onlyOneDoc = cursorHasExactlyOneDoc(p_cursor);

  let p_document = p_onlyOneDoc.then(getDocument(p_cursor));

  let p_user = p_document.then(function(doc) {
    return doc.user;
  });

  let p_user_collection = p_db.then(getCollection('users'));

  let p_user_cursor = p_user.then(function(user) {
    return p_user_collection.then(function(collection) {
      return new Promise(function(resolve, reject) {
        try {
          resolve(collection.find({user: user}));
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  let p_user_onlyOneDoc = cursorHasExactlyOneDoc(p_user_cursor);

  let p_user_document = p_user_onlyOneDoc.then(getDocument(p_user_cursor));

  let p_groups = p_user_document.then(function(doc) {
    return doc.groups;
  });

  return p_groups.then(function(userGroups) {
    return p_document.then(function(doc) {
      // EVERY member of 'groups' (the groups that the ranger server
      // claims have access to the files) should appear in userGroups
      if (!userGroups) {
        return false;
      }
      if (doc.status === 'revoked') {
        return false;
      }

      let now = moment();
      if (doc.expiryTime && now.isAfter(doc.expiryTime)) {
        return false;
      }
      return groups.every(function(val) {
        return userGroups.indexOf(val) >= 0;
      });
    });
  });
};
