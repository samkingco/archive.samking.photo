// App config
var conf = require('./config');

// Output helpers
var colors = require('colors');
var prettyHrtime = require('pretty-hrtime');
var startTimer = process.hrtime();

// Libs
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');
var swig = require('swig');

// Created data things
var getSiteJson = require('./getSiteData');





// The building of the project thing
function _renderIndex (siteList, pageData) {
    var siteInfo = siteList[0].site;

    return swig.renderFile(path.join(conf.SRC_DIR, 'templates/index.html'), {
                site: siteInfo,
                page: pageData
            });
}


function _renderTaggedPage (siteList, tag, tagPage) {
    var siteInfo = siteList[0].site;

    return swig.renderFile(path.join(conf.SRC_DIR, 'templates/tagged.html'), {
                site: siteInfo,
                tag: tag,
                page: tagPage
            });
}


function _copyImages (dest) {
    fs.copySync(conf.OPT_IMAGES_DIR, path.join(dest, conf.IMAGES_DIR));
}


function _copyStaticFiles (dest, siteList) {
    fs.copySync(path.join(conf.SRC_DIR, '/static/'), path.join(dest, '/static'));

    _.each(conf.staticFiles, function (file, index) {
        var oldName = path.join(dest, '/'+file);
        var newName = path.join(dest, '/'+siteList[0].site.staticFiles[index]);

        fs.rename(oldName, newName);
    });

    fs.copySync(path.join(conf.SRC_DIR, '/.htaccess'), path.join(dest, '/.htaccess'));
}


function _makeSiteFiles (siteList) {
    console.log('››'.blue.bold, 'Building site');

    console.log('  ››'.blue.bold, 'Copying images');
    _copyImages(conf.DEST_DIR);

    console.log('  ››'.blue.bold, 'Copying static files');
    _copyStaticFiles(conf.DEST_DIR, siteList);

    console.log('  ››'.blue.bold, 'Building index pages');
    _.each(siteList[0].index, function (page) {
        var url = path.join(conf.DEST_DIR, page.url+'/index.html')
        fs.outputFileSync(url, _renderIndex(siteList, page));
    });

    console.log('  ››'.blue.bold, 'Building tags pages');
    _.each(siteList[0].tags, function (tag) {
        _.each(tag.index, function (page) {
            var url = path.join(conf.DEST_DIR, page.url+'/index.html')
            fs.outputFileSync(url, _renderTaggedPage(siteList, tag, page));
        });
    });

    console.log('››'.green.bold, 'Built to: '+conf.DEST_DIR);
}


function _cleanBuildDir() {
    fs.removeSync(conf.DEST_DIR);
    console.log('››'.bold.blue, 'Cleaning up build directory');
}


// The build process
function build (siteList) {
    _cleanBuildDir();
    _makeSiteFiles(siteList);
}


// Get the image json and start the build
getSiteJson(function (err, result) {
    var siteList = result;
    console.log('››'.bold.green, 'Site data is built');
    console.log('››››'.bold.green, '----------');
    console.log('››'.bold.blue, 'Start build steps');

    // Build the site
    build(siteList);

    // Process timers
    var endTimer = process.hrtime(startTimer);
    var formattedTimer = prettyHrtime(endTimer);
    console.log('››››'.bold.green, '----------');
    console.log('››'.bold.green, 'Completed in: '+formattedTimer);
});
