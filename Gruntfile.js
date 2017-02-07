// Adapted from example at
// http://gruntjs.com/getting-started#an-example-gruntfile

'use strict';

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner:
          '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %>\n' +
          ' * Copyright (C) 2017 Genome Research Ltd\n' +
          ' */'
      },
      build: {
        src: 'public/js/script.js',
        dest: 'public/js/script.min.js'
      }
    },
    cssmin: {
      target: {
        files: {
          'public/css/styles.min.css': 'public/css/styles.css'
        }
      }
    },
    eslint: {
      target: [
        'Gruntfile.js',
        'app.js',
        'lib/*.js',
        'public/js/*[!.min].js',
        'test/*.js'
      ]
    },
    jasmine_nodejs: {
      options: {
        specNameSuffix: 'spec.js',
        useHelpers: false,
        random: false,
        defaultTimeout: 15000,
        stopOnFailure: false,
        traceFatal: 2,
        reporters: {
          console: {
            colors: true,
            cleanStack: 0,
            verbosity: 4,
            listStyle: 'indent',
            activity: false
          }
        }
      },
      server_tests: {
        specs: ['test/*.js']
      }
    }
  });

  grunt.registerTask('default', ['test']);
  grunt.registerTask('lint', ['eslint']);
  grunt.registerTask('test', ['lint', 'jasmine_nodejs']);
  grunt.registerTask('minify', ['newer:uglify', 'newer:cssmin']);
};
