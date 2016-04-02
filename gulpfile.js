const gulp = require('gulp');

gulp.task('clean', function() {
    const del = require('del');
    return del([
        'build/**/*.js',
        'build/**/*.map'
    ]);
});

gulp.task('build', ['clean'], function() {
    const ts = require('gulp-typescript');
    // const sourcemaps = require('gulp-sourcemaps');

    // Build using config file directly so we can specify a base directory
    const tsConfigFile = require(__dirname + '/tsconfig.json');
    return gulp.src(tsConfigFile.files, {base: 'src'})
        // .pipe(sourcemaps.init())
        .pipe(ts(tsConfigFile.compilerOptions)).js
        // .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('build'));

    // const tsProject = ts.createProject(__dirname + '/tsconfig.json'); //, {noExternalResolve: true});
    // return tsProject.src() // instead of gulp.src(...)
    // 	// .pipe(sourcemaps.init())
    // 	.pipe(ts(tsProject)).js
    // 	// .pipe(sourcemaps.write('.'))
    // 	.pipe(gulp.dest('build'));
});

gulp.task('browserify', ['build'], function() {
    const browserify = require('browserify');
    const source = require('vinyl-source-stream');
    const buffer = require('vinyl-buffer');
    const uglify = require('gulp-uglify');
    const BrowserifyOptions = {
		browserField: false,
		insertGlobalVars: {
			process: function() { return; }
		}
    };
    const UglifyOptions = {
        mangle: false,
        compress: false,
        output: {
            beautify: false
        }
    };
    return browserify('./build/boot.js', BrowserifyOptions)
        .exclude('ui')
        .exclude('ui/vibe')
        .exclude('ajax')
        .exclude('vector2')
        .exclude('settings')
        .bundle()
        .pipe(source('app.js')) // vinyl-source-stream makes the bundle compatible with gulp
        // .pipe(buffer())				// Buffer for uglify
        // .pipe(uglify(UglifyOptions))
        // Output the file
        .pipe(gulp.dest('./src/'));
});
