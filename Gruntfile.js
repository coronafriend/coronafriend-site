/* jshint -W069 */

sass = require('node-sass');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    dirs: {
      dist: 'dist/',
      public: 'dist/coronafriend-site/public',
    },
    clean: {
      dist: ['<%= dirs.dist %>'],
    },
    compress: {
      dist: {
        options: {
          archive: '<%= dirs.dist %><%= pkg.name %>-<%= pkg.version %>.tar.gz',
          mode: 'tgz',
        },
        files: [
          {
            expand: true,
            cwd: '<%= dirs.dist %>',
            src: ['<%= pkg.name%>/**/*'],
          },
        ],
      },
    },
    concat: {
      options: {
        sourceMap: true,
      },
      site: {
        src: [
          // './node_modules/jquery/dist/jquery.js',
          // './node_modules/bootstrap/dist/js/bootstrap.js',
          './node_modules/leaflet/dist/leaflet-src.js',
          './node_modules/mapbox-gl/dist/mapbox-gl-unminified.js',
          './node_modules/mapbox-gl-leaflet/leaflet-mapbox-gl.js',
          './node_modules/leaflet.locatecontrol/src/L.Control.Locate.js',
          './src/js/site.js',
        ],
        dest: '<%= dirs.public %>/assets/js/site.js',
      },
    },
    copy: {
      docs: {
        files: [
          {
            expand: true,
            cwd: 'src/docs',
            src: ['**/*'],
            dest: '<%= dirs.public %>/assets/docs/',
          },
        ],
      },
      fonts: {
        files: [
          {
            expand: true,
            cwd: './node_modules/@fortawesome/fontawesome-free/webfonts',
            src: ['**/*'],
            dest: '<%= dirs.public %>/assets/fonts/',
          },
        ],
      },
      html: {
        files: [
          {
            expand: true,
            cwd: 'src/html',
            src: ['**/*'],
            dest: '<%= dirs.public %>/',
          },
        ],
      },
      images: {
        files: [
          {
            expand: true,
            cwd: 'src/images',
            src: ['**/*'],
            dest: '<%= dirs.public %>/assets/images/',
          },
        ],
      },
    },
    sass: {
      options: {
        implementation: sass,
        outputStyle: 'expanded',
        indentType: 'tab',
        indentWidth: 1,
        includePaths: [
          './node_modules/bootstrap/scss',
          './node_modules/@fortawesome/fontawesome-free/scss',
          './node_modules/leaflet.locatecontrol/src/',
          './src/sass',
        ],
      },
      site: {
        files: {
          '<%= dirs.public %>/assets/css/site.css': 'src/sass/site.scss',
        },
      },
    },
    uglify: {
      options: {
        sourceMap: true,
        sourceMapIncludeSources: true,
        sourceMapIn: '<%= dirs.public %>/assets/js/site.js.map',
      },
      site: {
        files: [
          {
            src: ['<%= dirs.public %>/assets/js/site.js'],
            dest: '<%= dirs.public %>/assets/js/site.min.js',
          },
        ],
      },
    },
    watch: {
      options: {
        livereload: true,
      },
      docs: {
        files: ['src/docs/**/*'],
        tasks: ['copy:docs'],
      },
      grunt: {
        files: ['Gruntfile.js', 'package.json'],
        tasks: ['clean', 'build'],
      },
      html: {
        files: ['src/html/**/*'],
        tasks: ['copy:html'],
      },
      images: {
        files: ['src/images/**/*'],
        tasks: ['copy:images'],
      },
      js: {
        files: ['src/js/**/*.js'],
        tasks: ['concat:site', 'uglify:site'],
      },
      sass: {
        files: ['src/sass/**/*.scss'],
        tasks: ['sass'],
      },
    },
  });

  grunt.registerTask('default', [
    'openport:watch.options.livereload:35729',
    'watch',
  ]);
  grunt.registerTask('build', [
    'nodsstore',
    'copy',
    'concat',
    'sass',
    'uglify',
  ]);
  grunt.registerTask('rebuild', ['clean', 'build']);
  grunt.registerTask('dist', ['rebuild', 'compress']);
  grunt.registerTask('nodsstore', function() {
    grunt.file
      .expand(
        {
          filter: 'isFile',
          cwd: '.',
        },
        ['**/.DS_Store']
      )
      .forEach(function(file) {
        grunt.file.delete(file);
      });
  });
};
