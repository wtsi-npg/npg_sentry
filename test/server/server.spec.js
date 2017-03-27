'use strict';

const child = require('child_process');
const http  = require('http');

const decache     = require('decache');
const MongoClient = require('mongodb').MongoClient;
const fse         = require('fs-extra');
const request     = require('request');
const tmp         = require('tmp');

const utils   = require('./test_utils');

let config    = require('../../lib/config');
let constants = require('../../lib/constants');

let BASE_PORT   = 9000;
let PORT_RANGE  = 200;
let DB_PORT     = Math.floor(Math.random() * PORT_RANGE) + BASE_PORT;
let SERVER_PORT = Math.floor(Math.random() * PORT_RANGE) + DB_PORT;

let p_db;
let tmpobj;
let tmpdir;

let insertUser = (p_db, user, groups) => {
  let p_userCollection = p_db.then(utils.getCollection(constants.COLLECTION_USERS));

  let p_userInsertion = p_userCollection.then(function(collection) {
    return collection.insertOne({
      user:   user,
      groups: groups
    });
  });

  return p_userInsertion;
};

describe('server', () => {
  beforeAll(function(done) {
    // setup a mongo instance
    tmpobj = tmp.dirSync({prefix: 'npg_sentry_test_'});
    tmpdir = tmpobj.name;
    utils.start_database(tmpdir, DB_PORT);
    p_db = MongoClient.connect(`mongodb://localhost:${DB_PORT}/test`);
    p_db.then(done);
  }, 25000);

  afterAll(function(done) {
    utils.stop_database(DB_PORT);
    fse.remove(tmpdir, function(err) {
      if (err) {
        console.log(`Error removing ${tmpdir}: ${err}`);
      }
      done();
    });
  });

  describe('authorisation', function () {
    let server;

    beforeAll(function(done) {
      decache('../../lib/model');
      config.provide(() => {
        return {
          mongourl: `mongodb://localhost:${DB_PORT}/test`,
          port: SERVER_PORT,
          loglevel: "debug",
          'no-ssl': true
        };
      });
      server = require('../../npg_sentry');
      child.execSync(`./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${SERVER_PORT}`);
      done();
    });

    afterAll(function() {
      server.close();
      decache('../../npg_sentry');
    });

    beforeEach(function(done) {
      utils.drop_database(DB_PORT);
      done();
    });

    describe('user validating', function() {

      it('rejects when validating unknown user', function (done) {
        let groups = ['1', '2', '3'];
        insertUser(p_db, 'someuser@domain.com', groups).then( () => {
          request.post({
            url: `http://localhost:${SERVER_PORT}/validateUser`,
            headers: {
              "content-type":  'application/json',
              "x-remote-user": 'someotheruser@domain.com'
            },
            body: JSON.stringify({
              groups: groups,
              user:   'someotheruser@domain.com'
            })
          }, (err, res) => {
            if(err){
              done.fail(err);
            }
            expect(res.statusCode).not.toBe(200);
            done();
          });
        });
      });

      it('rejects when validating user with different groups', function (done) {
        let user = 'someuser@domain.com';
        insertUser(p_db, user, ['1', '2']).then( () => {
          request.post({
            url: `http://localhost:${SERVER_PORT}/validateUser`,
            headers: {
              "content-type":  'application/json',
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

      it('ok when validating user with correct groups', function (done) {
        let user   = 'someuser@domain.com';
        let groups = ['1', '2', '3'];
        insertUser(p_db, user, groups).then( () => {
          request.post({
            url: `http://localhost:${SERVER_PORT}/validateUser`,
            headers: {
              "content-type":  'application/json',
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
    });

    describe('token management', () => {
      beforeEach(function(done) {
        utils.drop_database(DB_PORT);
        done();
      });

      it('creates a token and lists it', function (done) {
        let token;
        let groups = ['1', '2', '3'];
        let user = 'someuser@domain.com';
        insertUser(p_db, user, groups).then(function() {
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
              let jbody = JSON.parse(body);

              expect(jbody.token).toBeDefined();
              expect(jbody.user).toBe(user);
              token = jbody.token;

              request.get({
                url: `http://localhost:${SERVER_PORT}/listTokens`,
                headers: {
                  "x-remote-user": user
                },
              }, (err2, res2, body2) => {
                  if(err2){
                    done.fail(err2);
                  }
                  expect(res2.statusCode).toBe(200);
                  let jbody2 = JSON.parse(body2);
                  expect(jbody2.length).toBe(1);
                  expect(jbody2[0].token).toBe(token);
                  expect(jbody2[0].status).toBe(constants.TOKEN_STATUS_VALID);
                  expect(jbody2[0].user).toBe(user);
                  done();
              });
          });
        }, done.fail);
      });

      it('creates a token and validates it', function (done) {
        let postData = {
          "groups": [ '1', '2', '3' ]
        };
        let user = 'someuser@domain.com';
        insertUser(p_db, user, postData.groups).then(function() {
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
              let jbody = JSON.parse(body);

              expect(jbody.token).toBeDefined();
              expect(jbody.user).toBe(user);
              postData.token = jbody.token;

              request.post({
                url: `http://localhost:${SERVER_PORT}/validateToken`,
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

      it('test revoke returns error when content-type not set', (done) => {
        request.post({
          url: `http://localhost:${SERVER_PORT}/revokeToken`,
          headers: {
            "x-remote-user": 'someuser@domain.com'
          },
          body: '{"token": "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"}'
        }, (err, res, body) => {
          if(err){
            done.fail(err);
          }
          expect(res.statusCode).toBe(400);
          expect(body).toMatch(http.STATUS_CODES[400]);
          done();
        });
      });

      it('test revoke returns error when body is missing', (done) => {
        request.post({
          url: `http://localhost:${SERVER_PORT}/revokeToken`,
          headers: {
            "content-type": 'application/json',
            "x-remote-user": 'someuser@domain.com'
          },
        }, (err, res, body) => {
          if(err){
            done.fail(err);
          }
          expect(res.statusCode).toBe(400);
          expect(body).toMatch(http.STATUS_CODES[400]);
          done();
        });
      });

      it('test revoke returns error when missing token in json', (done) => {
        request.post({
          url: `http://localhost:${SERVER_PORT}/revokeToken`,
          headers: {
            "content-type": 'application/json',
            "x-remote-user": 'someuser@domain.com'
          },
          body: '{"someothervalue": "1"}'
        }, (err, res, body) => {
          if(err){
            done.fail(err);
          }
          expect(res.statusCode).toBe(400);
          expect(body).toMatch(http.STATUS_CODES[400]);
          done();
        });
      });

      it('test revoke returns error when non json req', (done) => {
        request.post({
          url: `http://localhost:${SERVER_PORT}/revokeToken`,
          headers: {
            "content-type": 'application/json',
            "x-remote-user": 'someuser@domain.com'
          },
          body: '{'
        }, (err, res, body) => {
          if(err){
            done.fail(err);
          }
          expect(res.statusCode).toBe(400);
          expect(body).toMatch(http.STATUS_CODES[400]);
          done();
        });
      });

      it('tests for a revoked token', (done) => {
        let user   = 'someuser@domain.com';
        let groups = [ '1', '2' ];

        insertUser(p_db, user, groups).then( () => {
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
              let jbody = JSON.parse(body);

              expect(jbody.token).toBeDefined();
              expect(jbody.user).toBe(user);
              let postData = {
                token:  jbody.token,
                groups: groups
              };

              request.post({
                url: `http://localhost:${SERVER_PORT}/revokeToken`,
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
                  expect(jbody2.token).toBe(jbody.token);
                  expect(jbody2.status).toBe(constants.TOKEN_STATUS_REVOKED);

                  request.post({
                    url: `http://localhost:${SERVER_PORT}/validateToken`,
                    headers: {
                      "content-type": 'application/json',
                      "x-remote-user": user
                    },
                    body: JSON.stringify(postData)
                  }, (err3, res3, body3) => {
                      if(err3){
                        done.fail(err3);
                      }
                      expect(res3.statusCode).toBe(200);
                      let jbody3 = JSON.parse(body3);
                      expect(jbody3.ok).toBe(false);
                      done();
                  });
              });
          });
        }, done.fail);
      });
    });
  });

  describe('admin', function () {
    let server;

    beforeAll(function(done) {
      decache('../../lib/model');
      config.provide(() => {
        return {
          mongourl: `mongodb://localhost:${DB_PORT}/test`,
          port: SERVER_PORT,
          loglevel: "debug",
          'no-ssl': true
        };
      });
      server = require('../../npg_sentry');
      child.execSync(`./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${SERVER_PORT}`);
      done();
    });

    afterAll(function() {
      server.close();
      decache('../../npg_sentry');
    });

    beforeEach(function(done) {
      utils.drop_database(DB_PORT);
      utils.create_test_acls(DB_PORT, 'someuser@domain.com',
        [constants.ACL_ACTION_VIEW, constants.ACL_ACTION_POST]);
      done();
    });

    it('creates a token for another user and validates it', function (done) {
      let postData = {
        "groups": [ '1', '2', '3' ]
      };
      let user = 'someuser@domain.com';
      let targetUser = 'anotheruser@domain.com';
      insertUser(p_db, targetUser, postData.groups).then(function() {
        request.post({
          url: `http://localhost:${SERVER_PORT}/admin/user/${targetUser}/createToken`,
          headers: {
            "content-type": 'application/json',
            "x-remote-user": user
          },
        }, (err, res, body) => {
            if (err) {
              done.fail(err);
            }

            expect(res.statusCode).toBe(200);
            let jbody = JSON.parse(body);

            expect(jbody.token).toBeDefined();
            expect(jbody.user).toBe(targetUser);
            postData.token = jbody.token;

            request.post({
              url: `http://localhost:${SERVER_PORT}/validateToken`,
              headers: {
                "content-type": 'application/json',
              },
              body: JSON.stringify(postData)
            }, (err2, res2, body2) => {
                if (err2) {
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

    describe("revoking another user's token", () => {
      it('succeeds', (done) => {
        let user       = 'someuser@domain.com';
        let targetUser = 'anotheruser@domain.com';
        let groups     = [ '1', '2' ];

        insertUser(p_db, targetUser, groups).then( () => {
          request.post({
            url: `http://localhost:${SERVER_PORT}/createToken`,
            headers: {
              "content-type": 'application/json',
              "x-remote-user": targetUser
            },
          }, (err, res, body) => {
              if (err) {
                done.fail(err);
              }

              expect(res.statusCode).toBe(200);
              let jbody = JSON.parse(body);

              expect(jbody.token).toBeDefined();
              expect(jbody.user).toBe(targetUser);
              let postData = {
                token:  jbody.token,
                groups: groups
              };

              request.post({
                url: `http://localhost:${SERVER_PORT}/admin/user/${targetUser}/revokeToken`,
                headers: {
                  "content-type": 'application/json',
                  "x-remote-user": user
                },
                body: JSON.stringify(postData)
              }, (err2, res2, body2) => {
                  if (err2) {
                    done.fail(err2);
                  }
                  expect(res2.statusCode).toBe(200);
                  let jbody2 = JSON.parse(body2);
                  expect(jbody2.token).toBe(jbody.token);
                  expect(jbody2.status).toBe(constants.TOKEN_STATUS_REVOKED);

                  request.post({
                    url: `http://localhost:${SERVER_PORT}/validateToken`,
                    headers: {
                      "content-type": 'application/json',
                    },
                    body: JSON.stringify(postData)
                  }, (err3, res3, body3) => {
                      if (err3) {
                        done.fail(err3);
                      }
                      expect(res3.statusCode).toBe(200);
                      let jbody3 = JSON.parse(body3);
                      expect(jbody3.ok).toBe(false);
                      done();
                  });
              });
          });
        }, done.fail);
      });

      it('fails if no token provided', (done) => {
        let user       = 'someuser@domain.com';
        let targetUser = 'anotheruser@domain.com';
        request.post({
          url: `http://localhost:${SERVER_PORT}/admin/user/${targetUser}/revokeToken`,
          headers: {
            "content-type": 'application/json',
            "x-remote-user": user
          },
        }, (err, res, body) => {
            if (err) {
              done.fail(err);
            }
            expect(res.statusCode).toBe(400);
            expect(body).toMatch(http.STATUS_CODES[400]);
            done();
        });
      });
    });

    it("lists another user's tokens", (done) => {
      let postData = {
        "groups": [ '1', '2', '3' ]
      };
      let user = 'someuser@domain.com';
      let targetUser = 'anotheruser@domain.com';
      insertUser(p_db, targetUser, postData.groups).then(function() {
        request.post({
          url: `http://localhost:${SERVER_PORT}/admin/user/${targetUser}/createToken`,
          headers: {
            "content-type": 'application/json',
            "x-remote-user": user
          },
        }, (err, res, body) => {
            if (err) {
              done.fail(err);
            }

            expect(res.statusCode).toBe(200);
            let jbody = JSON.parse(body);

            expect(jbody.token).toBeDefined();
            expect(jbody.user).toBe(targetUser);
            postData.token = jbody.token;

            request.get({
              url: `http://localhost:${SERVER_PORT}/admin/user/${targetUser}/listTokens`,
              headers: {
                "x-remote-user": user,
              },
              body: JSON.stringify(postData)
            }, (err2, res2, body2) => {
                if (err2) {
                  done.fail(err2);
                }
                expect(res2.statusCode).toBe(200);
                let jbody2 = JSON.parse(body2);
                expect(jbody2[0].token).toBe(jbody.token);
                expect(jbody2[0].user).toBe(targetUser);
                expect(jbody2[0].status).toBe('valid');
                done();
            });
        });
      }, done.fail);
    });

    it('renders admin interface', (done) => {
      let user = 'someuser@domain.com';
      let targetUser = 'anotheruser@domain.com';
      request.get({
        url: `http://localhost:${SERVER_PORT}/admin/user/${targetUser}/`,
        headers: {
          "x-remote-user": user,
        },
      }, (err, res, body) => {
        if (err) {
          done.fail(err);
        }

        expect(res.statusCode).toBe(200);
        expect(body).toMatch('<!DOCTYPE html>');
        expect(body).toMatch('<title>Admin Token Management</title>');
        done();
      });
    });

    it('renders admin landing page', (done) => {
      let user = 'someuser@domain.com';
      request.get({
        url: `http://localhost:${SERVER_PORT}/admin/`,
        headers: {
          "x-remote-user": user,
        },
      }, (err, res, body) => {
        if (err) {
          done.fail(err);
        }

        expect(res.statusCode).toBe(200);
        expect(body).toMatch('<!DOCTYPE html>');
        expect(body).toMatch('<title>npg_sentry: Admin</title>');
        done();
      });
    });

    describe('redirects to ensure correct url', () => {
      it('admin interface', (done) => {
        let user = 'someuser@domain.com';
        let targetUser = 'anotheruser@domain.com';
        let urlPath = `/admin/user/${targetUser}`;
        request.get({
          url: `http://localhost:${SERVER_PORT}${urlPath}`,
          headers: {
            "x-remote-user": user,
          },
          followRedirect: false,
        }, (err, res, body) => {
          if (err) {
            done.fail(err);
          }

          expect(res.statusCode).toBe(302);
          expect(body).toMatch(http.STATUS_CODES[302]);
          expect(res.headers['location']).toBe(urlPath + '/');
          done();
        });
      });

      it('admin landing page', (done) => {
        let user = 'someuser@domain.com';
        let urlPath = '/admin';
        request.get({
          url: `http://localhost:${SERVER_PORT}${urlPath}`,
          headers: {
            "x-remote-user": user,
          },
          followRedirect: false,
        }, (err, res, body) => {
          if (err) {
            done.fail(err);
          }

          expect(res.statusCode).toBe(302);
          expect(body).toMatch(http.STATUS_CODES[302]);
          expect(res.headers['location']).toBe(urlPath + '/');
          done();
        });
      });
    });
  });
});
