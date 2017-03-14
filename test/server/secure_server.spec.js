'use strict';

const child = require('child_process');
const https = require('https');

const decache = require('decache');
const fse = require('fs-extra');
const MongoClient = require('mongodb').MongoClient;
const tmp = require('tmp');

const test_utils = require('./test_utils.js');
const constants = require('../../lib/constants');
let config = require('../../lib/config');

let BASE_PORT  = 9000;
let PORT_RANGE = 200;
let PORT = Math.floor(Math.random() * PORT_RANGE) + BASE_PORT;
let SERVER_PORT = PORT + 1;

let p_db;
let tmpobj;
let tmpdir;

describe('secure server', function() {

  beforeAll(function(done) {
    // setup a mongo instance
    tmpobj = tmp.dirSync({prefix: 'npg_sentry_test_'});
    tmpdir = tmpobj.name;
    let command =
      `mongod --port ${PORT} --fork --dbpath ${tmpdir} ` +
      `--logpath ${tmpdir}/test_db.log --bind_ip 127.0.0.1`;
    console.log(`\nStarting MongoDB daemon: ${command}`);
    let out = child.execSync(command);
    console.log(`MongoDB daemon started: ${out}`);
    child.execSync(`./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${PORT}`);
    p_db = MongoClient.connect(`mongodb://localhost:${PORT}/test`);
    let p_certs = new Promise(function(resolve, reject) {
      test_utils.create_certificates(
        `${tmpdir}/certs`,
        'CA',
        'server',
        'client',
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
    Promise.all([p_db, p_certs]).catch(fail).then(function() {
      config.provide(() => {
        console.log('server config set');
        return {
          mongourl: `mongodb://localhost:${PORT}/test`,
          sslca: tmpdir + '/certs/CA.cert',
          sslkey: tmpdir + '/certs/server.key',
          sslcert: tmpdir + '/certs/server.cert',
          port: SERVER_PORT,
          loglevel: 'debug',
        };
      });
      done();
    });
  }, 25000);

  afterAll(function(done) {
    child.execSync(
      `mongo 'mongodb://localhost:${PORT}/admin' --eval 'db.shutdownServer()'`
    );
    console.log('\nMongoDB daemon has been switched off');
    fse.remove(tmpdir, function(err) {
      if (err) {
        console.log(`Error removing ${tmpdir}: ${err}`);
      }
      done();
    });
  });

  describe('Running secure server', function() {
    let server;
    beforeAll(function() {
      server = require('../../npg_sentry.js');
    });

    afterAll(function() {
      server.close();
      decache('../../npg_sentry.js');
    });

    it('Runs', function() {
      expect(server instanceof https.Server).toBe(true);
    });

    it('Connection fails without client cert', function(done) {
      let req = https.request({
        hostname: 'localhost',
        port: SERVER_PORT,
        ca: fse.readFileSync(tmpdir + '/certs/CA.cert'),
      }, done.fail);
      req.once('error', (err) => {
        expect(err).toMatch(/EPROTO/);
        expect(err).toMatch(/alert handshake failure/);
        done();
      });
      req.end();
    });

    it('Connection succeeds with client cert', function(done) {
      let req = https.request({
        hostname: 'localhost',
        port: SERVER_PORT,
        ca: fse.readFileSync(tmpdir + '/certs/CA.cert'),
        key: fse.readFileSync(tmpdir + '/certs/client.key'),
        cert: fse.readFileSync(tmpdir + '/certs/client.cert'),
      }, (res) => {
        expect(res.statusCode).toBe(200);
        done();
      });
      req.once('error', done.fail);
      req.setHeader(constants.USER_ID_HEADER, 'user@example.com');
      req.end();
    });

    // TODO this
    it('Connection fails with selfsigned cert');
  });

});