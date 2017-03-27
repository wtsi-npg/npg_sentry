'use strict';

const assert = require('assert');

function dispatch(res, payload, status) {
  res.status(status);
  res.json(payload);
}

function dispatchSuccess(res, payload){
  dispatch(res, payload, 200);
}

function readToken(req) {
  try {
    // If content-type header is not set (or set to something not
    // application/json), req.body will be undefined, so trying to access
    // req.body.token will throw an error.
    assert(req.body, 'Request is missing a body');
    assert(req.body.token, 'Request body is missing a token entry');
    return req.body.token;
  } catch (e) {
    // 400 error because input was malformed
    e.statusCode = 400;
    return e;
  }
}

module.exports = {
  dispatch,
  dispatchSuccess,
  readToken,
};
