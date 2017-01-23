/**
 * Copyright (C) 2017 Genome Research Ltd
 * See license in LICENSE
 */

'use strict';

const crypto = require('crypto');
const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');
const MongoClient = require('mongodb').MongoClient;

const PORT = process.argv[2] || 8000;

let p_db = MongoClient.connect('mongodb://localhost:27017/test');

p_db.catch(function(reason) {
  console.error(reason);
  process.exit(1);
});

let p_collection = p_db.then(function(db) {
  return new Promise(function(resolve, reject) {
    db.collection('tokens', {strict: true}, function(err, collection) {
      if (err)
        reject(err);
      else
        resolve(collection);
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
      // http://stackoverflow.com/questions/8838624/node-js-send-email-on-registration/8842959#8842959
      resolve(buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-'));
    });
  });
}

let app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.post('/createToken', function(req, res, next) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];
  // TODO Now check that the user authenticated with x-remote-user is allowed
  // to create a token for this user

  let tokenObj;

  generateTokenPromise().then(function(token) {
    tokenObj = {user, token, status: 'valid'};
    return p_collection.then(function(collection) {
      return collection.insertOne(tokenObj);
    });
  })
    .catch(function(reason) {
      return new Promise(function(resolve, reject) {
        console.error(reason);
        reject(reason);
      });
    })
    .then(function(result) {
      res.status(200).json(tokenObj);
    });
});

app.post('/revokeToken', function(req, res, next) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];
  // TODO Check that the X-Remote-User owns this token, and can revoke it

  let p_cursor = p_collection.then(function(collection) {
    return new Promise(function(resolve, reject) {
      try {
        resolve(collection.find({token: req.body.token}));
      } catch (e) {
        reject(e);
      }
    });
  });

  p_cursor.catch(function(reason) {
    next(reason);
  });

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
          reject(new Error('Database error! Too many instances of this token!'));
        }
      });
    });

  let p_updated = p_onlyOneDoc.then(function() {
    return p_document.then(function(doc) {
      // TODO Check that the X-Remote-User owns this token, and can revoke it
      return p_collection.then(function(collection) {
        return collection.updateOne({token: req.body.token}, {$set: {status: 'revoked'}});
      });
    });
  });

  p_updated.then(function() {
    p_document.then(function(doc) {
      doc.status = 'revoked';
      res.status(200).json(doc);
    });
  }, function(reason) {
    next(reason);
  });
});

app.use(express.static(path.join(__dirname, 'public'), {index: false}));

app.get('/', function(req, res) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];

  let userTokens = p_collection.then(function(collection) {
    return collection.find({user}).toArray();
  }).then(function(docs) {
    res.render(path.join(__dirname, 'views', 'index'), {docs, user});
  }, function(reason) {
    // Error occurred finding tokens and converting cursor to array
    next(reason);
  });
});

app.use(function(req, res, next) {
  res.status(404)
     .render(path.join(__dirname, 'views', 'error'), {err: 'Not Found'});
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send(err);
  //   .render(path.join(__dirname, 'views', 'error'), {err});
});

app.listen(PORT);
console.error(`express started on port ${PORT}`);

