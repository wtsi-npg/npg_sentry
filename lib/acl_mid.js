'use strict';

const ACL = require('acl');

const constants = require('./constants');
const dbConn    = require('./db_conn');

// if (opts.get('acls')) {
let p_acl = dbConn.p_db.then((db) => {
  /* eslint-disable new-cap */
  let acl = new ACL(new ACL.mongodbBackend(db, constants.ACL_BACKEND_PREFIX));
  /* eslint-enable new-cap */

  return acl;
});
// }

let aclMiddleware = (resource, actions) => {
  return (req, res, next) => {
    if ( p_acl ) {
      let user = req.headers[constants.USER_ID_HEADER];
      if (!user) {
        let err = new Error('User was not authenticated');
        err.statusCode = 401;
        return next(err);
      }
      p_acl.then((acl) => {
        acl.isAllowed(user, resource, actions, (err, acl_result) => {
          if ( err ) {
            next(err);
          } else if ( acl_result ) {
            next();
          } else {
            let unauth = new Error(user + ' is not allowed to perform ' +
                                   JSON.stringify(actions) + ' on ' + resource);
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
module.exports.p_acl = p_acl;
