'use strict';

function dispatch(res, payload, status) {
  res.status(status);
  res.json(payload);
}

function dispatchSuccess(res, payload){
  dispatch(res, payload, 200);
}

module.exports = {
  dispatch,
  dispatchSuccess
};
