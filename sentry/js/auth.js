define(['jquery', 'clipboard'], ($, Clipboard) => {
  'use strict';

  const showErrorMsg = (content) => {
    let $div = $('<div></div>');
    $div.addClass('error-div');
    let $p = $('<p>' + content + '</p>');
    $p.addClass('error-msg');
    $p.on('click', () => {
      $div.remove();
    });
    $div.append($p);
    $('#error-container').append($div);
  };

  const addValueToRow = ($row, data, cls) => {
    let $td = $('<td></td>');
    if (cls) {
      $td.addClass(cls);
    }
    $td.text(data);
    $row.append($td);
    return $td;
  };

  const generateTokenRow = ($row, values) => {
    let valid = values.status === 'valid';
    if (!valid) {
      $row.addClass('disabled-row');
    }

    addValueToRow($row, values.user);
    addValueToRow($row, values.token, 'monospace');

    let $cpBtnCell = $('<td></td>');
    let $cpBtn = $('<button></button>');
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
        .on('click', (e) => {
          /* eslint-disable no-use-before-define */
          revokeToken(values.token, e.target);
          /* eslint-enable no-use-before-define */
        });
    } else {
      addValueToRow($row, 'Revoke');
    }
    return $row;
  };

  const revokeToken = (token, target) => {
    const revokeSuccess = (data) => {
      let $tr = $(target).parent();
      $tr.empty();
      $tr = generateTokenRow($tr, data);
    };

    $.post({
      url: 'revokeToken',
      data: JSON.stringify({token: token}),
      success: revokeSuccess,
      contentType: 'application/json',
      dataType: 'json',
      error: (jqXHR) => {
        showErrorMsg(
          'Error when submitting token revocation: ' + jqXHR.status + ': ' + jqXHR.statusText);
      }
    });
  };

  const parseQuery = (url) => {
    let query = {};
    let queryarr = url.replace(/^.*\?/, '').split(/[&;]/g);

    queryarr.forEach((element) => {
      let kv = element.split('=');
      if (query[kv[0]] === undefined) {
        query[kv[0]] = kv[1] === undefined ? true : kv[1];
      } else {
        query[kv[0]] = [query[kv[0]], kv[1]];
      }
    });

    return query;
  };

  const setupPage = () => {
    let $floatdiv = $('#floating-div');
    $('#show-token-form-button').on('click', () => {
      $floatdiv.toggle();
    });
    $('#close-token-form-button').on('click', () => {
      $floatdiv.toggle(false);
    });
    $('#create-token-button').on('click', () => {
      $floatdiv.toggle(false);
    });

    $('#create-token-button').on('click', () => {
      $.post({
        url: 'createToken',
        success: (data) => {
          let $th = $('#table-headers');
          let $row = generateTokenRow($('<tr></tr>'), data);
          $th.after($row);
        },
        error: (jqXHR) => {
          showErrorMsg(
            'Error when submitting token request: ' + jqXHR.status + ': ' + jqXHR.statusText);
        }
      });
    });

    $.get({
      url: 'listTokens',
      success: (data) => {
        let $table = $('#token-table');
        data.forEach((doc) => {
          let $row = $('<tr></tr>');
          $row = generateTokenRow($row, doc);
          $table.append($row);
        });
      },
      error: (jqXHR) => {
        showErrorMsg(
          'Error when getting token list: ' + jqXHR.status + ': ' + jqXHR.statusText);
      }
    });

    new Clipboard('.cp-btn', {
      target: (trigger) => {
        return trigger.parentNode.previousElementSibling;
      }
    });

    let query = parseQuery($(location).attr('href'));
    if (query.create) {
      $floatdiv.toggle(true);
    }
  };

  return {
    addValueToRow: addValueToRow,
    generateTokenRow: generateTokenRow,
    revokeToken: revokeToken,
    parseQuery: parseQuery,
    setupPage: setupPage,
    showErrorMsg: showErrorMsg,
  };
});
