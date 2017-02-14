requirejs.config({
  baseUrl: '../../public/js',
  paths: {
    'qunit': 'bower_components/qunit/qunit/qunit',
    jquery: 'bower_components/jquery/dist/jquery',
    clipboard: 'bower_components/clipboard/dist/clipboard'
  },
});

requirejs(['qunit', 'jquery', 'auth'], function(QUnit, $, auth) {
  'use strict';

  QUnit.config.autostart = false;

  function runTest() {

    QUnit.test('Can toggle token creation form visibility', function(assert) {
      assert.expect(3);

      auth.setupPage();

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
      $.get = function mockAjaxGet(url, cback) {
        assert.strictEqual(url, '/listTokens',
          'Makes request to /listTokens');
        cback(data, 'success');
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
      auth.setupPage();
      $.get = oldAjaxGet;
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
      $.get = function mockAjaxGet(url, cback) {
        assert.strictEqual(url, '/listTokens', 'Makes request to /listTokens');
        cback(data, 'success');
      };
      auth.setupPage();

      var oldAjaxPost = $.post;
      $.post = function mockAjaxPost(opts) {
        assert.strictEqual(opts.url, '/revokeToken',
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
      $.get = function mockAjaxGet(url, cback) {
        cback([], 'success');
      };
      $.post = function mockAjaxPost(url, cback) {
        assert.strictEqual(url, '/createToken',
          'Makes POST request to /createToken');
        assert.strictEqual(
          $('#token-table').children('tbody').children('tr').length, 1,
            'No tokens in table before /createToken request'
          );
        cback(newToken, 'success');

        var tokenTableRows = $('#token-table').children('tbody').children('tr');
        assert.strictEqual(tokenTableRows.length, 2,
          'Table is contains new token after request to /createTokens'
        );
      };
      auth.setupPage();

      $('#show-token-form-button').triggerHandler('click');
      assert.strictEqual($('#floating-div').css('display'), 'block',
        'Click \'Create token\' shows token creation menu');
      $('#create-token-button').triggerHandler('click');

      $.get = oldAjaxGet;
      $.post = oldAjaxPost;
    });

    QUnit.start();
  }

  $(document).ready(runTest);
});
