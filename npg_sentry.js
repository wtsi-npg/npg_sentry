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
  let passphrase = opts.get('sslpassphrase');
  if (passphrase) {
    httpsopts.passphrase = passphrase;
  }

  serv = https.createServer(httpsopts, app);
}

app.use(helmet({
  hsts: false
}));

app.set('view engine', 'ejs');

app.use(logger.connectLogger(logger, { level: 'auto' }));

app.use(bodyParser.json());

authorisation_controller.setup(app);

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
  logger.error(err);
  let statusCode = 500;
  res.status(statusCode).json({
    status: statusCode,
    err: 'Internal server error'
  });
});

serv.listen(port);
logger.info(`npg_sentry started on port ${port}`);

if ( module.parent ) {
  module.exports = serv;
}
