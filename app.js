/**
 * Copyright (C) 2017 Genome Research Ltd
 * See license in LICENSE
 */

'use strict';

const crypto = require('crypto');
const path = require('path');

const express = require('express');
const MongoClient = require('mongodb').MongoClient;

const PORT = process.argv[2] || 8000;

let db = MongoClient.connect('mongodb://localhost:27017/test');

db.catch(function(reason) {
  console.error(reason);
  process.exit(1);
});

let tokenCollection = db.then(function(db) {
  return new Promise(function(resolve, reject) {
    db.collection('tokens', {strict: true}, function(err, collection) {
      if (err)
        reject(err);
      else
        resolve(collection);
    });
  });
});

tokenCollection.catch(function(reason) {
  console.error(reason);
  process.exit(1);
});

function generateToken() {
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

app.post('/makeToken', function(req, res, next) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];
  // TODO Now check that the user authenticated with x-remote-user is allowed
  // to create a token for this user

  let tokenObj;

  generateToken().then(function(token) {
    tokenObj = {user, token, status: 'valid'};
    return tokenCollection.then(function(collection) {
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
      res.status(201).json(tokenObj);
    });

});

app.use(express.static(path.join(__dirname, 'public'), {index: false}));

app.get('/', function(req, res) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];

  let userTokens = tokenCollection.then(function(collection) {
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
  res.status(500)
     .render(path.join(__dirname, 'views', 'error'), {err});
});

app.listen(PORT);
console.log(`express started on port ${PORT}`);

