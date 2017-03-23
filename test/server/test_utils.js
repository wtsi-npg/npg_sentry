"use strict";

const child = require('child_process');
const fse   = require('fs-extra');
const pem   = require('pem');

const KEY_EXT  = 'key';
const CERT_EXT = 'cert';

/**
 * Start a temporary mongo database with tmpdir as root filesystem and listening
 * in port
 * @param  {String} tmpdir Path to use as system root for the DB
 * @param  {Number} port   Port where to listen
 */
let start_database = ( tmpdir, port ) => {
  let command =
    `mongod --port ${port} --fork --dbpath ${tmpdir} ` +
    `--logpath ${tmpdir}/test_db.log --bind_ip 127.0.0.1`;
  console.log(`\nStarting MongoDB daemon: ${command}`);
  let out = child.execSync(command);
  console.log(`MongoDB daemon started: ${out}`);
  child.execSync(`./test/scripts/wait-for-it.sh -q -h 127.0.0.1 -p ${port}`);
};

/**
 * Stop database running in port
 * @param  {Number} port Port where datatabase is listening
 */
let stop_database = ( port ) => {
  child.execSync(
    `mongo 'mongodb://localhost:${port}/admin' --eval 'db.shutdownServer()'`
  );
  console.log('\nMongoDB daemon has been switched off');
};

/**
 * Creates a self signed certificate and saves the certificate and its key to
 * the path provided.
 * @param  {[type]}   path        Where certificate and key files will be written
 * @param  {[type]}   cert_prefix Prefix for the files
 * @param  {Function} callback    Function to execute when process completes. will
 * get an error as first parameter or null and a certificate object.
 */
let create_self_signed_cert = ( path, cert_prefix, callback) => {
  fse.ensureDirSync(path);

  pem.createCertificate({
    days:       2,
    selfSigned: true
  }, ( err, cert ) => {
    if ( err ) {
      callback( err );
    }
    try {
      fse.writeFileSync(`${path}/${cert_prefix}.${CERT_EXT}`, cert.certificate);
      fse.writeFileSync(`${path}/${cert_prefix}.${KEY_EXT}`, cert.serviceKey);
    } catch (e) {
      callback( e );
    }

    callback( null, cert );
  });
};

/**
 * Creates a simple certificate chain with a CA and two certificates signed by
 * that CA. All certificates will be valid for one day. Two files will be
 * generate per certificate, one for the certificate and one for the key.
 * @param  {[type]}   path         Where certificate and key files will be written
 * @param  {[type]}   ca_prefix    Prefix for the CA files
 * @param  {[type]}   cert1_prefix Prefix for the first certificate files
 * @param  {[type]}   cert2_prefix Prefix for the second certificate files
 * @param  {Function} callback     Function to call after process finishes, will
 * get an error if there was any, or null and three certificate objects if the
 * process was successful.
 */
let create_certificates = (path, ca_prefix, cert1_prefix, cert2_prefix, callback) => {
  fse.ensureDirSync(path);

  let ca_file_name = `${ca_prefix}.${CERT_EXT}`;

  pem.createCertificate({ // For CA
    days:       1,
    commonName: 'CA Certificate'
  }, ( error, cert0) => {
    if (error) {
      callback(error);
    }
    let ca_cert = cert0;

    try {
      fse.writeFileSync( `${path}/${ca_file_name}`, ca_cert.certificate );
    } catch ( e ) {
      callback( e );
    }

    let certInfo = {
      commonName: 'localhost',
      days:1,
      serviceKey:         ca_cert.serviceKey,
      serviceCertificate: ca_cert.certificate,
      serial: Date.now(),
    };

    pem.createCertificate(certInfo, function (error, cert1) { // For cert 1
      if ( error ) {
        callback(error);
      }

      try {
        fse.writeFileSync(`${path}/${cert1_prefix}.${CERT_EXT}`, cert1.certificate);
        fse.writeFileSync(`${path}/${cert1_prefix}.${KEY_EXT}`, cert1.clientKey);
      } catch ( e ) {
        callback( e );
      }

      let certInfo2 = {
        commonName: 'localhost',
        days:1,
        serviceKey:         ca_cert.serviceKey,
        serviceCertificate: ca_cert.certificate,
        serial: Date.now(),
      };

      pem.createCertificate(certInfo2, function (error, cert2) { // For cert 2
        if ( error ) {
          callback(error);
        }

        try {
          fse.writeFileSync(`${path}/${cert2_prefix}.${CERT_EXT}`, cert2.certificate);
          fse.writeFileSync(`${path}/${cert2_prefix}.${KEY_EXT}`, cert2.clientKey);
        } catch ( e ) {
          callback( e );
        }

        callback(null, cert0, cert1, cert2);
      });
    });
  });
};

let getCollection = (collName) => {
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
};

module.exports = {
  create_certificates,
  create_self_signed_cert,
  getCollection,
  start_database,
  stop_database
};
