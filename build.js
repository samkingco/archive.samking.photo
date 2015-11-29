// TODO: Only copy static files when they change so syncing
// with S3 doesn't have to happen every time the app builds

// App config
var config = require('./lib/config');

// Output helpers
var colors = require('colors');
var prettyHrtime = require('pretty-hrtime');
var startTimer = process.hrtime();

// Libs
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var _ = require('underscore');
var swig = require('swig');
var compressor = require('node-minify');

// PostCSS
var postcss = require('postcss');
var mixins = require('postcss-mixins');
var simplevars = require('postcss-simple-vars');
var autoprefixer = require('autoprefixer');
var mqpacker = require('css-mqpacker');
var nestedcss = require('postcss-nested');
var cssnano = require('cssnano');

// Created data things
var getSiteData = require('./lib/get-site-data');
var siteData;





// Cleans up everything in the build dir
function cleanBuildDir() {
    console.log('››'.bold.blue, 'Cleaning up build directory');
    fs.removeSync(config.DEST_DIR);
}


// Renders a page to a template, then a file
function renderPage(siteData, pageToRender) {
    var template = path.join(config.SRC_DIR, pageToRender.template);
    var basePath = pageToRender.basePath;

    var templateContext = {};

    // If the type of page has child pages
    if (typeof pageToRender.pages != 'undefined') {
        // Render each page in the paginated data array
        _.each(pageToRender.pages, function (page) {

            templateContext.page = page;
            templateContext.page.basePath = basePath;

            var url = (page.url)
                ? path.join(config.DEST_DIR, page.url)
                : path.join(config.DEST_DIR, page.currentUrl+'index.html');

            fs.outputFile(
                url,
                swig.renderFile(template, templateContext),
                function (err) {
                    if (err) return console.error(err);
                }
            );
        });
    } else {
        templateContext.page = pageToRender.page;
        templateContext.page.basePath = basePath;

        var url = (pageToRender.url)
            ? path.join(config.DEST_DIR, pageToRender.url)
            : path.join(config.DEST_DIR, basePath+'/index.html');

        fs.outputFile(
            url,
            swig.renderFile(template, templateContext),
            function (err) {
                if (err) return console.error(err);
            }
        );
    }
}


// Builds all the site pages to files
function buildSitePages(callback) {
    console.log('››'.blue.bold, 'Rendering site pages');

    // Set a default context for the template
    swig.setDefaults({ locals: { site: siteData.site }});

    // Render each page to the build dir
    async.forEachOf(siteData.pages, function (pageToRender, pageType, cb) {
        renderPage(siteData, pageToRender);
        cb();
    }, function (err) {
        if (err) return callback(err);
        callback(null);
    });
}


function buildCss(callback) {
    console.log('››'.bold.blue, 'Building CSS');

    var input = path.join(config.SRC_DIR, config.staticfiles.css.src);
    var output = path.join(config.DEST_DIR, siteData.site.staticfiles.css.dest);
    var css = fs.readFileSync(input);

    var processors = [
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
            if (err) return callback(err);
            callback(null);
        });
    });
}


function buildJs(callback) {
    console.log('››'.bold.blue, 'Building JS');

    var input = [
        path.join(config.SRC_DIR, '/static/js/plugins.js'),
        path.join(config.SRC_DIR, config.staticfiles.js.src)
    ];

    var output = path.join(config.DEST_DIR, siteData.site.staticfiles.js.dest);

    new compressor.minify({
        type: 'yui-js',
        fileIn: input,
        fileOut: output,
        callback: function (err, min) {
            fs.outputFile(output, min, function (err) {
                if (err) return callback(err);
                callback(null);
            });
        }
    });
}


function copyStaticFiles(callback) {
    console.log('››'.bold.blue, 'Copying static');

    // TODO: Ignore the templates directory
    fs.copy(config.SRC_DIR, config.DEST_DIR, function (err) {
        if (err) return callback(err);
        callback(null);
    });
}


function copyImages(callback) {
    console.log('››'.blue.bold, 'Copying images');

    fs.copy(
        config.OPT_IMAGES_DIR,
        path.join(config.DEST_DIR, config.IMAGES_DIR),
        function (err) {
            if (err) return callback(err);
            callback(null);
        }
    );
}


var buildTasks = [
        copyImages,
        copyStaticFiles,
        buildJs,
        buildCss,
        buildSitePages
    ];


// Get the site data and kick off the build step
getSiteData(function (err, result) {
    // Set the site data variable that's used by everything else
    siteData = result;

    console.log('››'.bold.green, '----------');
    console.log('››'.bold.blue, 'Building site');

    cleanBuildDir();

    // Build the site in parallel
    async.parallel(buildTasks, function (err, results) {
        if (err) console.error(err);

        // Process timers
        var endTimer = process.hrtime(startTimer);
        var formattedTimer = prettyHrtime(endTimer);
        console.log('››'.bold.green, '----------');
        console.log('››'.bold.green, `Completed in: ${formattedTimer}`);
    });
});
