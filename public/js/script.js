(function() {
  'use strict';

  // put functions in custom namespace
  window.npgauth = {};

  var exports = window.npgauth;

  exports.showTokenCreationForm = function showTokenCreationForm() {
    document.getElementById('floating-div').style.visibility = 'visible';
  };

  exports.closeTokenCreationForm = function () {
    document.getElementById('floating-div').style.visibility = 'hidden';
  };

  exports.createTokenRequest = function () {
    // adapted from
    // https://developer.mozilla.org/en-US/docs/AJAX/Getting_Started#Step_3_%E2%80%93_A_Simple_Example
    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
      window.alert('Couldn\'t create an AAJX request!!');
      return false;
    }

    httpRequest.onreadystatechange = function gotTokenCreationResponse() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200 && httpRequest.getResponseHeader('Content-Type').includes('application/json')) {
          // TODO wrap in try/catch - if response is not valid JSON this will crash
          var response = JSON.parse(httpRequest.responseText);
          var tableHeaders = document.getElementById('table-headers');
          var row = generateTokenRow(document.createElement('tr'), response);
          tableHeaders.parentNode.insertBefore(row, tableHeaders.nextSibling);
        } else {
          window.alert('Failed to enter data to db?!?');
        }
      }
    };

    httpRequest.open('POST', '/createToken');
    httpRequest.send();
  };

  function generateTokenRow(row, values) {
    addValueToRow(row, values.user);
    addValueToRow(row, values.token, 'monospace');
    addValueToRow(row, values.status, 'token-status');
    if (values.status === 'valid') {
      addValueToRow(row, 'Revoke', 'revoke-link')
        .onclick = function(){npgauth.revokeToken(values.token);};
    } else {
      addValueToRow(row, 'Revoke', 'revoke-link-disabled');
    }
    return row;
  }


  function addValueToRow(row, data, cls) {
    var td = document.createElement('td');
    if (cls)
      td.className = cls;
    td.appendChild(document.createTextNode(data));
    return row.appendChild(td);
  }

  exports.revokeToken = function (token) {
    console.log('I want to revoke this token: ' + token);
    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
      window.alert('Couldn\'t create an AJAX request!!');
      return false;
    }

    var tdElements = document.getElementsByTagName('td');
    var tokenRow;
    var i;
    for (i = 0; i < tdElements.length; i++) {
      if (tdElements[i].textContent === token) {
        tokenRow = tdElements[i].parentNode;
        i = undefined;
        break;
      }
    }

    httpRequest.onreadystatechange = function gotTokenRevocationResponse() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200 && httpRequest.getResponseHeader('Content-Type').includes('application/json')) {
          // TODO wrap in try/catch as above TODO
          var response = JSON.parse(httpRequest.responseText);
          // TODO: remove children from tokenRow, then add new row.
          tokenRow.innerHTML = '';
          tokenRow = generateTokenRow(tokenRow, response);
        } else {
          window.alert('Failed to revoke token');
        }
      }
    };

    httpRequest.open('POST', '/revokeToken');
    httpRequest.setRequestHeader('Content-Type', 'application/json');
    httpRequest.send('{"token": "' + token + '"}');
  };
}());
