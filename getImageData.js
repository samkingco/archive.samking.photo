var colors = require('colors');
var fs = require('fs-extra');
var async = require('async');
var path = require('path');
var gm = require('gm').subClass({imageMagick: true});





var imageData = [];
var images = fs.readdirSync('./images').sort();

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
            image.keywords = value.split(';');
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

// Export the function
module.exports = function (callback) {
    console.log('››'.bold.blue, 'Building image data');

    async.mapLimit(imageData, 20, composer, function (err, result) {
        callback(err, result);
    });
}
