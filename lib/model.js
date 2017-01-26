/**
 * Copyright (C) 2017 Genome Research Ltd
 * See license in LICENSE
 */

// This module uses 'p_' prefix to signify promises
// e.g., p_db is a promise that, when fulfilled,
// provides the db object.
//
/* eslint camelcase: "off" */

'use strict';

const crypto = require('crypto');

const MongoClient = require('mongodb').MongoClient;

class DbError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DbError';
  }
};

module.exports.DbError = DbError;

let p_db = MongoClient.connect('mongodb://localhost:27017/test');

p_db.catch(function(reason) {
  console.error(reason);
  process.exit(1);
});

let p_collection = p_db.then(function(db) {
  return new Promise(function(resolve, reject) {
    db.collection('tokens', {strict: true}, function(err, collection) {
      if (err) {
        reject(err);
      } else {
        resolve(collection);
      }
    });
  });
});

p_collection.catch(function(reason) {
  console.error(reason);
  process.exit(1);
});

function generateTokenPromise() {
  return new Promise(function(resolve, reject) {
    // 24 bytes will generate a 32 character base64 string
    crypto.randomBytes(24, function(err, buf) {
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


module.exports.createToken = function(user) {
  return generateTokenPromise().then(function(token) {
    let doc = {user, token, status: 'valid'};
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

function cursorHasNext(cursor) {
  return cursor.hasNext();
}

function getDocument(p_hasNext, p_cursor) {
  return p_hasNext.then(function(hasNext) {
    if (hasNext) {
      return p_cursor.then(function(cursor) {
        return cursor.next();
      });
    } else {
      throw new DbError('Did not find token in database');
    }
  });
}

function cursorHasExactlyOneDoc(p_document, p_cursor) {
  return p_document.then(function() {
    return p_cursor.then(function(cursor) {
      cursor.rewind();
      return cursor;
    });
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

module.exports.revokeToken = function(user, token) {
  let p_cursor = findMatchingTokens(token);

  let p_hasNext = p_cursor.then(cursorHasNext);

  let p_document = getDocument(p_hasNext, p_cursor);

  // Need to run cursor.hasNext() again to make sure this was the only document
  // matching this token.
  let p_onlyOneDoc = cursorHasExactlyOneDoc(p_document, p_cursor);

  let p_updated = p_onlyOneDoc.then(function() {
    return p_document.then(function(doc) {
      // TODO Check that the X-Remote-User owns this token, and can revoke it
      return p_collection.then(function(collection) {
        return collection.updateOne({token: token}, {$set: {status: 'revoked'}})
          .then(function() {
            doc.status = 'revoked';
            return doc;
          });
      });
    });
  });

  return p_updated;
};


module.exports.listTokens = function(user) {
  return p_collection.then(function(collection) {
    return collection.find({user}).toArray();
  });
};


module.exports.checkToken = function(groups, token) {
  let p_cursor = findMatchingTokens(token, 'valid');

  let p_hasNext = p_cursor.then(cursorHasNext);

  let p_document = getDocument(p_hasNext, p_cursor);

  let p_onlyOneDoc = cursorHasExactlyOneDoc(p_document, p_cursor);

  let p_user = p_onlyOneDoc.then(function() {
    return p_document.then(function(doc) {
      return doc.user;
    });
  });

  let p_user_collection = p_db.then(function(db) {
    return new Promise(function(resolve, reject) {
      db.collection('users', function(err, collection) {
        if (err) {
          reject(err);
        } else {
          resolve(collection);
        }
      });
    });
  });

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

  let p_user_hasNext = p_user_cursor.then(cursorHasNext);

  let p_user_document = getDocument(p_user_hasNext, p_user_cursor);

  let p_user_onlyOneDoc =
    cursorHasExactlyOneDoc(p_user_document, p_user_cursor);

  let p_groups = p_user_onlyOneDoc.then(function() {
    return p_user_document.then(function(doc) {
      return doc.groups;
    });
  });

  function _includes(val, ind, arr) {
    return arr.indexOf(val) >= 0;
  }

  return p_groups.then(function(userGroups) {
    // EVERY member of 'groups' (the groups that the ranger server
    // claims have access to the files) should appear in userGroups
    if (!userGroups) {
      return false;
    }
    return groups.every(function(val) {
      return userGroups.indexOf(val) >= 0;
    });
  });
};
