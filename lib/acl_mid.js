'use strict';

const ACL = require('acl');

const constants = require('./constants');
const dbConn    = require('./db_conn');

// if (opts.get('acls')) {
let p_acl = dbConn.p_db.then((db) => {
  /* eslint-disable new-cap */
  let acl = new ACL(new ACL.mongodbBackend(db, constants.ACL_BACKEND_PREFIX));
  /* eslint-enable new-cap */

  let p_allow = acl.allow(
    constants.ACL_ROLE_ADMINISTRATOR,
    '/admin',
    constants.ACL_ACTION_VIEW
  );
  let p_userRoles = acl.addUserRoles(
    'someuser@domain.com',
    constants.ACL_ROLE_ADMINISTRATOR
  );
  return Promise.all([p_allow, p_userRoles]).then(() => {return acl;});
});
// }

let aclMiddleware = (resource, actions) => {
  return (req, res, next) => {
    if (p_acl) {
      let user = req.headers[constants.USER_ID_HEADER];
      p_acl.then((acl) => {
        acl.isAllowed(user, resource, actions, (err, acl_result) => {
          if ( err ) {
            next(err);
          } else if ( acl_result ) {
            console.log('User ' + user + ' is allowed to view admin page');
            next();
          } else {
            let unauth = new Error('Unauthroized access to protected resource');
            unauth.statusCode = 403;
            next(unauth);
          }
        });
      });
    } else {
      next();
    }
  };
};

module.exports = aclMiddleware;
