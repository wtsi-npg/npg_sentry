'use strict';

const child = require('child_process');

const decache     = require('decache');
// const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const fse         = require('fs-extra');
const request     = require('request');
const tmp         = require('tmp');


let config    = require('../../lib/config');
let constants = require('../../lib/constants');

let BASE_PORT   = 9000;
let PORT_RANGE  = 200;
let DB_PORT     = Math.floor(Math.random() * PORT_RANGE) + BASE_PORT;
let SERVER_PORT = Math.floor(Math.random() * PORT_RANGE) + DB_PORT;

let p_db;
let tmpobj;
let tmpdir;

function getCollection(collName) {
  return function(db) {
    return new Promise(function(resolve, reject) {
      db.collection(collName, function(err, collection) {
        if (err) {
          reject(err);
        } else {
          resolve(collection);
        }
      });
    });
  };
}

beforeAll(function(done) {
  // setup a mongo instance
  tmpobj = tmp.dirSync({prefix: 'npg_sentry_test_'});
  tmpdir = tmpobj.name;
  let command =
    `mongod --port ${DB_PORT} --fork --dbpath ${tmpdir} ` +
    `--logpath ${tmpdir}/test_db.log --bind_ip 127.0.0.1`;
  console.log(`\nStarting MongoDB daemon: ${command}`);
  let out = child.execSync(command);
  console.log(`MongoDB daemon started: ${out}`);
  child.execSync(`./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${DB_PORT}`);
  p_db = MongoClient.connect(`mongodb://localhost:${DB_PORT}/test`);
  p_db.then(done);
}, 25000);

afterAll(function(done) {
  child.execSync(
    `mongo 'mongodb://localhost:${DB_PORT}/admin' --eval 'db.shutdownServer()'`
  );
  console.log('\nMongoDB daemon has been switched off');
  fse.remove(tmpdir, function(err) {
    if (err) {
      console.log(`Error removing ${tmpdir}: ${err}`);
    }
    done();
  });
});

describe('token man', function () {
  let server;

  beforeAll(function(done) {
    decache('../../lib/model');
    config.provide(() => {
      return {
        mongourl: `mongodb://localhost:${DB_PORT}/test`,
        port: SERVER_PORT,
        loglevel: "debug"
      };
    });
    server = require('../../npg_sentry');
    child.execSync(`./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${SERVER_PORT}`);
    done();
  });

  afterAll(function() {
    server.close();
  });

  beforeEach(function(done) {
    child.execSync(`mongo 'mongodb://localhost:${DB_PORT}/test' --eval "db.tokens.drop();db.users.drop();"`);
    done();
  });

  it('rejects when checking unknown user', function (done) {
    request.post({
      url: `http://localhost:${SERVER_PORT}/checkUser`,
      headers: {
        "content-type": 'application/json',
        "x-remote-user": 'someuser@domain.com'
      },
      body: JSON.stringify({
        groups: ['1', '2', '3'],
        user:   'someuser@domain.com'
      })
    }, (err, res) => {
      if(err){
        done.fail();
      }
      expect(res.statusCode).not.toBe(200);
      done();
    });
  });

  it('rejects when checking user with different groups', function (done) {
    let groups = [ '1', '2' ];
    let user = 'someuser@domain.com';

    let p_userCollection = p_db.then(getCollection(constants.COLLECTION_USERS));

    let p_userInsertion = p_userCollection.then(function(collection) {
      return collection.insertOne({
        user:   user,
        groups: groups });
    });

    p_userInsertion.then(function() {
      request.post({
        url: `http://localhost:${SERVER_PORT}/checkUser`,
        headers: {
          "content-type": 'application/json',
          "x-remote-user": user
        },
        body: JSON.stringify({
          groups: ['1', '2', '3'],
          user:   user
        })
      }, (err, res, body) => {
        expect(res.statusCode).toBe(200);
        let jbody = JSON.parse(body);
        expect(jbody.ok).toBe(false);
        done();
      });
    }, done.fail);
  });

  it('ok when checking user with different groups', function (done) {
    let groups = [ '1', '2', '3' ];
    let user = 'someuser@domain.com';

    let p_userCollection = p_db.then(getCollection(constants.COLLECTION_USERS));

    let p_userInsertion = p_userCollection.then(function(collection) {
      return collection.insertOne({
        user:   user,
        groups: groups });
    });

    p_userInsertion.then(function() {
      request.post({
        url: `http://localhost:${SERVER_PORT}/checkUser`,
        headers: {
          "content-type": 'application/json',
          "x-remote-user": user
        },
        body: JSON.stringify({
          groups: groups,
          user:   user
        })
      }, (err, res, body) => {
        expect(res.statusCode).toBe(200);
        let jbody = JSON.parse(body);
        expect(jbody.ok).toBe(true);
        done();
      });
    }, done.fail);
  });

  it('creates a token and checks it', function (done) {
    let postData = {
      "groups": [ '1', '2', '3' ]
    };
    let user = 'someuser@domain.com';

    let p_userCollection = p_db.then(getCollection(constants.COLLECTION_USERS));

    let p_userInsertion = p_userCollection.then(function(collection) {
      return collection.insertOne({
        user: user,
        groups: postData.groups });
    });

    p_userInsertion.then(function() {
      request.post({
        url: `http://localhost:${SERVER_PORT}/createToken`,
        headers: {
          "content-type": 'application/json',
          "x-remote-user": user
        },
      }, (err, res, body) => {
          if(err){
            done.fail(err);
          }

          expect(res.statusCode).toBe(200);
          console.log(body);
          let jbody = JSON.parse(body);

          expect(jbody.token).toBeDefined();
          expect(jbody.user).toBe(user);
          postData.token = jbody.token;

          request.post({
            url: `http://localhost:${SERVER_PORT}/checkToken`,
            headers: {
              "content-type": 'application/json',
              "x-remote-user": user
            },
            body: JSON.stringify(postData)
          }, (err2, res2, body2) => {
              if(err2){
                done.fail(err2);
              }
              expect(res2.statusCode).toBe(200);
              let jbody2 = JSON.parse(body2);
              expect(jbody2.ok).toBe(true);
              done();
          });
      });
    }, done.fail);
  });
});
