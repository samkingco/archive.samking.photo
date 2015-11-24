// App config
const conf = require('./config/config');
const secret = require('./config/secrets');

// Output helpers
const colors = require('colors');

// Libs
const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const _ = require('underscore');
const gm = require('gm').subClass({imageMagick: true});
const ImgixClient = require('imgix-core-js');
const imgix = new ImgixClient(secret.imgixUrl, secret.imgixToken);


// Helper functions
function existsSync (filePath) {
    try {
        fs.statSync(filePath);
    } catch (err) {
        if (err.code === 'ENOENT') return false;
    }
    return true;
}




// Start logging
console.log('››››'.bold.green, '----------');





// Reference to cache file and it's contents
const cacheFile = path.join(conf.CACHE_DIR, conf.IMAGE_CACHE_FILE);
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

console.log('››'.bold.green, 'Got all images successfully');





// ------------------------------------------
// Add or remove images from the cache object
// ------------------------------------------

// Remove any changed images from the cache object
_.each(cachedImagesList, function (cachedImage) {
    if (_imageShouldBeRemoved(cachedImage)) {
        _.each(cachedImage.sizes, function (size) {
            // TODO: Make this path better and use vars from conf
            const sizePath = size.replace('images/', 'optimised_images/');
            fs.removeSync(sizePath);
        });

        // Remove the image from the cache object
        _removeImageFromList(cachedImage);
    }

    // Check modified times of files to see if the image
    // needs to be marked for re-processing
    _checkForReProcessing(cachedImage);
});


// Add any images to the cache object
_.each(images, function (image, index) {
    if (!_imageHasBeenSeenBefore(image)) {
        _addImageToList(image, index);
    }
});


// Function to check if the image no longer exists in the images dir
// but still exists in the cache object
function _imageShouldBeRemoved(image) {
    const imageName = image.path.replace('images/', '');
    return !_.contains(images, imageName);
}


// Function to check if the image needs to be re-processed
// and update the mtime in the cache
function _checkForReProcessing(image) {
    if (existsSync(image.path)) {
        const srcImageMtime = fs.lstatSync(image.path).mtime;
        const cachedImageMtime = image.modified;

        if (srcImageMtime > cachedImageMtime) {
            image.processed = false;
            image.modified = srcImageMtime;

            console.log('››'.bold.yellow, `${image.path} needs to be re-processed`);
        }
    }
}


// Function to add an image to the cache object
function _addImageToList(image, index) {
    const imagePath = path.join('images/', image);
    const modified = Date.parse(fs.statSync(imagePath).mtime);

    // If the config is to use imgix
    if (conf.useImgix) {
        // Then set the imageUrl to the imgix url
        var imageUrl = imgix.path(image).toUrl().toString();
    } else {
        // Else set it to the local images folder
        var imageUrl = path.join('/', imagePath);
    }

    cachedImagesList.push({
        index: index+1,
        path: imagePath,
        url: imageUrl,
        modified: modified,
        processed: false
    });

    console.log('››'.bold.green, `Added ${imagePath} to the cache`);
}


// Function to remove an image from the cache object
function _removeImageFromList(imageObj) {
    cachedImagesList = _.without(cachedImagesList, imageObj);

    console.log('››'.bold.red, `Removed ${imageObj.path} from the cache`);
}


// Function to check if an image exists in the json file
function _imageHasBeenSeenBefore(imagePath) {
    const seenBefore = _.some(cachedImagesList, function (image) {
        const imageName = image.path.replace('images/', '');
        return imageName === imagePath;
    });

    return seenBefore;
}





// ---------------------------------------------
// Functions that process all the data in images
// ---------------------------------------------

function _setAsProcessed(image, callback) {
    image.processed = true;
    callback(null, image);
}

function _getDimensions(image, callback) {
    gm(image.path).size(function (err, size) {
        image.dimensions = size;
        callback(null, image);
    });
}

function _getModifiers(image, callback) {
    console.log('  ››'.bold.blue, `Getting data for ${image.path}`);

    const baseName = image.path.split('.');
    var modifiers = baseName[0].split('-');

    modifiers.splice(0, 1);

    if (!modifiers.length) {
        modifiers = '';
    }

    image.modifiers = modifiers;
    callback(null, image);
}

function _getTimestamp(image, callback) {
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

function _getShutter(image, callback) {
    gm(image.path).identify('%[EXIF:ExposureTime]', function (err, value) {
        if (!err) {
            image.exposure = value;
        } else {
            image.exposure = '';
        }
        callback(null, image);
    });
}

function _getAperture(image, callback) {
    gm(image.path).identify('%[EXIF:FNumber]', function (err, value) {
        if (!err) {
            const a = value.split('/');
            const aperture = a[0] / a[1];
            image.aperture = aperture.toString();
        } else {
            image.aperture = '';
        }
        callback(null, image);
    });
}

function _getIso(image, callback) {
    gm(image.path).identify('%[EXIF:ISOSpeedRatings]', function (err, value) {
        if (!err) {
            image.iso = value;
        } else {
            image.iso = '';
        }
        callback(null, image);
    });
}

function _getFocal(image, callback) {
    gm(image.path).identify('%[EXIF:FocalLengthIn35mmFilm]', function (err, value) {
        if (!err) {
            image.focal = value;
        } else {
            image.focal = '';
        }
        callback(null, image);
    });
}

function _getKeywords(image, callback) {
    gm(image.path).identify('%[IPTC:2:25]', function (err, value) {
        if (!err) {
            const keywords = _.map(value.split(';'), function (keyword) {
                return keyword.replace(/\s+/g, '-').toLowerCase();
            });

            if (keywords[0].length) {
                image.keywords = keywords;
            } else {
                image.keywords = null;
            }
        } else {
            image.keywords = null;
        }
        callback(null, image);
    });
}

function _getCaption(image, callback) {
    gm(image.path).identify('%[IPTC:2:120]', function (err, value) {
        if (!err) {
            image.caption = value;
        } else {
            image.caption = '';
        }
        callback(null, image);
    });
}





// -----------------------------------------------
// Async thing to process only images that need it
// -----------------------------------------------


// Set up the composer to be called
const imageProcessComposer = async.compose(_setAsProcessed, _getDimensions, _getModifiers, _getTimestamp, _getShutter, _getAperture, _getIso, _getFocal, _getKeywords, _getCaption);


// First built a list of images that need meta data
function _imagesNeedingData() {
    return _.where(cachedImagesList, { processed: false });
}


// Async process all the images
function _processImages(imagesToProcess, callback) {
    async.mapLimit(imagesToProcess, 20, imageProcessComposer, function (err, result) {
        callback(err, result);
    });
}


// Export the function
module.exports = function (callback) {
    console.log('››'.bold.blue, 'Generating image data');

    // Check if any images need proccessing and begin processing them
    if (_imagesNeedingData().length) {
        console.log('››'.bold.yellow, 'There are images that need proccessing!');

        _processImages(_imagesNeedingData(), function (err, result) {
            console.log('››'.bold.blue, 'Processing complete, updating cache file');
            // Update the cache file on disk
            fs.outputFileSync(path.join(conf.CACHE_DIR, conf.IMAGE_CACHE_FILE), JSON.stringify(cachedImagesList, null, 2));
            // Return with the newly updated list
            callback(err, cachedImagesList);
        });
    } else {
        console.log('››'.bold.blue, 'Nothing new - returning image data from cache');
        // Just return the image list from the cache object
        callback(null, cachedImagesList);
    }
}
