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
function _renderHomepage (dataList) {
    console.log('  ››'.blue.bold, 'Rendering homepage template');

    return swig.renderFile(path.join(conf.SRC_DIR, 'templates/homepage.html'), { images: dataList });
}

function _renderTaggedPage (dataList) {
    console.log('  ››'.blue.bold, 'Rendering tagged page for: '+dataList.name);

    return swig.renderFile(path.join(conf.SRC_DIR, 'templates/tagged.html'), {
        tag_name: dataList.name,
        images: dataList.images
    });
}

function _copyStaticFiles (dest) {
    console.log('  ››'.blue.bold, 'Copying static files');
    fs.copySync(path.join(conf.SRC_DIR, '/static/'), path.join(dest, '/static'));
}

function _makeSiteFiles (siteList) {
    console.log('››'.blue.bold, 'Building site');

    console.log('  ››'.blue.bold, 'Copying Images');

    _.each(siteList[0].images, function (image) {
        fs.copySync(image.path, path.join(conf.DEST_DIR, '/'+image.path));
    });

    _copyStaticFiles(conf.DEST_DIR);

    var homePageData = siteList[0].images;
    var tagsPageData = siteList[0].tags;

    fs.outputFileSync(path.join(conf.DEST_DIR, 'index.html'), _renderHomepage(homePageData));

    _.each(tagsPageData, function (tag) {
        if (tag.name.length) {
            fs.outputFileSync(
                path.join(conf.DEST_DIR, 'tagged/'+tag.name+'/index.html'),
                _renderTaggedPage(tag)
            );
        }
    });

    console.log('››'.green.bold, 'Built to: '+conf.DEST_DIR);
}


function _cleanImagesDir () {
    fs.removeSync(path.join(conf.DEST_DIR, conf.IMAGES_DIR));
    console.log('››'.bold.blue, 'Cleaning up image directory');
}


// The build process
function build (siteList) {
    _cleanImagesDir();
    _makeSiteFiles(siteList);
}


// Get the image json and start the build
getSiteJson(function (err, result) {
    var siteList = result;
    console.log('››'.bold.green, 'Site data is built');
    console.log('››'.bold.blue, '------------------------------');
    console.log('››'.bold.blue, 'Start build steps');

    // Build the site
    build(siteList);

    // Process timers
    var endTimer = process.hrtime(startTimer);
    var formattedTimer = prettyHrtime(endTimer);
    console.log('››'.bold.green, '------------------------------');
    console.log('››'.bold.green, 'Completed in: '+formattedTimer);
});
