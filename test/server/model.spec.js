'use strict';

const child = require('child_process');

const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const fse = require('fs-extra');
const tmp = require('tmp');

const model = require('../../lib/model');

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

function testInput(method) {
  it('fails without arguments', function(done) {
    method().then(function() {
      fail();
    }, function(reason) {
      expect(reason instanceof Error).toBe(true);
      expect(reason.message).toBe(method.name + ': undefined argument(s)');
    }).then(done);
  });
}


beforeAll(function(done) {
  // setup a mongo instance
  tmpobj = tmp.dirSync({prefix: 'auth_test_'});
  tmpdir = tmpobj.name;
  let command =
    `mongod --port 27017 --fork --dbpath ${tmpdir} ` +
    `--logpath ${tmpdir}/test_db.log --bind_ip 127.0.0.1`;
  console.log(`\nStarting MongoDB daemon: ${command}`);
  let out = child.execSync(command);
  console.log(`MongoDB daemon started: ${out}`);
  child.execSync('./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p 27017');
  p_db = MongoClient.connect('mongodb://localhost:27017/test');
  p_db.then(done);
}, 25000);


afterAll(function(done) {
  child.execSync(
    `mongo 'mongodb://localhost:27017/admin' --eval 'db.shutdownServer()'`
  );
  console.log('\nMongoDB daemon has been switched off');
  fse.remove(tmpdir, function(err) {
    if (err) {
      console.log(`Error removing ${tmpdir}: ${err}`);
    }
    done();
  });
});


describe('DbError', function() {

  it('is a subclass of Error', function() {
    let err = new model.DbError('something bad');
    expect(err.name).toBe('DbError');
    expect(err instanceof model.DbError).toBe(true);
    expect(err instanceof Error).toBe(true);
    expect(require('util').isError(err)).toBe(true);
    expect(err.stack).toBeDefined();
    expect(err.toString()).toBe('DbError: something bad');
  });

});


