// Adapted from example at
// http://gruntjs.com/getting-started#an-example-gruntfile

'use strict';

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    cssmin: {
      target: {
        files: {
          'sentry/public/dist/styles.min.css': 'sentry/public/css/styles.css'
        }
      }
    },
    clean: {
      coverage: [ 'coverage' ],
      dist: [ 'sentry/public/dist/*.js*', 'sentry/public/dist/*.css' ],
      docs: [ 'docs' ],
    },
    jsdoc: {
      src: [ 'npg_sentry.js', 'lib/**/*.js' ],
      options: {
        destination: 'docs',
      }
    },
    eslint: {
      target: [
        'Gruntfile.js',
        'npg_sentry.js',
        'lib/*.js',
        'sentry/js/*.js',
        'test/**/*.js',
        '!**/*.min.js', // don't lint minified files
      ]
    },
    jsonlint: {
      pkg: {
        src: [
          'package.json',
          'bower.json',
          'lib/messages.json'
        ]
      }
    },
    qunit: {
      options: {
        timeout: 5000,
        console: true,
        '--debug': true
      },
      all: ['test/client/test*.html']
    },
    jasmine_node: {
      only_test: {
        options: {
          forceExit: true,
          coverage: false,
          jasmine: {
            verbosity: 4,
            spec_dir: 'test/server',
            spec_files: [
              '**/*spec.js'
            ]
          }
        },
        src: ['lib/**/*.js']
      },
      coverage: {
        options: {
          forceExit: true,
          coverage: {
            includeAllSources: true
          },
          jasmine: {
            verbosity: 4,
            spec_dir: 'test/server',
            spec_files: [
              '**/*spec.js'
            ]
          }
        },
        src: ['lib/**/*.js']
      }
    },
    babel: {
      options: {
        sourceMap: true,
        presets: ['env', 'babili']
      },
      dist: {
        files: {
          "sentry/public/dist/auth.js": "sentry/js/auth.js",
          "sentry/public/dist/main.js": "sentry/js/main.js",
        }
      }
    }
  });

  grunt.registerTask('default', ['test']);
  grunt.registerTask('lint', ['eslint']);
  grunt.registerTask('test',
    [
      'jsonlint',
      'lint',
      'jasmine_node:only_test',
      'clean:dist',
      'babel',
      'qunit'
    ]);
  grunt.registerTask('test_coverage',
    [
      'lint',
      'clean:coverage',
      'jasmine_node:coverage',
      'clean:dist',
      'babel',
      'qunit'
    ]);
  grunt.registerTask('dist', ['newer:babel', 'newer:cssmin']);
};
