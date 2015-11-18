// TODO:
// - Render site pages without repeating myself too much

// App config
const conf = require('./config');

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
const simplevars = require('postcss-simple-vars');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const nestedcss = require('postcss-nested');
const cssnano = require('cssnano');

// Created data things
const getSiteJson = require('./getSiteData');





// The building of the project thing

function _cleanBuildDir(siteList, callback) {
    console.log('››'.bold.blue, 'Cleaning up build directory');
    fs.removeSync(conf.DEST_DIR);

    callback(null, siteList);
}


function _renderPage(siteList, pageToRender) {
    console.log('  ››'.blue.bold, `Rendering ${pageToRender} page(s)`);

    // Get the right site and page info
    const siteData = siteList[0];
    const siteInfo = siteData.site;
    const pageType = siteData.sitePages[pageToRender];

    // Get some useful consts
    const template = path.join(conf.SRC_DIR, pageType.template);
    const basePath = pageType.basePath;

    // Set up some context data for the page
    const templateContext = {};
    templateContext.site = siteInfo;

    if (typeof pageType.data != 'undefined') {
        _.each(pageType.data, function (data) {
            const paginatedData = data.pages;

            // Render each page in the paginated data array
            _.each(paginatedData, function (page) {
                // Set the page context
                templateContext.page = page;
                // Path to render the template to
                const url = path.join(conf.DEST_DIR, page.currentUrl, 'index.html');
                // Output the page to a file at the url
                fs.outputFileSync(url, swig.renderFile(template, templateContext));
            });
        });
    } else if (typeof pageType.pages != 'undefined') {
        const paginatedData = pageType.pages;

        // Render each page in the paginated data array
        _.each(paginatedData, function (page) {
            // Set the page context
            templateContext.page = page;
            // Path to render the template to
            const url = path.join(conf.DEST_DIR, page.currentUrl, 'index.html');
            // Output the page to a file at the url
            fs.outputFileSync(url, swig.renderFile(template, templateContext));
        });
    } else {
        // Set the page context
        templateContext.page = pageType.page;
        // Path to render the template to
        const url = path.join(conf.DEST_DIR, basePath, '/index.html');
        // Output the page to a file at the url
        fs.outputFileSync(url, swig.renderFile(template, templateContext));
    }
}


function _buildPages(siteList, callback) {
    _.each(siteList[0].sitePages, function (pageCollection, pageToRender) {
        _renderPage(siteList, pageToRender);
    });

    callback(null, siteList);
}


function _buildCss(siteList, callback) {
    console.log('  ››'.bold.blue, 'Building CSS');
    const input = path.join(conf.SRC_DIR, conf.staticFiles.css.src);
    const output = path.join(conf.DEST_DIR, siteList[0].site.staticFiles.css.dest);
    const css = fs.readFileSync(input);

    const processors = [
        autoprefixer({ browsers: ['last 2 version'] }),
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


function _buildJs(siteList, callback) {
    console.log('  ››'.bold.blue, 'Building JS');
    const input = path.join(conf.SRC_DIR, conf.staticFiles.js.src);
    const output = path.join(conf.DEST_DIR, siteList[0].site.staticFiles.js.dest);
    const js = fs.readFileSync(input);

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


function _copyStaticFiles(siteList, callback) {
    console.log('  ››'.bold.blue, 'Copying static');
    fs.copySync(path.join(conf.SRC_DIR, '/.htaccess'), path.join(conf.DEST_DIR, '/.htaccess'));
    fs.copySync(path.join(conf.SRC_DIR, '/static/'), path.join(conf.DEST_DIR, '/static'));

    callback(null, siteList);
}


function _copyImages(siteList, callback) {
    console.log('  ››'.blue.bold, 'Copying images');
    fs.copySync(conf.OPT_IMAGES_DIR, path.join(conf.DEST_DIR, conf.IMAGES_DIR));

    callback(null, siteList);
}


const buildComposer = async.compose(_copyImages, _copyStaticFiles, _buildJs, _buildCss, _buildPages, _cleanBuildDir);




// Get the image json and start the build
getSiteJson(function (err, result) {
    var siteList = result;
    console.log('››'.bold.green, 'Site data is built');
    console.log('››››'.bold.green, '----------');
    console.log('››'.bold.blue, 'Building site');

    // Build the site
    buildComposer(siteList, function (err, result) {
        // Process timers
        const endTimer = process.hrtime(startTimer);
        const formattedTimer = prettyHrtime(endTimer);
        console.log('››››'.bold.green, '----------');
        console.log('››'.bold.green, `Completed in: ${formattedTimer}`);
    });
});
