requirejs.config({
  baseUrl: '../../sentry/public/js',
  paths: {
    'qunit': 'bower_components/qunit/qunit/qunit',
    jquery: 'bower_components/jquery/dist/jquery',
    clipboard: 'bower_components/clipboard/dist/clipboard'
  },
});

requirejs(['qunit', 'jquery', 'setup', 'sentrylib'], function(QUnit, $, setup, sentrylib) {
  'use strict';

  QUnit.config.autostart = false;

  function runTest() {

    QUnit.test('Can toggle token creation form visibility', function(assert) {
      assert.expect(3);

      setup.setupPage();

      assert.strictEqual($('#floating-div').css('display'), 'none',
        'Token creation menu starts hidden');

      $('#show-token-form-button').triggerHandler('click');

      assert.strictEqual($('#floating-div').css('display'), 'block',
        'Click \'Create token\' shows token creation menu');

      $('#close-token-form-button').triggerHandler('click');

      assert.strictEqual($('#floating-div').css('display'), 'none',
        'Click \'X\' hides token creation menu');
    });

    QUnit.test('Data is loaded into table on page load', function(assert) {
      assert.expect(5);

      var oldAjaxGet = $.get;
      var data = [
        {
          token: 'abc',
          status: 'valid',
          user: 'user@example.com',
        },
        {
          token: 'xyz',
          status: 'revoked',
          user: 'ruser@example.com',
        },
      ];

      $.get = function mockAjax(opts) {
        assert.strictEqual(opts.url, window.location + 'listTokens',
          'Makes request to /listTokens');
        opts.success(data, 'success');

        var tokenTableRows = $('#token-table').children('tbody').children('tr');
        assert.strictEqual(tokenTableRows.length, 3,
          'Table is not empty after request to /listTokens'
        );
        assert.notOk(tokenTableRows.filter('tr:nth-child(2)').hasClass('disabled-row'));
        assert.ok(tokenTableRows.filter('tr:nth-child(3)').hasClass('disabled-row'));
      };

      assert.strictEqual(
        $('#token-table').children('tbody').children('tr').length, 1,
        'Table is empty before request to /listTokens'
      );
      setup.setupPage();
      $.get = oldAjaxGet;
    });

    QUnit.test('Show error message', function(assert) {
      assert.expect(9);

      assert.strictEqual(
        $('#error-container').children().length, 0,
        'Error container is empty at start');
      sentrylib.showErrorMsg('test error');
      assert.strictEqual(
        $('#error-container').children().length, 1,
        'Error container has an error after showErrorMsg');
      $('.error-msg').triggerHandler('click');
      assert.strictEqual(
        $('#error-container').children().length, 0,
        'Error container is empty again after click event');

      var oldAjaxGet = $.get;
      $.get = function mockAjaxPost(opts) {
        opts.error({status: 500, statusText: '/listTokens test error'});
      };
      setup.setupPage();

      assert.strictEqual(
        $('#error-container').children().length, 1,
        'Error container shows the error from listTokens'
      );
      assert.strictEqual(
        $('#error-container').children().last().text(),
        'Error when getting token list: 500: /listTokens test error',
        'Error message is as expected'
      );
      $.get = oldAjaxGet;

      var oldAjaxPost = $.post;
      $.post = function mockAjaxCreatePost(opts) {
        opts.error({status: 500, statusText: '/createToken test error'});
      };
      $('#create-token-button').triggerHandler('click');
      assert.strictEqual(
        $('#error-container').children().length, 2,
        'Error container shows the error from createToken'
      );
      assert.strictEqual(
        $('#error-container').children().last().text(),
        'Error when submitting token request: 500: /createToken test error',
        'Error message is as expected'
      );
      $.post = oldAjaxPost;

      var data = {
        token: 'abc',
        status: 'valid',
        user: 'user@example.com',
      };
      var $th = $('#table-headers');
      var $row = sentrylib.generateTokenRow($('<tr></tr>'), data);
      $th.after($row);

      var oldAjaxPost = $.post;
      $.post = function mockAjaxRevokePost(opts) {
        opts.error({status: 500, statusText: '/revokeToken test error'});
      };
      $row.children('.revoke-link').triggerHandler('click');
      assert.strictEqual(
        $('#error-container').children().length, 3,
        'Error container shows the error from revokeToken'
      );
      assert.strictEqual(
        $('#error-container').children().last().text(),
        'Error when submitting token revocation: 500: /revokeToken test error',
        'Error message is as expected'
      );
      $.post = oldAjaxPost;
    });

    QUnit.test('Tokens can be revoked', function(assert) {
      assert.expect(6);

      var oldAjaxGet = $.get;
      var validToken = {
        token: 'abc',
        status: 'valid',
        user: 'user@example.com'
      };
      var data = [
        validToken,
        {
          token: 'xyz',
          status: 'revoked',
          user: 'ruser@example.com',
        },
      ];
      $.get = function mockAjaxGet(opts) {
        assert.strictEqual(opts.url, window.location + 'listTokens',
          'Makes request to /listTokens');
        opts.success(data, 'success');
      };
      setup.setupPage();

      var oldAjaxPost = $.post;
      $.post = function mockAjaxPost(opts) {
        assert.strictEqual(opts.url, window.location + 'revokeToken',
          'Makes POST request to /revokeToken');
        assert.strictEqual(opts.data, JSON.stringify({token: 'abc'}),
          'POST request data is JSON containing token to revoke');
        assert.strictEqual(opts.contentType, 'application/json',
          'Content-Type is correctly identified as json');
        assert.strictEqual(opts.dataType, 'json',
          'Data Type is correctly identified as json');
        opts.success(validToken, 'success');
      };

      var revokeLink = $('.revoke-link');
      assert.strictEqual(revokeLink.length, 1);
      revokeLink.triggerHandler('click');

      $.post = oldAjaxPost;
      $.get = oldAjaxGet;
    });

    QUnit.test('Tokens can be created', function(assert) {
      assert.expect(4);

      var newToken = {
        token: 'jkl',
        status: 'valid',
        user: 'nuser@example.com',
      };
      var oldAjaxGet = $.get;
      var oldAjaxPost = $.post;
      $.get = function mockAjaxGet(opts) {
        opts.success([], 'success');
      };
      $.post = function mockAjaxPost(opts) {
        assert.strictEqual(opts.url, window.location + 'createToken',
          'Makes POST request to /createToken');
        assert.strictEqual(
          $('#token-table').children('tbody').children('tr').length, 1,
            'No tokens in table before /createToken request'
          );
        opts.success(newToken, 'success');

        var tokenTableRows = $('#token-table').children('tbody').children('tr');
        assert.strictEqual(tokenTableRows.length, 2,
          'Table contains new token after request to /createTokens'
        );
      };
      setup.setupPage();

      $('#show-token-form-button').triggerHandler('click');
      assert.strictEqual($('#floating-div').css('display'), 'block',
        'Click \'Create token\' shows token creation menu');
      $('#create-token-button').triggerHandler('click');

      $.get = oldAjaxGet;
      $.post = oldAjaxPost;
    });

    QUnit.test('Reason is passed as JSON body when entered', function(assert) {
      assert.expect(3);

      var newToken = {
        token: 'mno',
        status: 'valid',
        user: 'reasoneduser@example.com',
      };
      var oldAjaxGet = $.get;
      var oldAjaxPost = $.post;
      $.get = function mockAjaxGet(opts) {
        opts.success([], 'success');
      };
      $.post = function mockAjaxPost(opts) {
        assert.strictEqual(opts.url, window.location + 'createToken',
          'Makes POST request to /createToken');
        assert.strictEqual(opts.data, '{"reason":"test reason"}',
          'A reason is given');
        opts.success(newToken, 'success');
      };
      setup.setupPage();

      $('#show-token-form-button').triggerHandler('click');
      assert.strictEqual($('#floating-div').css('display'), 'block',
        'Click \'Create token\' shows token creation menu');
      $('#creation-reason').val('test reason');
      $('#create-token-button').triggerHandler('click');

      $.get = oldAjaxGet;
      $.post = oldAjaxPost;
    });

    QUnit.start();
  }

  $(document).ready(runTest);
});
