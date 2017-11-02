define(['jquery'], function($) {
  'use strict';

  function showErrorMsg(content) {
    _showMsg(content, 'error-msg');
  }

  function showSuccessMsg(content) {
    _showMsg(content, 'success-msg');
  }

  /**
   * Process a location so the url for the path up to the last '/' is returned.
   * Using this function to produce urls for ajax requests. For some unknown
   * reason relative urls can not be build properly while setting 'url' property
   * of ajax requests.
   *
   * @example
   * window.location = 'https://sentry.server/app_root/some_path/mainpage.html';
   * processLocation(window.location);
   * > 'https://sentry.server/app_root/somepath/'
   * window.location = 'https://sentry.server/app_root/#';
   * processLocation(window.location);
   * > 'https://sentry.server/app_root/'
   * window.location = 'https://sentry.server/app_root/some_path/#';
   * processLocation(window.location);
   * > 'https://sentry.server/app_root/somepath/'
   *
   * @param  {Location} location object to use as base to generate the new url
   * @return {string}            new url
   */
  function processLocation(location) {
    if(!location.origin || !location.pathname) {
      throw 'location must implement origin and pathname';
    }

    return location.origin + location.pathname.substring(
      0, location.pathname.lastIndexOf('/') + 1
    );
  }

  function _showMsg(content, cls) {
    var $div = $('<div></div>');
    $div.addClass('msg-div');
    var $p = $('<p>' + content + '</p>');
    $p.addClass('msg');
    $p.addClass(cls);
    $p.on('click', function() {
      $div.remove();
    });
    $div.append($p);
    $('#error-container').append($div);
  }

  function addValueToRow($row, data, cls) {
    var $td = $('<td></td>');
    if (cls) {
      $td.addClass(cls);
    }
    $td.text(data);
    $row.append($td);
    return $td;
  }

  function generateTokenRow($row, values) {
    var valid    = values.status === 'valid';
    var exp_date = new Date(values.expiryTime);
    var expired  = new Date() > exp_date;

    if (!valid || expired) {
      $row.addClass('disabled-row');
    }

    addValueToRow($row, values.user);
    addValueToRow($row, values.token, 'monospace');

    var $cpBtnCell = $('<td></td>');
    var $cpBtn = $('<button></button>');
    if (valid && !expired) {
      $cpBtn.addClass('cp-btn cp-btn-active');
    } else {
      $cpBtn.addClass('cp-btn cp-btn-disabled');
    }
    $cpBtn.text('Copy');
    $cpBtnCell.append($cpBtn);
    $row.append($cpBtnCell);

    addValueToRow($row, values.status, 'token-status');
    addValueToRow($row, exp_date.toString(), 'token-expiry');
    if (valid) {
      addValueToRow($row, 'Revoke', 'revoke-link')
        .on('click', function(e) {
          /* eslint-disable no-use-before-define */
          revokeToken(values.token, e.target);
          /* eslint-enable no-use-before-define */
        });
    } else {
      addValueToRow($row, 'Revoke');
    }
    return $row;
  }

  function revokeToken(token, target) {
    var revokeSuccess = function(data) {
      var $tr = $(target).parent();
      $tr.empty();
      $tr = generateTokenRow($tr, data);
    };

    var app_url = processLocation(window.location);

    $.post({
      url: app_url + 'revokeToken',
      data: JSON.stringify({token: token}),
      success: revokeSuccess,
      contentType: 'application/json',
      dataType: 'json',
      error: function(jqXHR) {
        showErrorMsg(
          'Error when submitting token revocation: ' + jqXHR.status + ': ' + jqXHR.statusText);
      }
    });
  };

  function parseQuery(url) {
    var query = {};
    var queryarr = url.replace(/^.*\?/, '').split(/[&;]/g);

    queryarr.forEach(function(element) {
      var kv = element.split('=');
      if (query[kv[0]] === undefined) {
        query[kv[0]] = kv[1] === undefined ? true : kv[1];
      } else if (query[kv[0]] instanceof Array) {
        query[kv[0]].push(kv[1]);
      } else {
        query[kv[0]] = [query[kv[0]], kv[1]];
      }
    });

    return query;
  }


  return {
    addValueToRow:    addValueToRow,
    generateTokenRow: generateTokenRow,
    revokeToken:      revokeToken,
    parseQuery:       parseQuery,
    processLocation:  processLocation,
    showErrorMsg:     showErrorMsg,
    showSuccessMsg:   showSuccessMsg,
  };
});
