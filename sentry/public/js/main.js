requirejs.config({
  baseUrl: '/js',
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

requirejs(['jquery', 'setup'], function($, setup) {
  'use strict';
  $(document).ready(function() {
    setup.setupPage();
  });
});
