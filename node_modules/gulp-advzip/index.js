'use strict';

const path = require('path');
const advzipPath = require('advzip-bin');
const PluginError = require('plugin-error');
const childProcess = require('child_process');
const intermediate = require('gulp-intermediate');

function advzip(options) {
    options = options || {};

    // Because the advzip tool does not currently support streaming/piping, we will use
    // the gulp-intermediate wrapper write the current zip buffer to the file system, run
    // the advzip tool on it, and then suck it back in.
    return intermediate({}, (tempDir, cb, files) => {
        let args = ['-z'];

        if (typeof options.optimizationLevel === 'number') {
            args.push('-' + options.optimizationLevel);
        }

        if (typeof options.iterations === 'number') {
            args.push('-i');
            args.push(options.iterations);
        }

        files.forEach(file => args.push(path.join(tempDir, file.relative)));

        let p = childProcess.spawn(advzipPath, args, { stdio: ['inherit', 'pipe', 'inherit'] });
        p.stdout.on('data', buffer => {
            // We want advzip's summary output, especially if the user is recompressing multiple
            // zip files, but we don't want to fill stdout with our (potentially very long)
            // temporary directory names.
            let string = buffer.toString();
            while (string.indexOf(tempDir) > -1) {
                string = string.replace(tempDir + path.sep, '');
            }
            process.stdout.write(string);
        });
        p.on('close', code => {
            if (code === 0) {
                cb();
            } else {
                cb(new PluginError('gulp-advzip', 'Unexpected error while running advzip'));
            }
        });
        p.on('error', error => {
            cb(new PluginError('gulp-advzip', String(error))); 
        });
    });
}

module.exports = advzip;
