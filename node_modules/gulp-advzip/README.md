# gulp-advzip [![status](https://api.travis-ci.org/elliot-nelson/gulp-advzip.svg)](https://travis-ci.org/elliot-nelson/gulp-advzip)&nbsp;[![Coverage Status](https://coveralls.io/repos/github/elliot-nelson/gulp-advzip/badge.svg)](https://coveralls.io/github/elliot-nelson/gulp-advzip)

> A gulp wrapper for AdvZIP: minify your zip files

## Install
```sh
$ npm install --save-dev gulp-advzip
```

## Usage

```js
const zip = require('gulp-zip');
const advzip = require('gulp-advzip');

gulp.task('zip', () => {
    gulp.src(['my files...'])
        .pipe(zip('archive.zip'))
        .pipe(advzip())
        .pipe(gulp.dest('out'));
});
```

## API

### advzip([options])

#### options

Type: `Object`

##### optimizationLevel

Type: `number`<br>

Select an optimization level between `0` and `4`. Corresponds to command-line options `-0` through `-4`.

##### iterations

Type: `number`<br>

Optionally specify an additional number of iterations to perform for optimization levels 3 and 4.
May provide marginally better compression, at the cost of additional time. Corresponds to command-line
option '-i N'.

## License

Licensed under MIT. [Full license here &raquo;](LICENSE.txt)

