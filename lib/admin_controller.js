"use strict";

const path = require('path');

const acl_mid = require('./acl_mid');
const constants = require('./constants');

module.exports.setup = function( app ) {

  app.get('/admin',
    acl_mid('/admin', ['view']),
    function(req, res) {
      let user = req.headers[constants.USER_ID_HEADER];
      // logger.info('admin page for ', user);

      let statusCode = 200;
      res.status(
        statusCode
      ).render(path.join(__dirname, '../sentry/views', 'admin'), {
        user: user,
      });
    }
  );
};
