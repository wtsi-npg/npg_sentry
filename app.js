/**
 * Copyright (C) 2017 Genome Research Ltd
 * See license in LICENSE
 */

'use strict';

const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');

const model = require('./lib/model');

const PORT = process.argv[2] || 8000;

let app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.post('/createToken', function(req, res) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];
  // TODO Now check that the user authenticated with x-remote-user is allowed
  // to create a token for this user

  model.createToken(user).then(function(response) {
    res.status(200).json(response);
  });
});

app.post('/revokeToken', function(req, res, next) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];
  // TODO Check that the X-Remote-User owns this token, and can revoke it

  let token = req.body.token;
  model.revokeToken(user, token).then(function(row) {
    res.status(200).json(row);
  }, function(reason) {
    next(reason);
  });

});

app.use(express.static(path.join(__dirname, 'public'), {index: false}));

app.get('/', function(req, res, next) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];

  model.listTokens(user).then(function(docs) {
    res.render(path.join(__dirname, 'views', 'index'), {docs, user});
  }, function(reason) {
    // Error occurred finding tokens and converting cursor to array
    next(reason);
  });
});

app.use(function(req, res) {
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

