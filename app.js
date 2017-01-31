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

const app = express();

const creation_msg = 'Created by owner via web interface';
const revocation_msg = 'Revoked by owner via web interface';

app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.post('/createToken', function(req, res, next) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];

  model.createToken(user, creation_msg).then(function(response) {
    res.status(200).json(response);
  }, next);
});

app.post('/revokeToken', function(req, res, next) {
  let user = 'an8@sanger.ac.uk'; //req.headers['X-Remote-User'];
  let token;

  try {
    token = req.body.token;
  } catch (e) {
    next(e);
  }

  model.revokeToken(user, token, revocation_msg).then(function(row) {
    res.status(200).json(row);
  }, next);
});

app.post('/checkToken', function(req, res, next) {
  let token = req.body.token;
  let groups = req.body.groups;

  model.checkToken(groups, token).then(function(decision) {
    if (decision === true) {
      res.status(200).send();
    } else {
      res.status(403).send();
    }
  }, next);
});

app.get('/listTokens', function(req, res, next) {
  let user = 'an8@sanger.ac.uk';

  model.listTokens(user).then(function(docs) {
    res.status(200).json(docs);
  }, next);
});

app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res) {
  let statusCode = 404;
  res.status(statusCode)
    .render(path.join(__dirname, 'views', 'error'),
      {err: 'Not Found', statusCode});
});

// 'next' is unused, but required for express to see this
// as error-handling middleware
//
// https://expressjs.com/en/4x/api.html#description
/* eslint-disable no-unused-vars */
app.use(function(err, req, res, next) {
/* eslint-enable no-unused-vars */
  console.error(err.stack);
  let statusCode;
  if (err instanceof model.DbError) {
    statusCode = 400;
  } else {
    statusCode = 500;
  }
  res.status(statusCode)
    .render(path.join(__dirname, 'views', 'error'), {err, statusCode});
});

app.listen(PORT);
console.error(`express started on port ${PORT}`);

