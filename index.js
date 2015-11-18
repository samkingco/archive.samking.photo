// TODO:
// - Render site pages without repeating myself too much

// App config
var conf = require('./config');

// Output helpers
var colors = require('colors');
var prettyHrtime = require('pretty-hrtime');
var startTimer = process.hrtime();

// Libs
var fs = require('fs-extra');
var async = require('async');
var path = require('path');
var _ = require('underscore');
var swig = require('swig');
var compressor = require('node-minify');

// PostCSS
var postcss = require('postcss');
var simplevars = require('postcss-simple-vars');
var autoprefixer = require('autoprefixer');
var mqpacker = require('css-mqpacker');
var nestedcss = require('postcss-nested');
var cssnano = require('cssnano');

// Created data things
var getSiteJson = require('./getSiteData');





// The building of the project thing

function _cleanBuildDir (siteList, callback) {
    console.log('››'.bold.blue, 'Cleaning up build directory');
    fs.removeSync(conf.DEST_DIR);

    callback(null, siteList);
}


function _renderPage (siteList, pageToRender) {
    console.log('  ››'.blue.bold, 'Rendering '+pageToRender+' page(s)');

    // Get the right site and page info
    var siteData = siteList[0];
    var siteInfo = siteData.site;
    var pageType = siteData.sitePages[pageToRender];

    // Get some useful vars
    var template = path.join(conf.SRC_DIR, pageType.template);
    var basePath = pageType.basePath;

    // Set up some context data for the page
    var templateContext = {};
    templateContext.site = siteInfo;

    if (typeof pageType.data != 'undefined') {
        _.each(pageType.data, function (data) {
            var paginatedData = data.pages;

            // Render each page in the paginated data array
            _.each(paginatedData, function (page) {
                // Set the page context
                templateContext.page = page;
                // Path to render the template to
                var url = path.join(conf.DEST_DIR, page.currentUrl, 'index.html');
                // Output the page to a file at the url
                fs.outputFileSync(url, swig.renderFile(template, templateContext));
            });
        });
    } else if (typeof pageType.pages != 'undefined') {
        var paginatedData = pageType.pages;

        // Render each page in the paginated data array
        _.each(paginatedData, function (page) {
            // Set the page context
            templateContext.page = page;
            // Path to render the template to
            var url = path.join(conf.DEST_DIR, page.currentUrl, 'index.html');
            // Output the page to a file at the url
            fs.outputFileSync(url, swig.renderFile(template, templateContext));
        });
    } else {
        // Set the page context
        templateContext.page = pageType.page;
        // Path to render the template to
        var url = path.join(conf.DEST_DIR, basePath, '/index.html');
        // Output the page to a file at the url
        fs.outputFileSync(url, swig.renderFile(template, templateContext));
    }
}


function _buildPages (siteList, callback) {
    _.each(siteList[0].sitePages, function (pageCollection, pageToRender) {
        _renderPage(siteList, pageToRender);
    });

    callback(null, siteList);
}


function _buildCss (siteList, callback) {
    console.log('  ››'.bold.blue, 'Building CSS');
    var input = path.join(conf.SRC_DIR, conf.staticFiles.css.src);
    var output = path.join(conf.DEST_DIR, siteList[0].site.staticFiles.css.dest);
    var css = fs.readFileSync(input);

    var processors = [
        autoprefixer({browsers: ['last 2 version']}),
        simplevars,
        nestedcss,
        cssnano
    ];

    postcss(processors)
    .process(css, { from: input, to: output })
    .then(function (result) {
        fs.outputFile(output, result.css);

        callback(null, siteList);
    });
}


function _buildJs (siteList, callback) {
    console.log('  ››'.bold.blue, 'Building JS');
    var input = path.join(conf.SRC_DIR, conf.staticFiles.js.src);
    var output = path.join(conf.DEST_DIR, siteList[0].site.staticFiles.js.dest);
    var js = fs.readFileSync(input);

    // Array
    new compressor.minify({
        type: 'uglifyjs',
        fileIn: [input],
        fileOut: output,
        callback: function (err, min) {
            fs.outputFile(output, min);
            callback(null, siteList);
        }
    });
}


function _copyStaticFiles (siteList, callback) {
    console.log('  ››'.bold.blue, 'Copying static');
    fs.copySync(path.join(conf.SRC_DIR, '/.htaccess'), path.join(conf.DEST_DIR, '/.htaccess'));
    fs.copySync(path.join(conf.SRC_DIR, '/static/'), path.join(conf.DEST_DIR, '/static'));

    callback(null, siteList);
}


function _copyImages (siteList, callback) {
    console.log('  ››'.blue.bold, 'Copying images');
    fs.copySync(conf.OPT_IMAGES_DIR, path.join(conf.DEST_DIR, conf.IMAGES_DIR));

    callback(null, siteList);
}


var buildComposer = async.compose(_copyImages, _copyStaticFiles, _buildJs, _buildCss, _buildPages, _cleanBuildDir);




// Get the image json and start the build
getSiteJson(function (err, result) {
    var siteList = result;
    console.log('››'.bold.green, 'Site data is built');
    console.log('››››'.bold.green, '----------');
    console.log('››'.bold.blue, 'Building site');

    // Build the site
    buildComposer(siteList, function (err, result) {
        // Process timers
        var endTimer = process.hrtime(startTimer);
        var formattedTimer = prettyHrtime(endTimer);
        console.log('››››'.bold.green, '----------');
        console.log('››'.bold.green, 'Completed in: '+formattedTimer);
    });
});
