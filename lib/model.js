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

module.exports.revokeToken = function(user, token) {
  let p_cursor = p_collection.then(function(collection) {
    return new Promise(function(resolve, reject) {
      try {
        resolve(collection.find({token: token}));
      } catch (e) {
        reject(e);
      }
    });
  });

//  p_cursor.catch(function(reason) {
//    next(reason);
//  });

  let p_hasNext = p_cursor.then(function(cursor) {
    return cursor.hasNext();
  });

  let p_document = p_hasNext.then(function(hasNext) {
    if (hasNext) {
      return p_cursor.then(function(cursor) {
        return cursor.next();
      });
    } else {
      return new Promise(function(resolve, reject) {
        reject(new Error('Did not find token in database.'));
      });
    }
  });

  // Need to run cursor.hasNext() again to make sure this was the only document
  // matching this token.
  let p_onlyOneDoc = p_document.then(function() {
    return p_cursor.then(function(cursor) {
      return cursor.hasNext();
    });
  })
    .then(function(hasNext) {
      return new Promise(function(resolve, reject) {
        if (!hasNext) {
          resolve();
        } else {
          // TODO: Better error message, what to do if this exists?
          reject(
            new Error('Database error! Too many instances of this token!')
          );
        }
      });
    });

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
