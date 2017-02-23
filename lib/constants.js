'use strict';

const messages = require('./messages.json').ERRORS;

const WEB_TOKEN_CREATION_MSG   = 'Created by owner via web interface';
const WEB_TOKEN_REVOCATION_MSG = 'Revoked by owner via web interface';

const USER_ID_HEADER = 'x-remote-user';

const TOKEN_STATUS_REVOKED = 'revoked';
const TOKEN_STATUS_VALID   = 'valid';
const TOKEN_DURATION       = 7;
const TOKEN_DURATION_UNIT  = 'days';

const COLLECTION_TOKENS = 'tokens';
const COLLECTION_USERS  = 'users';

module.exports = {
  UNEXPECTED_NUM_DOCS: messages.UNEXPECTED_NUM_DOCS,
  USER_NOT_TOKEN_OWNER: messages.USER_NOT_TOKEN_OWNER,
  WEB_TOKEN_CREATION_MSG,
  WEB_TOKEN_REVOCATION_MSG,
  USER_ID_HEADER,
  TOKEN_STATUS_REVOKED,
  TOKEN_STATUS_VALID,
  TOKEN_DURATION,
  TOKEN_DURATION_UNIT,
  COLLECTION_TOKENS,
  COLLECTION_USERS,
};
