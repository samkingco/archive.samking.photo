// App config
const config = require('./config');

// Output helpers
const colors = require('colors');

// Libs
const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const _ = require('underscore');

// Have to subclass imagemagick to get all the keywords
// Graphicsmagick only returns the first one for some reason
const gm = require('gm').subClass({imageMagick: true});


// Start logging
console.log('››››'.bold.green, '----------');


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
const cacheFile = path.join(config.CACHE_DIR, config.IMAGE_CACHE_FILE);
var cachedImagesList;

if (existsSync(cacheFile)) {
    cachedImagesList = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
} else {
    cachedImagesList = [];
}


// Get images from the images directory
var images = fs.readdirSync(config.IMAGES_DIR).sort();

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

    cachedImagesList.push({
        index: index+1,
        path: imagePath,
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

/**
 * Get modifiers from the image file name by splitting on the '-' character
 * @param  {object}   image    The image object from the iterator
 * @param  {Function} callback Callback to the async composer
 */
function _getModifiers(image, callback) {
    // Get the filename without the extension
    const baseName = image.path.split('.');

    // Split the basename into modifiers
    var modifiers = baseName[0].split('-');

    // Ignore the sequence in the filename as a modifier
    modifiers.splice(0, 1);

    if (!modifiers.length) {
        modifiers = '';
    }

    // Set the modifier key on the image object
    image.modifiers = modifiers;

    console.log('  ››'.bold.green, `Successfully processed ${image.path}`);

    callback(null, image);
}


/**
 * Get's meta data of the image and passes it to a formatter
 * @param  {object}   image    The image object from the iterator
 * @param  {Function} callback Callback to the async composer
 */
function _getMeta(image, callback) {
    // gm format:
    //   timestamp, shutter, aperture, iso, focal, keywords, caption
    // split by a new line
    var identifyString = '%[EXIF:DateTimeOriginal]\n%[EXIF:ExposureTime]\n%[EXIF:FNumber]\n%[EXIF:ISOSpeedRatings]\n%[EXIF:FocalLengthIn35mmFilm]\n%[IPTC:2:25]\n%[IPTC:2:120]';

    // Kick of graphicsmagick to get all the info
    gm(image.path)
    .identify(identifyString, function (err, value) {
        if (!err) {
            // Format the meta data into a nice object
            _formatMeta(image, value.split('\n'));
        } else {
            callback(err);
        }
    })
    .size(function (err, size) {
        image.dimensions = size;
        callback(null, image);
    });
}


/**
 * Formats an array of meta data into keys in the image object
 * @param  {object} image   An object with some basic image info to add to
 * @param  {array} metaArr  An array of meta data
 * @return {object}         The original image object
 */
function _formatMeta(image, metaArr) {
    // Format & set the timestamp
    const timestamp = metaArr[0].replace(':', '-').replace(':', '-').replace(' ', 'T');
    image.timestamp = new Date(timestamp);

    // Set the exposure
    image.exposure = metaArr[1];

    // Format and set the aperture
    const aperture = metaArr[2].split('/');
    const fnumber  = aperture[0] / aperture[1];
    image.aperture = fnumber.toString();

    // Set the ISO
    image.iso = metaArr[3];

    // Set the focal length
    image.focal = metaArr[4];

    // Format and set the keywords
    const keywords = _.map(metaArr[5].split(';'), function (keyword) {
        return keyword.replace(/\s+/g, '-').toLowerCase();
    });

    image.keywords = keywords[0].length ? keywords : null;

    // Set caption
    image.caption = metaArr[6];

    // Set the image as processed
    image.processed = true;

    // Return the updated image object
    return image;
}


function _resizeImages(image, callback) {
    const sizes = {};

    async.forEachOf(config.imageSizes, function (sizeObj, sizeName, callback) {
        const extension = sizeObj.extension + '_' + image.modified + image.path.substring(image.path.lastIndexOf("."));
        const fileName = image.path.substring(0, image.path.lastIndexOf(".")) + extension;
        const writeFileName = path.join('optimised_images/', fileName.replace('images/', ''));

        sizes[sizeName] = fileName;

        // Ensure that the optimised folder exists
        fs.ensureDirSync(config.OPT_IMAGES_DIR);

        gm(image.path)
        .resize(sizeObj.width)
        .quality(sizeObj.quality)
        .write(writeFileName, function (err) {
            if (!err) callback();
        });
    }, function (err) {
        image.sizes = sizes;
        console.log('  ››'.bold.green, `Resized ${image.path}`);
        callback(null, image)
    });
}





// -----------------------------------------------
// Async thing to process only images that need it
// -----------------------------------------------

// Compose functions that do the image processing
const imageProcessComposer = async.compose(_resizeImages, _getModifiers, _getMeta);

/**
 * Builds a list of images where processed is false
 * @return {array} An array of images to process
 */
function _imagesNeedingData() {
    return _.where(cachedImagesList, { processed: false });
}

/**
 * Kicks of processing of images asynchronously
 * @param  {array}    imagesToProcess Image objects that need processing
 * @param  {Function} callback
 */
function _processImages(imagesToProcess, callback) {
    async.mapLimit(imagesToProcess, 50, imageProcessComposer, function (err, result) {
        callback(err, result);
    });
}


// Export the function
module.exports = function (callback) {
    console.log('››'.bold.blue, 'Generating image data');

    // Check if any images need proccessing and begin processing them
    if (_imagesNeedingData().length) {
        console.log('››'.bold.yellow, 'There are images that need proccessing!');

        // Kick of the processing
        _processImages(_imagesNeedingData(), function (err, result) {
            console.log('››'.bold.blue, 'Processing complete, updating cache file');
            // Update the cache file on disk
            fs.outputFileSync(path.join(config.CACHE_DIR, config.IMAGE_CACHE_FILE), JSON.stringify(cachedImagesList, null, 2));
            // Return with the newly updated list
            callback(err, cachedImagesList);
        });
    } else {
        console.log('››'.bold.blue, 'Nothing new - returning image data from cache');
        // Just return the image list from the cache object
        callback(null, cachedImagesList);
    }
}
