"use strict";

/**
 * Provides expressjs routing for authorisation endpoints.
 * @module lib/authorisation_controller
 * @copyright 2017 Genome Research Ltd
 * @author Andrew Nowak
 */

const assert    = require('assert');

const constants = require('./constants');
const model     = require('./model');
const sentryUtils = require('./sentry_utils');

/**
 * Setup endpoints for the server.
 * Should be called after any necessary global middleware, but before the
 * static file serving handler.
 * @param {express.app} app
 */
module.exports.setup = function( app ) {
  app.post('/createToken', function(req, res, next) {
    // Does not expect any request body.
    // Generates a random 32 character string and enters it
    // into the db.
    // Returns the new document as an application/json body.
    let user = req.headers[constants.USER_ID_HEADER];

    model.createToken(
      user, // token owner
      user, // application user
      constants.WEB_TOKEN_CREATION_MSG
    ).then(function(response) {
      sentryUtils.dispatchSuccess(res, response);
    }, next);
  });


  app.post('/revokeToken', function(req, res, next) {
    // Expects body of application/json containing only the token
    // which is to be rejected. Updates the document in db so that
    // the 'status' field is set to 'revoked'.
    // Returns the updated document in  an application/json body.
    let user = req.headers[constants.USER_ID_HEADER];

    let token = sentryUtils.readToken(req);
    if (token instanceof Error) {
      return next(token);
    }

    model.revokeToken(
      user, // token owner
      user, // application user
      token,
      constants.WEB_TOKEN_REVOCATION_MSG
    ).then(function(row) {
      sentryUtils.dispatchSuccess(res, row);
    }, next);
  });

  app.post('/validateToken', function(req, res, next) {
    // Expects application/json request body to include a token and
    // an array of group ids. Finds the user owning that token from db,
    // then finds the groups that user is a member of.
    // Returns {ok: true} if user's group membership is a superset of
    // groups specified in request body.
    let token;
    let groups;

    try {
      assert(req.body, 'Request is missing a body');
      assert(req.body.token, 'Request body is missing a token entry');
      assert(req.body.groups, 'Request body is missing a list of acceptable groups');

      token = req.body.token;
      groups = req.body.groups;
    } catch (e) {
      e.statusCode = 400;
      return next(e);
    }

    model.validateToken(groups, token).then(function(decision) {
      sentryUtils.dispatchSuccess(res, {ok: decision});
    }, next);
  });

  app.post('/validateUser', function(req, res, next) {
    let user;
    let groups;

    try {
      assert(req.body, 'Request is missing a body');
      assert(req.body.user, 'Request body is missing a user entry');
      assert(req.body.groups, 'Request body is missing a list of acceptable groups');

      user = req.body.user;
      groups = req.body.groups;
    } catch (e) {
      e.statusCode = 400;
      return next(e);
    }

    model.validateUser(groups, user).then(function(decision) {
      sentryUtils.dispatchSuccess(res, {ok: decision});
    }, next);
  });

  app.get('/listTokens', function(req, res, next) {
    // Returns all documents in db where user matches the
    // x-remote-user header as an application/json array.
    let user = req.headers[constants.USER_ID_HEADER];

    model.listTokens(user).then(function(docs) {
      sentryUtils.dispatchSuccess(res, docs);
    }, next);
  });
};
