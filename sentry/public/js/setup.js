define(['jquery', 'clipboard', 'sentrylib'], function($, Clipboard, sentrylib) {
  'use strict';

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
        url: window.location + 'createToken',
        success: function(data) {
          var $th = $('#table-headers');
          var $row = sentrylib.generateTokenRow($('<tr></tr>'), data);
          $th.after($row);
        },
        error: function(jqXHR) {
          sentrylib.showErrorMsg(
            'Error when submitting token request: ' + jqXHR.status + ': ' + jqXHR.statusText);
        }
      });
    });

    $.get({
      url: window.location + 'listTokens',
      success: function(data) {
        var $table = $('#token-table');
        data.forEach(function(doc) {
          var $row = $('<tr></tr>');
          $row = sentrylib.generateTokenRow($row, doc);
          $table.append($row);
        });
      },
      error: function(jqXHR) {
        sentrylib.showErrorMsg(
          'Error when getting token list: ' + jqXHR.status + ': ' + jqXHR.statusText);
      }
    });

    new Clipboard('.cp-btn', {
      target: function(trigger) {
        return trigger.parentNode.previousElementSibling;
      }
    });

    var query = sentrylib.parseQuery($(location).attr('href'));
    if (query.create) {
      $floatdiv.toggle(true);
    }
  }
  return {
    setupPage: setupPage
  };
});