describe('exported function', function() {

  beforeEach(function() {
    child.execSync('mongo --eval "db.tokens.drop();db.users.drop();"');
  });


  describe('createToken', function() {

    it('succeeds', function(done) {
      let user = 'user@example.com';
      let p_insert = model.createToken(user, 'test creation');

      let p_collection = p_db.then(getCollection('tokens'));

      let p_cursor = p_collection.then(function(collection) {
        return p_insert.then(function() {
          return new Promise(function(resolve, reject) {
            try {
              resolve(collection.find({user}));
            } catch (err) {
              fail(err);
              reject(err);
            }
          });
        });
      });

      let p_count = p_cursor.then(function(cursor) {
        cursor.rewind();
        return cursor.count();
      });

      let p_countExpectation = p_count.then(function(count) {
        expect(count).toBe(1);
      });

      let p_doc = p_cursor.then(function(cursor) {
        cursor.rewind();
        return cursor.next();
      });

      let p_docExpectation = p_doc.then(function(doc) {
        expect(doc.user).toBe(user);
        expect(doc.token).toMatch(/^[a-zA-Z0-9_-]{32}$/gm);
        expect(doc.status).toBe('valid');
        expect(moment(doc.issueTime).isValid()).toBe(true);
        expect(doc.creationReason).toBe('test creation');
        expect(moment(doc.expiryTime).isValid()).toBe(true);
      });

      Promise.all([p_countExpectation, p_docExpectation])
      .catch(function() {
        fail();
      }).then(done);
    });

    testInput(model.createToken);
  });


  describe('revokeToken', function() {

    it('succeeds on existing token', function(done) {
      let user = 'user@example.com';
      let token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      let p_collection = p_db.then(getCollection('tokens'));

      let p_insertion = p_collection.then(function(collection) {
        return collection.insertOne({user, token, status: 'valid'});
      });

      let p_revoke = p_insertion.then(function() {
        return model.revokeToken(user, token, 'Test revocation');
      });

      let p_cursor = p_revoke.then(function() {
        return p_collection.then(function(collection) {
          return collection.find({token});
        });
      });

      let p_doc = p_cursor.then(function(cursor) {
        return cursor.next();
      });

      p_doc.then(function(doc) {
        expect(doc.user).toBe(user);
        expect(doc.token).toBe(token);
        expect(doc.status).toBe('revoked');
      }, function(reason) {
        fail(reason);
      }).then(done);
    });

    testInput(model.revokeToken);

    it('fails when users do not match', function(done) {
      let creatingUser = 'user@example.com';
      let revokingUser = 'bad@example.com';
      let token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      let p_collection = p_db.then(getCollection('tokens'));

      let p_insertion = p_collection.then(function(collection) {
        return collection.insertOne({creatingUser, token, status: 'valid'});
      });

      let p_revoke = p_insertion.then(function() {
        return model.revokeToken(revokingUser, token, 'Test revocation');
      });

      p_revoke.then(function() {
        // p_revoke should be rejected because users do not match
        fail();
      }, function(reason) {
        expect(reason.message).toEqual('This user does not own this token');
      })
      .then(done);
    });

    it('fails when token does not exist', function(done) {
      let user = 'user@example.com';
      let token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      let p_collection = p_db.then(getCollection('tokens'));

      let p_revoke = p_collection.then(function() {
        return model.revokeToken(user, token, 'Test revocation');
      });

      let p_cursor = p_revoke.then(function() {
        return p_collection.then(function(collection) {
          return collection.find({token});
        });
      });

      let p_doc = p_cursor.then(function(cursor) {
        return cursor.next();
      });

      p_doc.catch(function(reason) {
        expect(reason instanceof model.DbError).toBe(true);
        expect(reason.message).toBe(
          'Unexpected number of documents containing this token'
        );
        done();
      });
    });

  });


  describe('listTokens', function() {

    it('succeeds', function(done) {
      let user = 'user@example.com';
      let token1 = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
      let token2 = 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

      let p_collection = p_db.then(getCollection('tokens'));

      let p_insertion1 = p_collection.then(function(collection) {
        return collection.insertOne({user, token: token1, status: 'valid'});
      });

      let p_insertion2 = p_collection.then(function(collection) {
        return collection.insertOne({user, token: token2, status: 'valid'});
      });

      let p_tokens = Promise.all([p_insertion1, p_insertion2]).then(function() {
        return model.listTokens(user);
      });

      p_tokens.then(function(tokens) {
        expect(tokens instanceof Array).toBe(true);
        let tokenVals = tokens.map(function(row) {
          return row.token;
        });
        expect(tokenVals).toContain(token1);
        expect(tokenVals).toContain(token2);
        let tokenUsers = tokens.every(function(row) {
          return row.user === user;
        });
        expect(tokenUsers).toBe(true);
        let tokensValid = tokens.every(function(row) {
          return row.status === 'valid';
        });
        expect(tokensValid).toBe(true);
      }, function(reason) {
        fail(reason);
      }).then(done);
    });

    it('succeeds despite no tokens', function(done) {
      let user = 'user@example.com';

      let p_collection = p_db.then(getCollection('tokens'));

      let p_noTokens = p_collection.then(function() {
        return model.listTokens(user);
      });

      p_noTokens.then(function(tokens) {
        expect(tokens instanceof Array).toBe(true);
        expect(tokens.length).toBe(0);
      }, function(reason) {
        fail(reason);
      }).then(done);
    });

    testInput(model.listTokens);
  });


  describe('checkToken', function() {

    it('succeeds', function(done) {
      let user = 'user@example.com';
      let token = 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
      let reqdGroups = ['1', '5'];

      let p_tokenCollection = p_db.then(getCollection('tokens'));

      let p_tokenInsertion = p_tokenCollection.then(function(collection) {
        return collection.insertOne({user, token, status: 'valid'});
      });

      let p_userCollection = p_db.then(getCollection('users'));

      let p_userInsertion = p_userCollection.then(function(collection) {
        return collection.insertOne({user, groups: ['1', '2', '5']});
      });

      let p_result =
        Promise.all([p_tokenInsertion, p_userInsertion])
        .then(function() {
          return model.checkToken(reqdGroups, token);
        });

      p_result.then(function(result) {
        expect(result).toBe(true);
        done();
      });
    });

    it('successfully returns false', function(done) {
      let user = 'user@example.com';
      let token = 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
      let reqdGroups = ['1', '5'];

      let p_tokenCollection = p_db.then(getCollection('tokens'));

      let p_tokenInsertion = p_tokenCollection.then(function(collection) {
        return collection.insertOne({user, token, status: 'valid'});
      });

      let p_userCollection = p_db.then(getCollection('users'));

      let p_userInsertion = p_userCollection.then(function(collection) {
        return collection.insertOne({user, groups: ['1', '2', '3']});
      });

      let p_result =
        Promise.all([p_tokenInsertion, p_userInsertion])
        .then(function() {
          return model.checkToken(reqdGroups, token);
        });

      p_result.then(function(result) {
        expect(result).toBe(false);
        done();
      });
    });

    testInput(model.checkToken);

    it('fails when token does not exist', function(done) {
      let user = 'user@example.com';
      let token = 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
      let reqdGroups = ['1', '5'];

      let p_userCollection = p_db.then(getCollection('users'));

      let p_userInsertion = p_userCollection.then(function(collection) {
        return collection.insertOne({user, groups: ['1', '2', '3']});
      });

      let p_result = p_userInsertion.then(function() {
        return model.checkToken(reqdGroups, token);
      });

      p_result.then(function() {
        fail();
      }, function(reason) {
        expect(reason instanceof model.DbError).toBe(true);
        expect(reason.message).toBe(
          'Unexpected number of documents containing this token'
        );
      }).then(done);
    });
  });

});
