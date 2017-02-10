define(['jquery', 'clipboard'], function($, Clipboard) {
  'use strict';

  function showErrorMsg(content) {
    var $div = $('<div></div>');
    $div.addClass('error-div');
    var $p = $('<p>' + content + '</p>');
    $p.addClass('error-msg');
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
    var valid = values.status === 'valid';
    if (!valid) {
      $row.addClass('disabled-row');
    }

    addValueToRow($row, values.user);
    addValueToRow($row, values.token, 'monospace');

    var $cpBtnCell = $('<td></td>');
    var $cpBtn = $('<button></button>');
    if (valid) {
      $cpBtn.addClass('cp-btn');
    } else {
      $cpBtn.addClass('disabled-btn');
    }
    $cpBtn.text('Copy');
    $cpBtnCell.append($cpBtn);
    $row.append($cpBtnCell);

    addValueToRow($row, values.status, 'token-status');
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

    $.post({
      url: '/revokeToken',
      data: JSON.stringify({token: token}),
      success: revokeSuccess,
      contentType: 'application/json',
      dataType: 'json',
      error: function(jqXHR) {
        showErrorMsg(
          'Error ' + jqXHR.status + ': Couldn\'t submit token revocation');
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
      } else {
        query[kv[0]] = [query[kv[0]], kv[1]];
      }
    });

    return query;
  }

  function setupPage() {
    var $floatdiv = $('#floating-div');
    $('#show-token-form-button').on('click', function() {
      $floatdiv.toggle();
    });
    $('#close-token-form-button').on('click', function() {
      $floatdiv.toggle(false);
    });
    $('#create-token-button').on('click', function() {
      $floatdiv.toggle(false);
    });

    $('#create-token-button').on('click', function() {
      $.post({
        url: '/createToken',
        success: function(data) {
          var $th = $('#table-headers');
          var $row = generateTokenRow($('<tr></tr>'), data);
          $th.after($row);
        },
        error: function(jqXHR) {
          showErrorMsg(
            'Error ' + jqXHR.status + ': Couldn\'t submit token request');
        }
      });
    });

    $.get({
      url: '/listTokens',
      success: function(data) {
        var $table = $('#token-table');
        data.forEach(function(doc) {
          var $row = $('<tr></tr>');
          $row = generateTokenRow($row, doc);
          $table.append($row);
        });
      },
      error: function(jqXHR) {
        showErrorMsg(
          'Error ' + jqXHR.status + ': Couldn\'t list available tokens');
      }
    });


    new Clipboard('.cp-btn', {
      target: function(trigger) {
        return trigger.parentNode.previousElementSibling;
      }
    });

    var query = parseQuery($(location).attr('href'));
    if (query.create) {
      $floatdiv.toggle(true);
    }
  }

  return {
    addValueToRow: addValueToRow,
    generateTokenRow: generateTokenRow,
    revokeToken: revokeToken,
    parseQuery: parseQuery,
    setupPage: setupPage
  };
});
