requirejs.config({
  baseUrl: 'js',
  paths: {
    jquery: 'bower_components/jquery/dist/jquery',
    clipboard: 'bower_components/clipboard/dist/clipboard'
  }
});

requirejs.onError = function(err) {
  'use strict';
  if (console) {
    console.log(err.requireType);
    console.log('modules: ' + err.requireModules);
  }
  throw err;
};

requirejs([
  'jquery',
  'clipboard'
], function($, Clipboard) {
  'use strict';

  $(document).ready(function() {

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
      var revokeSuccess = function(data, status) {
        if (status === 'success') {
          var $tr = $(target).parent();
          $tr.empty();
          $tr = generateTokenRow($tr, data);
        } else {
          window.alert('failed to revoke token');
        }
      };

      $.post({
        url: '/revokeToken',
        data: JSON.stringify({token: token}),
        success: revokeSuccess,
        contentType: 'application/json',
        dataType: 'json'
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


    var $floatdiv = $('#floating-div');
    $('#show-token-form-button').on('click', function() {
      $floatdiv.toggle();
      console.log('clicked');
    });
    $('#close-token-form-button').on('click', function() {
      $floatdiv.toggle();
    });
    $('#create-token-button').on('click', function() {
      $floatdiv.toggle();
    });
    console.log('click event listening');

    $('#create-token-button').on('click', function() {
      $.post('/createToken', function(data, status) {
        if (status === 'success') {
          var $th = $('#table-headers');
          var $row = generateTokenRow($('<tr></tr>'), data);
          $th.after($row);
        } else {
          window.alert('failed to enter data into db');
        }
      });
    });

    $.get('/listTokens', function(data, status) {
      if (status === 'success') {
        var $table = $('#token-table');
        data.forEach(function(doc) {
          var $row = $('<tr></tr>');
          $row = generateTokenRow($row, doc);
          $table.append($row);
        });
      }
    });

    new Clipboard('.cp-btn', {
      target: function(trigger) {
        return trigger.parentNode.previousElementSibling;
      }
    });

    var query = parseQuery($(location).attr('href'));
    if (query.create) {
      $floatdiv.toggle();
    }

  }());
});
