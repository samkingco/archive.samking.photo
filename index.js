// TODO:
// - Make JS build faster
// - Render urls in a simpler way

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


function _renderIndex (siteList, pageData) {
    var siteInfo = siteList[0].site;

    return swig.renderFile(path.join(conf.SRC_DIR, 'templates/index.html'), {
                site: siteInfo,
                page: pageData
            });
}


function _buildIndexPage (siteList, callback) {
    console.log('  ››'.blue.bold, 'Building index pages');
    _.each(siteList[0].index, function (page) {
        var url = path.join(conf.DEST_DIR, page.url+'/index.html')
        fs.outputFileSync(url, _renderIndex(siteList, page));
    });

    callback(null, siteList);
}


function _renderArchivePage (siteList, pageData) {
    var siteInfo = siteList[0].site;

    return swig.renderFile(path.join(conf.SRC_DIR, 'templates/archive.html'), {
                site: siteInfo,
                page: pageData
            });
}


function _buildArchivePage (siteList, callback) {
    console.log('  ››'.blue.bold, 'Building tags pages');
    fs.outputFileSync(path.join(conf.DEST_DIR, '/archive/index.html'), _renderArchivePage(siteList, siteList[0].archive));

    callback(null, siteList);
}


function _renderTaggedPage (siteList, tag, tagPage) {
    var siteInfo = siteList[0].site;

    return swig.renderFile(path.join(conf.SRC_DIR, 'templates/tagged.html'), {
                site: siteInfo,
                tag: tag,
                page: tagPage
            });
}


function _buildTaggedPage (siteList, callback) {
    console.log('  ››'.blue.bold, 'Building tags pages');
    _.each(siteList[0].tagged, function (tag) {
        _.each(tag.index, function (page) {
            var url = path.join(conf.DEST_DIR, page.url+'/index.html')
            fs.outputFileSync(url, _renderTaggedPage(siteList, tag, page));
        });
    });

    callback(null, siteList);
}


function _buildCss (siteList, callback) {
    console.log('››'.bold.blue, 'Building CSS');
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
    console.log('››'.bold.blue, 'Building JS');
    var input = path.join(conf.SRC_DIR, conf.staticFiles.js.src);
    var output = path.join(conf.DEST_DIR, siteList[0].site.staticFiles.js.dest);
    var js = fs.readFileSync(input);

    // Array
    new compressor.minify({
        type: 'gcc',
        fileIn: [input],
        fileOut: output,
        callback: function (err, min) {
            fs.outputFile(output, min);
            callback(null, siteList);
        }
    });
}


function _copyStaticFiles (siteList, callback) {
    console.log('››'.bold.blue, 'Copying static');
    fs.copySync(path.join(conf.SRC_DIR, '/.htaccess'), path.join(conf.DEST_DIR, '/.htaccess'));
    fs.copySync(path.join(conf.SRC_DIR, '/static/'), path.join(conf.DEST_DIR, '/static'));

    callback(null, siteList);
}


function _copyImages (siteList, callback) {
    console.log('  ››'.blue.bold, 'Copying images');
    fs.copySync(conf.OPT_IMAGES_DIR, path.join(conf.DEST_DIR, conf.IMAGES_DIR));

    callback(null, siteList);
}


var buildComposer = async.compose(_copyImages, _copyStaticFiles, _buildJs, _buildCss, _buildIndexPage, _buildArchivePage, _buildTaggedPage, _cleanBuildDir);




// Get the image json and start the build
getSiteJson(function (err, result) {
    var siteList = result;
    console.log('››'.bold.green, 'Site data is built');
    console.log('››››'.bold.green, '----------');
    console.log('››'.bold.blue, 'Start build steps');

    // Build the site
    buildComposer(siteList, function (err, result) {
        // Process timers
        var endTimer = process.hrtime(startTimer);
        var formattedTimer = prettyHrtime(endTimer);
        console.log('››››'.bold.green, '----------');
        console.log('››'.bold.green, 'Completed in: '+formattedTimer);
    });
});
