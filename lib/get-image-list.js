// App config
var config = require('./config');

// Output helpers
var colors = require('colors');

// Libs
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var _ = require('underscore');

// I have to subclass imagemagick to get all the keywords.
// Graphicsmagick only returns the first one for some reason.
var gm = require('gm').subClass({ imageMagick: true });

// Testing sharp for resizing
var sharp = require('sharp');


// Check if a file exists
function existsSync (filePath) {
    try {
        fs.statSync(filePath);
    } catch (err) {
        if (err.code === 'ENOENT') return false;
    }

    return true;
}





// Reference to cache file and it's contents
var CACHE_FILE = path.join(config.CACHE_DIR, config.IMAGE_CACHE_FILE);
var cachedImagesList;

// If the cache file exists, use it. Else create an empty array to fill.
if (existsSync(CACHE_FILE)) {
    cachedImagesList = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
} else {
    cachedImagesList = [];
}


// Get files from the images directory
var sourceImages = fs.readdirSync(config.IMAGES_DIR).sort();

// Filter the list to just image files
sourceImages = _.filter(sourceImages, function (image) {
    return image.match(/(.png|.jpg|.gif)/i);
});


// Remove any modified images from the cache object
_.each(cachedImagesList, function (cachedImage) {
    if (imageShouldBeRemoved(cachedImage)) {
        removeImageFromCache(cachedImage);
    }

    // Check to see if the image should be marked for re-processing
    checkForReProcessing(cachedImage);
});


// Add any new or modified images to the cache object
_.each(sourceImages, function (sourceImage, imageNumber) {
    if (!imageHasBeenSeenBefore(sourceImage)) {
        addImageToList(sourceImage, imageNumber);
    }
});


// Check if the image has been removed from the filesystem
// but hasn't been removed from the cache
function imageShouldBeRemoved(sourceImage) {
    // Because the sourceImages array stores image paths
    // without the images dir, we need to replace it in the
    // filename before we check if it exists in the filesystem
    var imageName = sourceImage.path.replace('images/', '');
    return !_.contains(sourceImages, imageName);
}


// Check if the image needs to be re-processed
// and update the mtime in the cache
function checkForReProcessing(cachedImage) {
    if (existsSync(cachedImage.path)) {
        var srcImageMtime = fs.lstatSync(cachedImage.path).mtime;

        if (srcImageMtime > cachedImage.modified) {
            cachedImage.processed = false;
            cachedImage.modified = srcImageMtime;

            console.log('››'.bold.yellow, `Re-process ${cachedImage.path}`);
        }
    }
}


// Adds an image to the cache object
function addImageToList(sourceImage, index) {
    var imagePath = path.join('images/', sourceImage);
    var modified = Date.parse(fs.statSync(imagePath).mtime);

    // Increment the index and set the modified time for future checks
    cachedImagesList.push({
        index: index+1,
        path: imagePath,
        modified: modified,
        processed: false
    });

    console.log('››'.bold.green, `Added ${imagePath} to the cache`);
}


// Removes an image from the cache object
function removeImageFromCache(cachedImage) {
    _.each(cachedImage.sizes, function (size) {
        // TODO: Make this path better and use vars from conf
        var sizePath = size.replace('images/', 'optimised_images/');
        fs.removeSync(sizePath);
    });

    cachedImagesList = _.without(cachedImagesList, cachedImage);

    console.log('››'.bold.red, `Removed ${cachedImage.path} from the cache`);
}


// Check if an image exists in the cache file
// Returns true or false
function imageHasBeenSeenBefore(sourceImagePath) {
    var seenBefore = _.some(cachedImagesList, function (image) {
        var imageName = image.path.replace('images/', '');
        return imageName === sourceImagePath;
    });

    return seenBefore;
}





// Gets modifiers from the image filename
// Called as part of an async compose
function getModifiers(image, callback) {
    // Get the filename without the extension
    // and split the basename into modifiers
    var baseName = image.path.split('.');
    var modifiers = baseName[0].split('-');

    // Ignore the sequence number in the filename as a modifier
    // and set the modifiers key to the result
    modifiers.splice(0, 1);
    if (!modifiers.length) modifiers = '';
    image.modifiers = modifiers;

    console.log('  ››'.bold.green, `Successfully processed ${image.path}`);

    callback(null, image);
}


