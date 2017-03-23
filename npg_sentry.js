#!/usr/bin/env node

'use strict';

/**
 * @author Andrew Nowak
 * @copyright Genome Research Limited 2017
 */

const config = require('./lib/config');
let opts;
if ( module.parent ) {
  opts = config.provide();
} else {
  opts = config.provide(config.fromCommandLine);
}
const logger = require('./lib/logger');

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');
const helmet = require('helmet');

const admin_controller         = require('./lib/admin_controller');
const authorisation_controller = require('./lib/authorisation_controller');

const port = opts.get('port');

const app = express();
let serv;

if (opts.get('no-ssl')) {
  serv = http.createServer(app);
} else {
  assert(opts.get('sslca') && opts.get('sslkey') && opts.get('sslcert'));
  let ca = opts.get('sslca');
  let key = opts.get('sslkey');
  let cert = opts.get('sslcert');
  if (!(key && cert)) {
    throw new Error('Running server on SSL requires both private key and ' +
     'certificate to be defined');
  }
  let httpsopts = {
    ca: fs.readFileSync(ca),
    key: fs.readFileSync(key),
    cert: fs.readFileSync(cert),
    requestCert: true,
    rejectUnauthorized: true,
  };
  logger.info('Running on HTTPS');
  let passphrase = opts.get('sslpassphrase');
  if (passphrase) {
    httpsopts.passphrase = passphrase;
  }

  serv = https.createServer(httpsopts, app);
}

// app.get('/foo') is not the same as app.get('/foo/')
app.enable('strict routing');

app.set('view engine', 'ejs');

app.use(helmet({
  hsts: false
}));

app.use(logger.connectLogger(logger, { level: 'auto' }));

app.use(bodyParser.json());

// if (opts.get('do-acls')) {
admin_controller.setup(app);
// }

authorisation_controller.setup(app);

app.get('/', function(req, res) {
  res.render(path.join(__dirname, 'sentry/views', 'index'));
});

app.use(express.static(path.join(__dirname, 'sentry/public')));

app.use(function(req, res) {
  let statusCode = 404;
  res.status(statusCode)
     .render(path.join(__dirname, 'sentry/views', 'error'), {
       err: 'Not Found', statusCode
     });
});

// 'next' is unused, but required for express to see this
// as error-handling middleware
//
// https://expressjs.com/en/4x/api.html#description
/* eslint-disable no-unused-vars */
app.use(function(err, req, res, next) {
/* eslint-enable no-unused-vars */
  let statusCode = err.statusCode || 500;
  let errorMessage = 'Unknown error';
  if ( http.STATUS_CODES[statusCode] ) {
    errorMessage = http.STATUS_CODES[statusCode];
  }
  logger.error(err);
  res.status(statusCode).json({
    status: statusCode,
    err:    errorMessage
  });
});
logger.debug('All routing and middleware registered');

serv.listen(port);
logger.info(`npg_sentry started on port ${port}`);

if ( module.parent ) {
  module.exports = serv;
}
