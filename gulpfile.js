// Initialize modules
const gulp = require('gulp');
const data = require('gulp-data');
const fs = require('fs');
const path = require('path');
const merge = require('gulp-merge-json');
const notifier = require('node-notifier');
const gutil = require('gulp-util');
const browsersync = require('browser-sync').create();
const autoprefixer = require('autoprefixer');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const cleanCSS = require('gulp-clean-css');
const cssnano = require('cssnano');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const twig = require('gulp-twig');
const beautify = require('gulp-beautify');
const zip = require('gulp-zip');
const rename = require('gulp-rename');
const svgstore = require('gulp-svgstore');
const cheerio = require('gulp-cheerio');

const sourcemaps = require('gulp-sourcemaps');
const mode = require('gulp-mode')();


const paths = {
  root: {
    // development
    css: 'src/css/',
    js: 'src/js/',
    template: 'src/templates/',
    public: 'src/public/',
    data: 'src/templates/data/',

    // production
    distJs: 'dist/js/',
    distCss: 'dist/css/',
    templateDist: './dist',
    imagesDist: './dist/images/',

    // final production
    dist: './dist/',
  },
  lib: {
    jquery: 'node_modules/jquery/dist/jquery.js', //@version 3.4.1
  },
};


// browsersync
gulp.task('browser-sync', () => {
  browsersync.init({
    server: {
      baseDir: './dist/',
      proxy: 'localhost:3001',
    },
    browser: "google chrome",
    notify: false,
  });
  
});


// css
gulp.task('css', () => {
  return gulp
    .src([paths.root.css + 'default.scss', paths.root.css + 'style.scss']) 
    .pipe(mode.development(sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .on('error', function (error) {
      gutil.log(gutil.colors.red(error.message));
      notifier.notify({
        title: 'Sass Error',
        message: error.message,
      });
    })
    .pipe(
      postcss([
        autoprefixer({grid: true}),
        cssnano()
      ])
    )
    .pipe(cleanCSS({ level: { 1: { restructureRules: false } } }))
    .pipe(mode.development(sourcemaps.write()))
    .pipe(gulp.dest(paths.root.distCss))
    .pipe(browsersync.stream());
});

// twig
gulp.task('data', () => {
  return gulp
    .src(paths.root.data + '**/*.json')
    .pipe(merge({ fileName: 'data.json' }))
    .pipe(gulp.dest('src/temp'));
});

gulp.task('twig', () => {
  return (
    gulp
      .src(paths.root.template + 'pages/**/*.twig')
      .pipe(
        data(function (file) {
          return JSON.parse(fs.readFileSync(paths.root.data + 'data.json'));
        })
      )
      .pipe(twig())
      .on('error', (error) => {
        gutil.log(gutil.colors.red(error.message));
        notifier.notify({
          title: 'Twig complition faild',
          message: error.message,
        });
      })
      .pipe(beautify.html({ indent_size: 2 }))
      .pipe(gulp.dest(paths.root.templateDist))
      .pipe(
        browsersync.reload({
          stream: true,
        })
      )
  );
});

// homepage
gulp.task('js', () => {
  return gulp
    .src([
      paths.lib.jquery,
      paths.root.js + 'global.js'
    ])
    .pipe(mode.development(sourcemaps.init()))
    .pipe(concat('global.min.js'))
    .on('error', function (error) {
      gutil.log(gutil.colors.red(error.message));
      notifier.notify({
        title: 'global js concat compilation error',
        message: error.message,
      });
    })
    .pipe(
      uglify({
        compress: {
          global_defs: {
            DEBUG: false,
          },
        },
      })
    )
    .pipe(mode.development(sourcemaps.write()))
    .pipe(gulp.dest('./dist/js'))
    .pipe(browsersync.stream());
});



gulp.task('svgstore', function() {
  return gulp
    .src(paths.root.public + 'icons/*.svg')
    .pipe(rename({
      prefix: 'icon-'
    }))
    .pipe(cheerio({
      run: function($) {
        $('[fill]').removeAttr('fill');
      },
      parserOptions: {
        xmlMode: true
      }
    }))
    .pipe(svgstore())
    .pipe(gulp.dest(paths.root.templateDist + '/icons/'));
});


// copy assets
gulp.task('copy', function () {
  return merge([
    gulp
      .src(paths.root.public + 'images/**/*.{gif,jpg,png,svg,ico}')
      .pipe(gulp.dest(paths.root.dist + 'public/images')),
    gulp
      .src(paths.root.public + 'fonts/*')
      .pipe(gulp.dest(paths.root.dist + 'public/fonts')),
    gulp
      .src(paths.root.public + 'favicon/*')
      .pipe(gulp.dest(paths.root.dist + 'public/favicon')),
  ]);
});

// watch
gulp.task('watch', () => {
  gulp.watch([paths.root.css + '**/*'], { ignoreInitial: false }, gulp.series(['css']));
  gulp.watch([paths.root.template + '**/*.twig', paths.root.data + '**/*.json'], gulp.series(['twig', 'data']));
  gulp.watch(paths.root.js + '**/*.js', {ignoreInitial: false}, gulp.series(['js']));
  gulp.watch([
    '**/*.html',
    paths.root.template + '**/*.twig',
    paths.root.css + ['**/*.sass', '**/*.scss'],
    paths.root.js + ['**/*.js'],
  ]);

});

// default gulp
gulp.task(
  'default',
  gulp.series(gulp.parallel(['browser-sync', 'twig', 'watch', 'svgstore']))
  
);

// build project
gulp.task(
  'build',
  gulp.series(gulp.parallel(['css', 'twig', 'css', 'copy']))
);

exports.export = () => (
  gulp.src('src/**/*')
    .pipe(zip('project.zip'))
    .pipe(gulp.dest('dist'))
);
