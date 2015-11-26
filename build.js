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

var siteList;





// The building of the project thing

function _cleanBuildDir() {
    console.log('  ››'.bold.blue, 'Cleaning up build directory');
    fs.removeSync(conf.DEST_DIR);
}


function _renderPage(siteList, pageToRender) {
    console.log('    ››'.blue.bold, `Rendering ${pageToRender} page(s)`);

    // Get the right site and page info
    const siteData = siteList[0];
    const pageType = siteData.sitePages[pageToRender];

    // Get some useful consts
    const template = path.join(conf.SRC_DIR, pageType.template);
    const basePath = pageType.basePath;

    // Set up some context data for the page
    const templateContext = {};

    if (typeof pageType.data != 'undefined') {
        _.each(pageType.data, function (data) {
            const paginatedData = data.pages;

            // Render each page in the paginated data array
            _.each(paginatedData, function (page) {
                // Set the page context
                templateContext.page = page;
                templateContext.page.basePath = basePath;
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
            templateContext.page.basePath = basePath;
            // Path to render the template to
            const url = path.join(conf.DEST_DIR, page.currentUrl, 'index.html');
            // Output the page to a file at the url
            fs.outputFileSync(url, swig.renderFile(template, templateContext));
        });
    } else {
        // Set the page context
        templateContext.page = pageType.page;
        templateContext.page.basePath = basePath;
        // Path to render the template to
        const url = path.join(conf.DEST_DIR, basePath, '/index.html');
        // Output the page to a file at the url
        fs.outputFileSync(url, swig.renderFile(template, templateContext));
    }
}


function _renderFlatPage(siteList, pageToRender) {
    console.log('    ››'.blue.bold, `Rendering flatpage: ${pageToRender.url}`);

    // Get the right site and page info
    const siteData = siteList[0];

    // Get some useful consts
    const template = path.join(conf.SRC_DIR, pageToRender.template);

    // Set up some context data for the page
    const templateContext = {};
    templateContext.page = {
        basePath: pageToRender.basePath
    };

    // Path to render the template to
    const url = path.join(conf.DEST_DIR, pageToRender.url);
    // Output the page to a file at the url
    fs.outputFileSync(url, swig.renderFile(template, templateContext));
}


function _buildSitePages(callback) {
    console.log('  ››'.bold.blue, 'Render site pages');

    swig.setDefaults({ locals: { site:siteList[0].site }});

    _.each(siteList[0].sitePages, function (pageCollection, pageToRender) {
        _renderPage(siteList, pageToRender);
    });

    console.log('  ››'.bold.blue, 'Render flat pages');

    _.each(siteList[0].site.flatpages, function (pageToRender) {
        _renderFlatPage(siteList, pageToRender);
    });
}


function _buildCss(callback) {
    console.log('    ››'.bold.blue, 'Building CSS');
    const input = path.join(conf.SRC_DIR, conf.staticFiles.css.src);
    const output = path.join(conf.DEST_DIR, siteList[0].site.staticFiles.css.dest);
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
    console.log('    ››'.bold.blue, 'Building JS');

    const input = path.join(conf.SRC_DIR, conf.staticFiles.js.src);
    const output = path.join(conf.DEST_DIR, siteList[0].site.staticFiles.js.dest);

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
    console.log('    ››'.bold.blue, 'Copying static');

    // TODO: Ignore the templates directory
    fs.copy(conf.SRC_DIR, conf.DEST_DIR, function (err) {
        callback(null);
    });
}


function _copyImages(callback) {
    console.log('    ››'.blue.bold, 'Copying images');

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
    siteList = result;
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
