"use strict";

/**
 * @external crypto
 * @see {@link https://nodejs.org/docs/latest-v6.x/api/crypto.html|crypto}
 */
const randomBytes = require('crypto').randomBytes;

const logger = require('./logger.js');

let generateTokenStringPromise = () => {
  // 24 bytes will generate a 32 character base64 string
  return new Promise(function(resolve, reject) {
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
};

module.exports = {
  generateTokenStringPromise
};
