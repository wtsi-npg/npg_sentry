"use strict";

const assert    = require('assert');

const constants = require('./constants');
const model     = require('./model');

function _dispatch(res, payload, status) {
  res.status(status);
  res.json(payload);
}

function _dispatchSuccess(res, payload){
  _dispatch(res, payload, 200);
}

module.exports.setup = function( app ) {
  app.post('/createToken', function(req, res, next) {
    // Does not expect any request body.
    // Generates a random 32 character string and enters it
    // into the db.
    // Returns the new document as an application/json body.
    let user = req.headers[constants.USER_ID_HEADER];

    model.createToken(
      user,
      constants.WEB_TOKEN_CREATION_MSG
    ).then(function(response) {
      _dispatchSuccess(res, response);
    }, next);
  });

  app.post('/revokeToken', function(req, res, next) {
    // Expects body of application/json containing only the token
    // which is to be rejected. Updates the document in db so that
    // the 'status' field is set to 'revoked'.
    // Returns the updated document in  an application/json body.
    let user = req.headers[constants.USER_ID_HEADER];
    let token;

    try {
      // If content-type header is not set (or set to something not
      // application/json), req.body will be undefined, so trying to access
      // req.body.token will throw an error.
      assert(req.body, 'Request is missing a body');
      assert(req.body.token, 'Request body is missing a token entry');
      token = req.body.token;
    } catch (e) {
      // 400 error because input was malformed
      e.statusCode = 400;
      return next(e);
    }

    model.revokeToken(
      user,
      token,
      constants.WEB_TOKEN_REVOCATION_MSG
    ).then(function(row) {
      _dispatchSuccess(res, row);
    }, next);
  });

  app.post('/validateToken', function(req, res, next) {
    // Expects application/json request body to include a token and
    // an array of group ids. Finds the user owning that token from db,
    // then finds the groups that user is a member of.
    // Returns {ok: true} if user's group membership is a superset of
    // groups specified in request body.
    let token = req.body.token;
    let groups = req.body.groups;

    model.validateToken(groups, token).then(function(decision) {
      _dispatchSuccess(res, {ok: decision});
    }, next);
  });

  app.post('/validateUser', function(req, res, next) {
    let user = req.body.user;
    let groups = req.body.groups;

    model.validateUser(groups, user).then(function(decision) {
      _dispatchSuccess(res, {ok: decision});
    }, next);
  });

  app.get('/listTokens', function(req, res, next) {
    // Returns all documents in db where user matches the
    // x-remote-user header as an application/json array.
    let user = req.headers[constants.USER_ID_HEADER];

    model.listTokens(user).then(function(docs) {
      _dispatchSuccess(res, docs);
    }, next);
  });
};
