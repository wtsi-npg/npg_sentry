(function() {
  'use strict';

  function addValueToRow(row, data, cls) {
    var td = document.createElement('td');
    if (cls) {
      td.className = cls;
    }
    td.appendChild(document.createTextNode(data));
    return row.appendChild(td);
  }

  function generateTokenRow(row, values) {
    addValueToRow(row, values.user);
    addValueToRow(row, values.token, 'monospace');

    var cpBtnCell = document.createElement('td');
    var cpBtn = document.createElement('button');
    cpBtn.className = 'cp-btn';
    cpBtn.appendChild(document.createTextNode('Copy'));
    cpBtnCell.appendChild(cpBtn);
    row.appendChild(cpBtnCell);
    addValueToRow(row, values.status, 'token-status');
    if (values.status === 'valid') {
      addValueToRow(row, 'Revoke', 'revoke-link')
        .onclick = function() {
          window.npgauth.revokeToken(values.token);
        };
    } else {
      addValueToRow(row, 'Revoke', 'revoke-link-disabled');
    }
    return row;
  }

  function isRequestOkAndJson(httpRequest) {
    var isOk = httpRequest.status === 200;
    var isJson = httpRequest.getResponseHeader('Content-Type')
      .includes('application/json');
    return isOk && isJson;
  }



  // put functions in custom namespace
  var exports = window.npgauth = {};

  exports.showTokenCreationForm = function showTokenCreationForm() {
    document.getElementById('floating-div').style.visibility = 'visible';
  };

  exports.closeTokenCreationForm = function closeTokenCreationForm() {
    document.getElementById('floating-div').style.visibility = 'hidden';
  };

  exports.createTokenRequest = function createTokenRequest() {
    // adapted from
    // https://developer.mozilla.org/en-US/docs/AJAX/Getting_Started#Step_3_
    // %E2%80%93_A_Simple_Example
    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
      window.alert('Couldn\'t create an AJAX request!!');
      return false;
    }

    httpRequest.onreadystatechange = function gotTokenCreationResponse() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (isRequestOkAndJson(httpRequest)) {
          // TODO wrap in try/catch - crashes if response is not valid JSON
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

  exports.revokeToken = function revokeToken(token) {
    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
      window.alert('Couldn\'t create an AJAX request!!');
      return false;
    }

    var tdElements = document.getElementsByTagName('td');
    var tokenRow;
    for (var i = 0; i < tdElements.length; i++) {
      if (tdElements[i].textContent === token) {
        tokenRow = tdElements[i].parentNode;
        i = undefined;
        break;
      }
    }

    httpRequest.onreadystatechange = function gotTokenRevocationResponse() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (isRequestOkAndJson(httpRequest)) {
          // TODO wrap in try/catch as above TODO
          var response = JSON.parse(httpRequest.responseText);
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

  new window.Clipboard('.cp-btn', {
    target: function(trigger) {
      return trigger.parentNode.previousElementSibling;
    }
  });

  //clipboard.on('success', function(event) {
  //  console.log(event.trigger.parentNode.previousElementSibling);
  //});
}());
