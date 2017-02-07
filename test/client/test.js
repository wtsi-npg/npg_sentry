'use strict';

requirejs.config({
  baseUrl: '../../public/js',
  paths: {
    'qunit': 'bower_components/qunit/qunit/qunit',
    jquery: 'bower_components/jquery/dist/jquery',
    clipboard: 'bower_components/clipboard/dist/clipboard'
  },
});

requirejs(['qunit', 'jquery', 'auth'], function(QUnit, $, auth) {
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
      assert.expect(3);

      var oldAjaxGet = $.get;
      var data = [
        {
          token: 'abc',
          status: 'valid',
          user: 'user@example.com'
        }
      ];
      $.get = function mockAjax(url, cback) {
        assert.strictEqual(url, '/listTokens',
          'Makes request to /listTokens');
        cback(data, 'success');
        assert.strictEqual(
          $('#token-table').children('tbody').children('tr').length, 2,
          'Table is not empty after request to /listTokens'
        );
      };
      assert.strictEqual(
        $('#token-table').children('tbody').children('tr').length, 1,
        'Table is empty before request to /listTokens'
      );
      auth.setupPage();
      $.get = oldAjaxGet;
    });
    QUnit.start();
  }

  $(document).ready(runTest);
});
