'use strict';

const child = require('child_process');

const MongoClient = require('mongodb').MongoClient;
const fse = require('fs-extra');
const tmp = require('tmp');

const model = require('../lib/model');

let p_db;
let tmpobj;
let tmpdir;


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
  setTimeout(function() {
    p_db = MongoClient.connect('mongodb://localhost:27017/test');
    p_db.then(done);
  }, 2500);
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


  it('createToken', function(done) {
    let user = 'user@example.com';
    let p_insert;
    function insert() {
      p_insert = model.createToken(user);
    }
    expect(insert).not.toThrow();

    let p_collection = p_db.then(function(db) {
      return new Promise(function(resolve, reject) {
        db.collection('tokens', function(err, collection) {
          if (err) {
            reject(err);
          } else {
            resolve(collection);
          }
        });
      });
    });

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
    });

    Promise.all([p_countExpectation, p_docExpectation]).then(done);
  });


  it('revokeToken', function(done) {
    let user = 'user@example.com';
    let token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    let p_collection = p_db.then(function(db) {
      return new Promise(function(resolve, reject) {
        db.collection('tokens', function(err, collection) {
          if (err) {
            reject(err);
          } else {
            resolve(collection);
          }
        });
      });
    });

    let p_insertion = p_collection.then(function(collection) {
      return collection.insertOne({user, token, status: 'valid'});
    });

    let p_revoke = p_insertion.then(function() {
      return model.revokeToken(user, token);
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
      done();
    });
  });


  it('listTokens', function(done) {
    let user = 'user@example.com';
    let token1 = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    let token2 = 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

    let p_collection = p_db.then(function(db) {
      return new Promise(function(resolve, reject) {
        db.collection('tokens', function(err, collection) {
          if (err) {
            reject(err);
          } else {
            resolve(collection);
          }
        });
      });
    });

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
      done();
    });
  });

  // TODO test checkTokens
});
