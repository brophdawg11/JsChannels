var gulp = require('gulp');

gulp.task('default', ['build']);

gulp.task('build', ['test', 'minify', 'docs', 'bump']);

gulp.task('minify', function () {
  var uglify = require('gulp-uglify'),
      rename = require('gulp-rename');

  return gulp.src('channel.js')
             .pipe(uglify())
             .pipe(rename('channel.min.js'))
             .pipe(gulp.dest('.'));
});

gulp.task('docs', function () {
  var docco = require("gulp-docco");

  return gulp.src("channel.js")
             .pipe(docco())
             .pipe(gulp.dest('docs'));
});

gulp.task('bump', function(){
  var bump = require('gulp-bump');

  return gulp.src(['package.json', 'bower.json'])
             .pipe(bump())
             .pipe(gulp.dest('.'));
});

gulp.task('test', function() {
  var qunit = require('gulp-qunit');

  return gulp.src('tests.html')
             .pipe(qunit());
});
