define(['jquery', 'clipboard', 'sentrylib'], function($, Clipboard, sentrylib) {
  'use strict';

  function setupPage() {
    var $floatdiv = $('#floating-div');
    $('#show-token-form-button').on('click', function() {
      var $creationReason = $('#creation-reason');
      if ($creationReason.length) {
        $creationReason.val('');
      }
      $floatdiv.toggle();
    });
    $('#close-token-form-button').on('click', function() {
      $floatdiv.toggle();
    });
    $('#create-token-button').on('click', function() {
      $floatdiv.toggle();
    });

    var app_url = sentrylib.processLocation(window.location);

    $('#create-token-button').on('click', function() {
      var postOpts = {
        url: app_url + 'createToken',
        success: function(data) {
          var $th = $('#table-headers');
          var $row = sentrylib.generateTokenRow($('<tr></tr>'), data);
          $th.after($row);
        },
        error: function(jqXHR) {
          sentrylib.showErrorMsg(
            'Error when submitting token request: ' + jqXHR.status + ': ' + jqXHR.statusText);
        }
      };
      // test if #creation-reason text area exists, only in admin
      if ( $('#creation-reason').length ) {
        var creationReason = $('#creation-reason').val();
        postOpts.data = '{"reason":"' + creationReason + '"}';
        postOpts.contentType = 'application/json';
      }
      $.post(postOpts);
    });

    $.get({
      url: app_url + 'listTokens',
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

    new Clipboard('.cp-btn-active', {
      target: function(trigger) {
        return trigger.parentNode.previousElementSibling;
      }
    });

    var query = sentrylib.parseQuery($(location).attr('href'));
    if (query.create) {
      var $creationReason = $('#creation-reason');
      if ($creationReason.length) {
        $creationReason.val('');
      }
      $floatdiv.toggle();
    }
  }
  return {
    setupPage: setupPage
  };
});
