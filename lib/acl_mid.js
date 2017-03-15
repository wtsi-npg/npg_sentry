'use strict';

const ACL = require('acl');

const model = require('./model');

let acl;

let get = () => {
  model.p_db.then((db) => {
    /* eslint-disable new-cap */
    acl = new ACL(new ACL.mongodbBackend(db, 'sentry_acl'));
    /* eslint-enable new-cap */

    acl.allow('administrator', '/admin', 'view');

    acl.addUserRoles('someuser@domain.com', 'administrator');
    console.log('>>>>> HERE INSIDE');
  });

  console.log('>>>>> HERE');

  return acl;
};

module.exports = {
  get
};
