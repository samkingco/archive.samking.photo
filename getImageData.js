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


// Helper functions
function existsSync (filePath) {
    try {
        fs.statSync(filePath);
    } catch (err) {
        if (err.code === 'ENOENT') return false;
    }
    return true;
}





// Reference to cache file and it's contents
var cacheFile = path.join(conf.CACHE_DIR, conf.IMAGE_CACHE_FILE);
var cachedImagesList;

if (existsSync(cacheFile)) {
    cachedImagesList = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
} else {
    cachedImagesList = [];
}


// Get images from the images directory
var images = fs.readdirSync(conf.IMAGES_DIR).sort();

// Filter just image files
images = _.filter(images, function (image) {
    return image.match(/(.png|.jpg|.gif)/i);
});

console.log('››'.bold.green, 'Built path list');





// ------------------------------------------
// Add or remove images from the cache object
// ------------------------------------------

// Remove any changed images from the cache object
_.each(cachedImagesList, function (cachedImage) {
    if (_imageShouldBeRemoved(cachedImage)) {
        // Remove the image from the cache object
        _removeImageFromList(cachedImage);
    }

    // Check modified times of files to see if the image
    // needs to be marked for re-processing
    _checkForReProcessing(cachedImage);
});


// Add any images to the cache object
_.each(images, function (image) {
    if (!_imageHasBeenSeenBefore(image)) {
        _addImageToList(image);
    }
});


// Function to check if the image no longer exists in the images dir
// but still exists in the cache object
function _imageShouldBeRemoved (image) {
    var imageName = image.path.replace('images/', '');
    return !_.contains(images, imageName);
}


// Function to check if the image needs to be re-processed
// and update the mtime in the cache
function _checkForReProcessing (image) {
    if (existsSync(image.path)) {
        var srcImageMtime = fs.lstatSync(image.path).mtime;
        var cachedImageMtime = image.modified;

        if (srcImageMtime > cachedImageMtime) {
            image.processed = false;
            image.modified = srcImageMtime;

            console.log('››'.bold.yellow, image.path+' needs to be re-processed');
        }
    }
}


// Function to add an image to the cache object
function _addImageToList (image) {
    var imagePath = path.join('images/', image);
    var modified = Date.parse(fs.statSync(imagePath).mtime);

    cachedImagesList.push({
        path: imagePath,
        modified: modified,
        processed: false
    });

    console.log('››'.bold.green, 'Added '+imagePath+' to the cache');
}


// Function to remove an image from the cache object
function _removeImageFromList (imageObj) {
    cachedImagesList = _.without(cachedImagesList, imageObj);

    console.log('››'.bold.red, 'Removed '+imageObj.path+' from the cache');
}


// Function to check if an image exists in the json file
function _imageHasBeenSeenBefore (imagePath) {
    var seenBefore = _.some(cachedImagesList, function (image) {
        var imageName = image.path.replace('images/', '');
        return imageName === imagePath;
    });

    return seenBefore;
}





// ---------------------------------------------
// Functions that process all the data in images
// ---------------------------------------------

function _setAsProcessed (image, callback) {
    image.processed = true;
    callback(null, image);
}

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

function _resizeImages (image, callback) {
    var sizes = {};

    async.forEachOf(conf.imageSizes, function (sizeObj, sizeName, callback) {
        var extension = sizeObj.extension + '.' + image.modified + image.path.substring(image.path.lastIndexOf("."));
        var fileName = image.path.substring(0, image.path.lastIndexOf(".")) + extension;
        var writeFileName = path.join('optimised_images/', fileName.replace('images/', ''));

        sizes[sizeName] = fileName;

        gm(image.path)
        .resize(sizeObj.width)
        .quality(sizeObj.quality)
        .write(writeFileName, function (err) {
            if (!err) callback();
        });
    }, function (err) {
        image.sizes = sizes;
        console.log('  ››'.bold.green, 'Resized '+image.path);
        callback(null, image)
    });
}





// -----------------------------------
// Generate responsive sizes of images
// -----------------------------------

// var imageResizeComposer = async.compose(_setAsProcessed, _getDimensions, _getModifiers, _getTimestamp, _getShutter, _getAperture, _getIso, _getFocal, _getKeywords, _getCaption);

// function _resizeImages (imagesToResize, callback) {
//     async.mapLimit(imagesToResize, 20, imageResizeComposer, function (err, result) {
//         callback(err, result);
//     });
// }





// -----------------------------------------------
// Async thing to process only images that need it
// -----------------------------------------------


// Set up the composer to be called
var imageProcessComposer = async.compose(_setAsProcessed, _resizeImages, _getDimensions, _getModifiers, _getTimestamp, _getShutter, _getAperture, _getIso, _getFocal, _getKeywords, _getCaption);


// First built a list of images that need meta data
function _imagesNeedingData () {
    return _.where(cachedImagesList, { processed: false });
}


// Async process all the images
function _processImages (imagesToProcess, callback) {
    async.mapLimit(imagesToProcess, 20, imageProcessComposer, function (err, result) {
        callback(err, result);
    });
}


// Export the function
module.exports = function (callback) {
    console.log('››'.bold.blue, 'Building image data');

    // Check if any images need proccessing and begin processing them
    if (_imagesNeedingData().length) {
        console.log('››'.bold.yellow, 'There are images that need proccessing!');

        _processImages(_imagesNeedingData(), function (err, result) {
            console.log('››'.bold.blue, 'Processing complete, updating cache file');
            // Update the cache file on disk
            fs.writeFile(path.join(conf.CACHE_DIR, conf.IMAGE_CACHE_FILE), JSON.stringify(cachedImagesList, null, 2));
            // Return with the newly updated list
            callback(err, cachedImagesList);
        });
    } else {
        console.log('››'.bold.blue, 'Nothing new - returning image data from cache');
        // Just return the image list from the cache object
        callback(null, cachedImagesList);
    }
}
