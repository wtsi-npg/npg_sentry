'use strict';

const child = require('child_process');

const decache     = require('decache');
const MongoClient = require('mongodb').MongoClient;
const fse         = require('fs-extra');
const request     = require('request');
const tmp         = require('tmp');

const test_utils  = require('./test_utils');

let config = require('../../lib/config');


let BASE_PORT   = 9000;
let PORT_RANGE  = 200;
let DB_PORT     = Math.floor(Math.random() * PORT_RANGE) + BASE_PORT;
let SERVER_PORT = Math.floor(Math.random() * PORT_RANGE) + DB_PORT;

let p_db;
let tmpobj;
let tmpdir;

describe('acls', () => {
  beforeAll(function(done) {
    // setup a mongo instance
    tmpobj = tmp.dirSync({prefix: 'npg_sentry_test_'});
    tmpdir = tmpobj.name;
    test_utils.start_database(tmpdir, DB_PORT);
    p_db = MongoClient.connect(`mongodb://localhost:${DB_PORT}/test`);
    p_db.then(done);
  }, 25000);

  afterAll(function(done) {
    decache('../../lib/model');
    test_utils.stop_database(DB_PORT);
    fse.remove(tmpdir, function(err) {
      if (err) {
        console.log(`Error removing ${tmpdir}: ${err}`);
      }
      done();
    });
  });

  describe('admin', function () {
    let server;

    beforeAll(function(done) {
      decache('../../npg_sentry.js');
      config.provide(() => {
        return {
          mongourl: `mongodb://localhost:${DB_PORT}/test`,
          port: SERVER_PORT,
          'no-ssl': true
        };
      });
      server = require('../../npg_sentry');
      child.execSync(`./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${SERVER_PORT}`);
      done();
    });

    afterAll(function() {
      server.close();
      decache('../../npg_sentry.js');
    });

    it('gets a 403', (done) => {
      let req = request.get({
        url: `http://localhost:${SERVER_PORT}/admin/`,
        headers: {
          "content-type":  'application/json',
          "x-remote-user": 'someotheruser@domain.com'
        },
      }, (err, res) => {
        if (err) {
          done.fail(err);
        }
        expect(res.statusCode).toBe(403);
        done();
      });
      req.on('error', done.fail);
    });

    it('gets a 401 when unauthenticated', (done) => {
      let req = request.get({
        url: `http://localhost:${SERVER_PORT}/admin/`,
        headers: {
          "content-type": "application/json"
        },
      }, (err, res) => {
        if (err) {
          done.fail(err);
        }
        expect(res.statusCode).toBe(401);
        done();
      });
      req.on('error', done.fail);
    });

    // pending until administrators list is not hardcoded
    xit('gets a 200', (done) => {
      request.get({
        url: `http://localhost:${SERVER_PORT}/admin/`,
        headers: {
          "content-type":  'application/json',
          "x-remote-user": 'someuser@domain.com'
        },
      }, (err, res) => {
        if (err) {
          done.fail(err);
        }
        expect(res.statusCode).toBe(200);
        done();
      });
    });
  });
});
