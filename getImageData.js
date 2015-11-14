// App config
var conf = require('./config');

// Output helpers
var colors = require('colors');

// Libs
var fs = require('fs-extra');
var async = require('async');
var path = require('path');
var _ = require('underscore');
var gm = require('gm').subClass({imageMagick: true});





// Get images from the images directory
var imageData = [];
var images = fs.readdirSync(conf.IMAGES_DIR).sort();

// Filter just image files
images = _.filter(images, function (image) {
    return image.match(/(.png|.jpg|.gif)/i);
});

// Populate the image data with paths
images.forEach(function (img) {
    var imagePath = path.join('images/', img);
    imageData.push({ path: imagePath });
});

console.log('››'.bold.green, 'Built path list');


// All the functions to be run
function _getDimensions (image, callback) {
    gm(image.path).size(function (err, size) {
        image.dimensions = size;
        callback(null, image);
    });
}

function _getModifiers (image, callback) {
    console.log('  ››'.bold.blue, 'Getting data for '+image.path);

    var baseName = image.path.split('.');
    var modifiers = baseName[0].split('-');
    modifiers.splice(0, 1);

    if (!modifiers.length) {
        modifiers = '';
    }

    image.modifiers = modifiers;
    callback(null, image);
}

function _getTimestamp (image, callback) {
    gm(image.path).identify('%[EXIF:DateTimeOriginal]', function (err, value) {
        if (!err) {
            value = value.replace(':', '-').replace(':', '-').replace(' ', 'T');
            image.timestamp = new Date(value);
        } else {
            image.timestamp = '';
        }
        callback(null, image);
    });
}

function _getShutter (image, callback) {
    gm(image.path).identify('%[EXIF:ExposureTime]', function (err, value) {
        if (!err) {
            image.exposure = value;
        } else {
            image.exposure = '';
        }
        callback(null, image);
    });
}

function _getAperture (image, callback) {
    gm(image.path).identify('%[EXIF:FNumber]', function (err, value) {
        if (!err) {
            var a = value.split('/');
            var aperture = a[0] / a[1];
            image.aperture = aperture.toString();
        } else {
            image.aperture = '';
        }
        callback(null, image);
    });
}

function _getIso (image, callback) {
    gm(image.path).identify('%[EXIF:ISOSpeedRatings]', function (err, value) {
        if (!err) {
            image.iso = value;
        } else {
            image.iso = '';
        }
        callback(null, image);
    });
}

function _getFocal (image, callback) {
    gm(image.path).identify('%[EXIF:FocalLengthIn35mmFilm]', function (err, value) {
        if (!err) {
            image.focal = value;
        } else {
            image.focal = '';
        }
        callback(null, image);
    });
}

function _getKeywords (image, callback) {
    gm(image.path).identify('%[IPTC:2:25]', function (err, value) {
        if (!err) {
            var keywords = _.map(value.split(';'), function (keyword) {
                return keyword.replace(/\s+/g, '-').toLowerCase();
            });

            image.keywords = keywords;
        } else {
            image.keywords = '';
        }
        callback(null, image);
    });
}

function _getCaption (image, callback) {
    gm(image.path).identify('%[IPTC:2:120]', function (err, value) {
        if (!err) {
            image.caption = value;
        } else {
            image.caption = '';
        }
        callback(null, image);
    });
}


// Set up the composer to be called
var composer = async.compose(_getDimensions, _getModifiers, _getTimestamp, _getShutter, _getAperture, _getIso, _getFocal, _getKeywords, _getCaption);


function _imagesLastModified (fileArr) {
    var lastFile = _.max(fileArr, function (image) {
        var fullpath = path.join(conf.IMAGES_DIR, image);
        return fs.statSync(fullpath).mtime;
    });

    return fs.statSync(path.join(conf.IMAGES_DIR, lastFile)).mtime;
}


function _shouldUseCachedList (callback) {
    var imagesLastModified = _imagesLastModified(images);
    var cacheFile = path.join(conf.CACHE_DIR, conf.IMAGE_CACHE_FILE);

    var cacheFileContents = fs.readFileSync(cacheFile, 'utf8');
    var cachedImageTotal = JSON.parse(cacheFileContents).length;

    console.log('››'.bold.blue, 'Checking cache status');

    fs.stat(cacheFile, function (err, stats) {
        if(!err
            && stats.isFile()
            && stats.mtime > imagesLastModified
            && cachedImageTotal == images.length) {
            console.log('››'.bold.green, 'Using cached image list');
            callback(true);
        } else {
            console.log('››'.bold.blue, 'Image cache does not exist, creating empty file');
            fs.writeFile(cacheFile, '');
            callback(false);
        }
    });
}


// Export the function
module.exports = function (callback) {
    // Check if using the cache file is the right thing to do
    _shouldUseCachedList(function (useCachedList) {
        if (useCachedList) {
            // Use the cached file as the site build data
            fs.readFile(path.join(conf.CACHE_DIR, conf.IMAGE_CACHE_FILE), 'utf8', function (err, data) {
                callback(err, JSON.parse(data));
            });
        } else {
            console.log('››'.bold.blue, 'Building image data');
            // Read all the images to create the data object
            async.mapLimit(imageData, 20, composer, function (err, result) {
                // Then save a cache file
                fs.writeFile(path.join(conf.CACHE_DIR, conf.IMAGE_CACHE_FILE), JSON.stringify(result, null, 2));

                // And return the data
                callback(err, result);
            });
        }
    });
}
