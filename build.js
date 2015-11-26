// TODO:
// - Render site pages without repeating myself too much

// App config
const conf = require('./lib/config/config');

// Output helpers
const colors = require('colors');
const prettyHrtime = require('pretty-hrtime');
const startTimer = process.hrtime();

// Libs
const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const _ = require('underscore');
const swig = require('swig');
const compressor = require('node-minify');

// PostCSS
const postcss = require('postcss');
const mixins = require('postcss-mixins');
const simplevars = require('postcss-simple-vars');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const nestedcss = require('postcss-nested');
const cssnano = require('cssnano');

// Created data things
const getSiteData = require('./lib/get-site-data');
var siteData;





// The building of the project thing

function _cleanBuildDir() {
    console.log('››'.bold.blue, 'Cleaning up build directory');
    fs.removeSync(conf.DEST_DIR);
}


function _renderPage(siteData, pageToRender) {
    // Get some useful consts
    const template = path.join(conf.SRC_DIR, pageToRender.template);
    const basePath = pageToRender.basePath;

    // Set a context
    const templateContext = {};

    // If the type of page has child pages
    if (typeof pageToRender.pages != 'undefined') {
        // Render each page in the paginated data array
        _.each(pageToRender.pages, function (page) {

            templateContext.page = page;
            templateContext.page.basePath = basePath;

            if (page.url) {
                var url = path.join(conf.DEST_DIR, page.url);
            } else {
                var url = path.join(conf.DEST_DIR, page.currentUrl+'index.html');
            }

            fs.outputFile(url, swig.renderFile(template, templateContext), function (err) {});
        });
    } else {
        templateContext.page = pageToRender.page;
        templateContext.page.basePath = basePath;

        if (pageToRender.url) {
            var url = path.join(conf.DEST_DIR, pageToRender.url);
        } else {
            var url = path.join(conf.DEST_DIR, basePath+'/index.html');
        }

        fs.outputFile(url, swig.renderFile(template, templateContext), function (err) {});
    }
}


function _buildSitePages(callback) {
    console.log('››'.bold.blue, 'Render site pages');

    // Set a default context
    swig.setDefaults({ locals: { site: siteData.site }});

    // Render each page to the build dir
    async.forEachOf(siteData.pages, function (pageToRender, pageType, cb) {
        console.log('  ››'.blue.bold, `Rendering ${pageType} page`);
        _renderPage(siteData, pageToRender);
        cb();
    }, function (err) {
        callback(null);
    });
}


function _buildCss(callback) {
    console.log('››'.bold.blue, 'Building CSS');
    const input = path.join(conf.SRC_DIR, conf.staticfiles.css.src);
    const output = path.join(conf.DEST_DIR, siteData.site.staticfiles.css.dest);
    const css = fs.readFileSync(input);

    const processors = [
        mixins,
        simplevars,
        nestedcss,
        autoprefixer({ browsers: ['last 2 version'] }),
        mqpacker,
        cssnano
    ];

    postcss(processors)
    .process(css, { from: input, to: output })
    .then(function (result) {
        fs.outputFile(output, result.css, function (err) {
            callback(null);
        });
    });
}


function _buildJs(callback) {
    console.log('››'.bold.blue, 'Building JS');

    const input = path.join(conf.SRC_DIR, conf.staticfiles.js.src);
    const output = path.join(conf.DEST_DIR, siteData.site.staticfiles.js.dest);

    // Array
    new compressor.minify({
        type: 'uglifyjs',
        fileIn: [path.join(conf.SRC_DIR, '/static/js/plugins.js'), input],
        fileOut: output,
        callback: function (err, min) {
            fs.outputFile(output, min, function (err) {
                callback(null);
            });
        }
    });
}


function _copyStaticFiles(callback) {
    console.log('››'.bold.blue, 'Copying static');

    // TODO: Ignore the templates directory
    fs.copy(conf.SRC_DIR, conf.DEST_DIR, function (err) {
        callback(null);
    });
}


function _copyImages(callback) {
    console.log('››'.blue.bold, 'Copying images');

    fs.copy(conf.IMAGES_DIR, path.join(conf.DEST_DIR, conf.IMAGES_DIR), function (err) {
        callback(null);
    });
}


const buildTasks = [
        _copyImages,
        _copyStaticFiles,
        _buildJs,
        _buildCss,
        _buildSitePages
    ];




// Get the image json and start the build
getSiteData(function (err, result) {
    siteData = result[0];

    console.log('››'.bold.green, 'Site data is ready');
    console.log('››››'.bold.green, '----------');
    console.log('››'.bold.blue, 'Building site');

    _cleanBuildDir();

    // Build the site
    async.parallel(buildTasks, function (err, results) {
        // Process timers
        var endTimer = process.hrtime(startTimer);
        var formattedTimer = prettyHrtime(endTimer);
        console.log('››››'.bold.green, '----------');
        console.log('››'.bold.green, `Completed in: ${formattedTimer}`);
    });
});
