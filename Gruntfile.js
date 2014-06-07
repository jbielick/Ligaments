module.exports = function(grunt) {

	grunt.initConfig({
		uglify: {
			options: {
				mangle: false
			},
			main: {
				files: {
					'src/ligaments.min.js': 'src/ligaments.js'
				}
			}
		},
		copy: {
			dist: {
				files: [{
					expand: true,
					flatten: true,
					src: ['src/*.js'],
					dest: 'dist/'
				}]
			}
		},
		qunit: {
			files: ['TEST/index.html']
		},
		watch: {
			files: ['src/**/*.coffee'],
			tasks: ['build']
		},
		coffee: {
			compile: {
				files: {
					'src/ligaments.js': 'src/ligaments.coffee'
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-coffee');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.registerTask('test', ['qunit']);

	grunt.registerTask('build', ['coffee:compile', 'uglify:main', 'copy:dist']);

	grunt.registerTask('default', ['build', 'watch']);

}