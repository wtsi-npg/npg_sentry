'use strict';

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