// Gets a whole bunch of image meta data
// Called as part of an async compose
function getMetaData(image, callback) {
    // GM format: timestamp, shutter, aperture, iso, focal, keywords, caption.
    // It also has to be on the same line because gm is dumb.
    var identifyBy = '%[EXIF:DateTimeOriginal]\n%[EXIF:ExposureTime]\n%[EXIF:FNumber]\n%[EXIF:ISOSpeedRatings]\n%[EXIF:FocalLengthIn35mmFilm]\n%[IPTC:2:25]\n%[IPTC:2:120]\n%[width]x%[height]';

    // Kick off graphicsmagick to get all the info
    gm(image.path)
        .identify(identifyBy, function (err, metadata) {
            if (err) return callback(err);

            // Format the meta data into a nice object
            formatMeta(image, metadata.split('\n'));

            callback(null, image);
        });
}


// Format the meta data array into nice things
// and return the image object back
function formatMeta(image, metaArr) {
    image.timestamp = formatTimestamp(metaArr[0]);
    image.exposure = metaArr[1];
    image.aperture = formatAperture(metaArr[2]);
    image.iso = metaArr[3];
    image.focal = metaArr[4];
    image.keywords = formatKeywords(metaArr[5]);
    image.caption = metaArr[6];
    image.dimensions = formatDimensions(metaArr[7]);
    image.processed = true;

    return image;
}


// Format the timestamp into a proper JS date
function formatTimestamp(str) {
    var timestamp = str
                    .replace(':', '-')
                    .replace(':', '-')
                    .replace(' ', 'T');

    return new Date(timestamp);
}

// Format the aperture into a nicer string
function formatAperture(arr) {
    var aperture = arr.split('/');
    var fnumber  = aperture[0] / aperture[1];

    return fnumber.toString();
}

// Format the keywords returned by GM into an array
function formatKeywords(arr) {
    var keywords = _.map(arr.split(';'), function (keyword) {
        return keyword.replace(/\s+/g, '-').toLowerCase();
    });

    return keywords[0].length
        ? keywords
        : null;
}

// Format the dimensions into a nice object
function formatDimensions(arr) {
    var dimensions = arr.split('x');

    return {
        width: parseInt(dimensions[0], 10),
        height: parseInt(dimensions[1], 10),
    }
}


// Resize each image into every size available in the global config
function resizeImages(image, callback) {
    // Ensure that the optimised folder exists
    fs.ensureDirSync(config.OPT_IMAGES_DIR);

    var sizes = {};

    // Asynchronously resize the image into different sizes
    async.forEachOf(config.imageSizes, function (size, sizeKey, callback) {
        var extension = size.extension +
                        '_' +
                        image.modified +
                        image.path.substring(image.path.lastIndexOf("."));

        var fileName =  image.path.substring(0, image.path.lastIndexOf(".")) +
                        extension;

        var writeName = path.join('optimised_images/', fileName.replace('images/', ''));

        sizes[sizeKey] = fileName;

        // Resize and write out the particular size
        // using sharp because it's faster than gm
        sharp(image.path)
        .resize(size.maxSize, size.maxSize)
        .max()
        .withoutEnlargement()
        .quality(size.quality)
        .toFile(writeName, function (err) {
            callback();
        });
    }, function (err) {
        if (err) return callback(err);
        console.log('  ››'.bold.green, `Resized ${image.path}`);

        // Set a sizes object on the image and we're done!
        image.sizes = sizes;
        callback(null, image)
    });
}





// Returns a list of image objects that need processing
function imagesNeedingData() {
    return _.where(cachedImagesList, { processed: false });
}

// Compose functions that do the image processing
var processComposer = async.compose(resizeImages, getModifiers, getMetaData);

// Kicks of processing of images asynchronously
function processImages(imagesToProcess, callback) {
    async.mapLimit(imagesToProcess, 25, processComposer, function (err, result) {
        if (err) return callback(err);
        callback(null, result);
    });
}





// Now generate or return the image list
module.exports = function generateImageList(callback) {
    console.log('››'.bold.blue, 'Generating image data');

    // Check if any images need proccessing and begin processing them
    if (imagesNeedingData().length) {
        console.log('››'.bold.yellow, 'Some images need proccessing!');

        // Kick of the processing
        processImages(imagesNeedingData(), function (err, result) {
            if (err) return callback(err);

            console.log('››'.bold.blue, 'Done processing, updating cache file');

            // Update the cache file on disk
            fs.outputFileSync(
                path.join(config.CACHE_DIR, config.IMAGE_CACHE_FILE),
                JSON.stringify(cachedImagesList, null, 2)
            );

            callback(null, cachedImagesList);
        });
    } else {
        console.log('››'.bold.blue, 'Returning image data from cache');
        // Just return the image list from the cache object
        callback(null, cachedImagesList);
    }
}
