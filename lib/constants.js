'use strict';

/**
 * Various constants
 * @module lib/constants
 * @copyright 2017 Genome Research Ltd
 * @author Andrew Nowak
 */

const messages = require('./messages.json');

const ACL_BACKEND_PREFIX     = 'sentry_acl';
const ACL_ROLE_ADMINISTRATOR = 'administrator';
const ACL_ACTION_VIEW        = 'view';
const ACL_ACTION_POST        = 'post';

/**
 * Resource name for everything related to administration. Used for ACLs.
 * @type {String}
 * @memberof module:lib/constants
 */
const ADMIN_RESOURCE = '/admin';

/**
 * HTTP Header where authenticated username is provided.
 * @const
 * @default
 * @type {String}
 * @memberof module:lib/constants
 */
const USER_ID_HEADER = 'x-remote-user';

/**
 * Operation name inventory. Entry for token creation.
 * @const
 * @default
 * @type {String}
 * @memberof module:lib/constants
 */
const TOKEN_OPERATION_CREATE = 'create';

/**
 * Operation name inventory. Entry for token revocation.
 * @const
 * @default
 * @type {String}
 * @memberof module:lib/constants
 */
const TOKEN_OPERATION_REVOKE = 'revoke';

/**
 * Token status inventory. Token is revoked.
 * @const
 * @default
 * @type {String}
 * @memberof module:lib/constants
 */
const TOKEN_STATUS_REVOKED = 'revoked';

/**
 * Token status inventory. Token is valid.
 * @const
 * @default
 * @type {String}
 * @memberof module:lib/constants
 */
const TOKEN_STATUS_VALID   = 'valid';

/**
 * Number of units which a token should be valid before expiring.
 * @see module:lib/constants.TOKEN_DURATION_UNIT
 * @const
 * @default
 * @type {Number}
 * @memberof module:lib/constants
 */
const TOKEN_DURATION       = 7;

/**
 * Units describing how long a token should be valid before expiring.
 * Should be a unit recognised by moment.
 * @see http://momentjs.com/docs/#/manipulating/add/
 * @const
 * @default
 * @type {String}
 * @memberof module:lib/constants
 */
const TOKEN_DURATION_UNIT  = 'days';

/**
 * Name of mongoDB collection to store tokens.
 * @const
 * @default
 * @type {String}
 * @memberof module:lib/constants
 */
const COLLECTION_TOKENS = 'tokens';

/**
 * Name of mongoDB collection to store users.
 * @const
 * @default
 * @type {String}
 * @memberof module:lib/constants
 */
const COLLECTION_USERS  = 'users';

module.exports = {
  /**
   * Error message to log when number of documents found differs from expected.
   * @const
   * @default
   * @type {String}
   */
  UNEXPECTED_NUM_DOCS: messages.ERRORS.UNEXPECTED_NUM_DOCS,

  /**
   * Error message to log when multiple docs are found but only 0 or 1 are expected.
   * @const
   * @default
   * @type {String}
   */
  MULTIPLE_DOCS_ERROR: messages.ERRORS.MULTIPLE_DOCS_ERROR,

  /**
   * Error message to log when a user is attempting to act upon a token
   * which does not belong to them.
   * @const
   * @default
   * @type {String}
   */
  USER_NOT_TOKEN_OWNER: messages.ERRORS.USER_NOT_TOKEN_OWNER,

  /**
   * Message to insert into database when a user creates a token through
   * the web interface.
   * @const
   * @default
   * @type {String}
   */
  WEB_TOKEN_CREATION_MSG: messages.WEB_TOKEN.CREATION_MSG,

  /**
   * Message to insert into database when a user revokes their token through
   * the web interface.
   * @const
   * @default
   * @type {String}
   */
  WEB_TOKEN_REVOCATION_MSG: messages.WEB_TOKEN.REVOCATION_MSG,

  ACL_BACKEND_PREFIX,
  ACL_ROLE_ADMINISTRATOR,
  ACL_ACTION_VIEW,
  ACL_ACTION_POST,

  ADMIN_RESOURCE,

  USER_ID_HEADER,
  TOKEN_OPERATION_CREATE,
  TOKEN_OPERATION_REVOKE,
  TOKEN_STATUS_REVOKED,
  TOKEN_STATUS_VALID,
  TOKEN_DURATION,
  TOKEN_DURATION_UNIT,
  COLLECTION_TOKENS,
  COLLECTION_USERS,
};
