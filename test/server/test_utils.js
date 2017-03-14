"use strict";

const fse = require('fs-extra');
const pem = require('pem');

const KEY_EXT = 'key';
const CERT_EXT = 'cert';

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

module.exports = {
  create_certificates,
  create_self_signed_cert
};

if ( !module.parent ) {
  create_certificates('./', 'CA', 'cert1', 'cert2', (error) => {
    if ( error ) {
      console.err(`Failed: ${error}`);
    } else {
      console.log('finished certificate chain');
    }
  });
  create_self_signed_cert('./', 'self_signed', (error) => {
    if ( error ) {
      console.err(`Failed: ${error}`);
    } else {
      console.log('finished self signed');
    }
  });
}
