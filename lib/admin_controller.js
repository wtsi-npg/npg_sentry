"use strict";

const path = require('path');

const acl_mid = require('./acl_mid');
const constants = require('./constants');
const model = require('./model');
const sentryUtils = require('./sentry_utils');

module.exports.setup = function( app ) {

  app.post('/admin/user/:username/createToken',
    acl_mid('/admin', constants.ACL_ACTION_POST),
    function(req, res, next) {
      let user = req.headers[constants.USER_ID_HEADER];
      let targetUser = req.params.username;
      model.createToken(
        targetUser,
        // TODO move this somewhere more helpful; probably constants?
        'Created by admin ' + user + ' via admin interface'
      ).then(function(response) {
        sentryUtils.dispatchSuccess(res, response);
      }, next);
    }
  );

  app.post('/admin/user/:username/revokeToken',
    acl_mid('/admin', constants.ACL_ACTION_POST),
    function(req, res, next) {
      let user = req.headers[constants.USER_ID_HEADER];
      let targetUser = req.params.username;

      let token = sentryUtils.readToken(req);
      if (token instanceof Error) {
        return next(token);
      }

      model.revokeToken(
        targetUser,
        token,
        // TODO move this somewhere more helpful; probably constants?
        'Revoked by admin ' + user + ' via admin interface'
      ).then(function(response) {
        sentryUtils.dispatchSuccess(res, response);
      }, next);
    }
  );

  app.get('/admin/user/:username/listTokens',
    acl_mid('/admin', constants.ACL_ACTION_VIEW),
    function(req, res, next) {
      let targetUser = req.params.username;

      model.listTokens(targetUser).then(function(docs) {
        sentryUtils.dispatchSuccess(res, docs);
      }, next);
    }
  );

  // this is a resource, so should have a trailing slash
  // (this allows relative urls to work)
  app.get('/admin/user/:username',
    acl_mid('/admin', constants.ACL_ACTION_VIEW),
    function(req, res) {
      res.redirect(`/admin/user/${req.params.username}/`);
    }
  );

  app.get('/admin/user/:username/',
    acl_mid('/admin', constants.ACL_ACTION_VIEW),
    function(req, res) {
      res.status(200).render(path.join(__dirname, '../sentry/views', 'admin'), {
        user: req.params.username,
        baseurl: req.relativeRoot,
      });
    }
  );

  // this is a resource, so should have a trailing slash
  // (this allows relative urls to work)
  app.get('/admin',
    acl_mid('/admin', constants.ACL_ACTION_VIEW),
    function(req, res) {
      res.redirect('/admin/');
    }
  );

  app.get('/admin/',
    acl_mid('/admin', constants.ACL_ACTION_VIEW),
    function(req, res) {
      let user = req.headers[constants.USER_ID_HEADER];
      // logger.info('admin page for ', user);

      let statusCode = 200;
      res.status(
        statusCode
      ).render(path.join(__dirname, '../sentry/views', 'admin-landing'), {
        user: user,
        baseurl: req.relativeRoot,
      });
    }
  );
};
