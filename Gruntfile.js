/* jshint -W069 */

sass = require('node-sass');

module.exports = function (grunt) {
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
                    archive:
                        '<%= dirs.dist %><%= pkg.name %>-<%= pkg.version %>.tar.gz',
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
                process: function(content, srcpath) {
                    if (process.env['OVERRIDE_CORONAFRIEND_DOMAIN']) {
                        return content.replace(/api\.coronafriend\.com/g, process.env['OVERRIDE_CORONAFRIEND_DOMAIN']);
                    }
                    return content;
                }
            },
            site: {
                src: [
                    './node_modules/jquery/dist/jquery.js',
                    './node_modules/bootstrap/dist/js/bootstrap.js',
                    './node_modules/leaflet/dist/leaflet-src.js',
                    './node_modules/mapbox-gl/dist/mapbox-gl-unminified.js',
                    './node_modules/mapbox-gl-leaflet/leaflet-mapbox-gl.js',
                    './node_modules/leaflet.locatecontrol/src/L.Control.Locate.js',
                    './src/js/L.Control.ZoomDisplay.js',
                    './src/js/site.js',
                ],
                dest: '<%= dirs.public %>/assets/js/site.js',
            },
        },
        copy: {
            images: {
                files: [
                    {
                        expand: true,
                        cwd: 'src/images',
                        src: ['**/*.png'],
                        dest: '<%= dirs.public %>/assets/images/',
                    },
                    {
                        expand: true,
                        cwd: 'node_modules/leaflet/dist/images',
                        src: ['**/*.png'],
                        dest: '<%= dirs.public %>/assets/leaflet',
                        filter: 'isFile',
                        ext: '.png'
                    },
                    {
                        expand: true,
                        cwd: 'node_modules/mapbox-gl/src/css/svg',
                        src: ['**/*.svg'],
                        dest: '<%= dirs.public %>/assets/mapbox-gl',
                        filter: 'isFile',
                        ext: '.svg'
                    }
                ],
            },
            fonts: {
                files: [
                    {
                        expand: true,
                        cwd:
                            './node_modules/@fortawesome/fontawesome-free/webfonts',
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
            favicons: {
                files: [
                    {
                        expand: true,
                        cwd:
                            './node_modules/@coronafriend/coronafriend-assets/favicons',
                        src: ['**/*.png', '**/*.ico'],
                        dest: '<%= dirs.public %>/assets/favicons',
                    },
                ],
            },
            icons: {
                files: [
                    {
                        expand: true,
                        cwd:
                            './node_modules/@coronafriend/coronafriend-assets/site-icons',
                        src: ['**/*.png', '**/*.svg'],
                        dest: '<%= dirs.public %>/assets/icons',
                    },
                ],
            },
            logos: {
                files: [
                    {
                        expand: true,
                        cwd:
                            './node_modules/@coronafriend/coronafriend-assets/logos',
                        src: ['**/*.png', '**/*.svg'],
                        dest: '<%= dirs.public %>/assets/logos',
                    },
                ],
            },
            leaflets: {
                files: [
                    {
                        expand: true,
                        cwd:
                            './node_modules/@coronafriend/coronafriend-assets/leaflets',
                        src: ['**/*.pdf'],
                        dest: '<%= dirs.public %>/assets/leaflets',
                    },
                ],
            },
            leaflet: {
                options: {
                    process: function(content, srcpath) {
                        // fixup Leaflet image paths ...
                        return content.replace(/images\//g, '/assets/leaflet/');
                    }
                },
                files: [
                    {
                        expand: true,
                        cwd: 'node_modules/leaflet/dist',
                        src: ['*.css'],
                        dest: 'src/sass/leaflet',
                        filter: 'isFile',
                        rename: function(dest, src) {
                            return dest + '/_' + src;
                        },
                        ext: '.scss'

                    }
                ]
            },
        },
        cssmin: {
            options: {
                inline: ['all'],
                sourceMap: true
            },
            site: {
                files: [
                    {
                        src: ['<%= dirs.public %>/assets/css/site.css'],
                        dest: '<%= dirs.public %>/assets/css/site.min.css'
                    }
                ]
            }
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
                    '<%= dirs.public %>/assets/css/site.css':
                        'src/sass/site.scss',
                },
            },
        },
        uglify: {
            options: {
                sourceMap: true,
                sourceMapIncludeSources: true,
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
                tasks: ['sass', 'cssmin:site'],
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
        'cssmin',
        'uglify',
    ]);
    grunt.registerTask('rebuild', ['clean', 'build']);
    grunt.registerTask('dist', ['rebuild', 'compress']);
    grunt.registerTask('nodsstore', function () {
        grunt.file.expand({
            filter: 'isFile',
            cwd: '.',
        }, ['**/.DS_Store']).forEach(function (file) {
            grunt.file.delete(file);
        });
    });
};
