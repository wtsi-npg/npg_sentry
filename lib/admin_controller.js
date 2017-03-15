"use strict";

const path = require('path');

const constants = require('./constants');

module.exports.setup = function( app, acl ) {

  if ( acl ) {
    app.use('/admin', (req, res, next) => {
      let user = req.headers[constants.USER_ID_HEADER];
      acl.isAllowed(user, '/admin', ['view'], (err, acl_result) => {
        if ( err ) {
          next(err);
        } else if ( acl_result ) {
          console.log("User joed is allowed to view blogs");
          next();
        } else {
          let unauth = new Error('My error');
          unauth.statusCode = 403;
          next(unauth);
        }
      });
    });
  }

  app.get('/admin', function(req, res) {
    let user = req.headers[constants.USER_ID_HEADER];
    // logger.info('admin page for ', user);

    let statusCode = 200;
    res.status(
      statusCode
    ).render(path.join(__dirname, '../sentry/views', 'admin'), {
     user: user
    });
  });
};
