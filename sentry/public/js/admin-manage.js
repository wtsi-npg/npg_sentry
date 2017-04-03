requirejs.config({
  baseUrl: 'js',
  paths: {
    jquery: 'bower_components/jquery/dist/jquery'
  }
});

requirejs(['jquery', 'sentrylib'], function($, sentrylib) {
  'use strict';
  $(document).ready(function() {

    $('#user-select').keypress(function(e) {
      if (e.keyCode === 13) {
        $('#user-make-admin').click();
      }
    });

    $('#user-make-admin').click(function() {
      var uname = $('#user-select').val();
      $.ajax({
        url: window.location + 'addAdmin',
        contentType: 'application/json',
        data: '{"user":"' + uname + '"}',
        error: function(jqXHR) {
          sentrylib.showErrorMsg(
            'Failed to add user as admin: ' + jqXHR.status + ' : ' + jqXHR.statusText);
        },
        method: 'PUT',
        success: function() {
          sentrylib.showSuccessMsg('Admin added!');
        },
      });
    });

    $('#user-remove-admin').click(function() {
      var uname = $('#user-select').val();
      $.ajax({
        url: window.location + 'removeAdmin',
        contentType: 'application/json',
        data: '{"user":"' + uname + '"}',
        error: function(jqXHR) {
          sentrylib.showErrorMsg(
            'Failed to remove user as admin: ' + jqXHR.status + ' : ' + jqXHR.statusText);
        },
        method: 'PUT',
        success: function() {
          sentrylib.showSuccessMsg('Admin removed!');
        },
      });
    });
  });
});
