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
          ' * Copyright (C) 2017 Genome Research Ltd \n' +
          ' */'
      },
      build: {
        src: 'src/js/script.js',
        dest: 'public/js/script.min.js'
      }
    },
    cssmin: {
      target: {
        files: {
          'public/css/styles.min.css': 'src/css/styles.css'
        }
      }
    },
    eslint: {
      target: [
        'Gruntfile.js',
        'app.js',
        'lib/*.js',
        'src/js/*.js'
      ]
    }
  });

  grunt.loadNpmTasks('grunt-newer');

  grunt.registerTask('default', ['lint']);
  grunt.registerTask('lint', ['eslint']);
  grunt.registerTask('minify', ['newer:uglify', 'newer:cssmin']);
};
