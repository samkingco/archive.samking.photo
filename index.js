// Output helpers
var colors = require('colors');
var prettyHrtime = require('pretty-hrtime');

// Libs
var _ = require('underscore');
var startTimer = process.hrtime();

// Created data things
var getImageJson = require('./getImageData');


function _getAllTags (imageList) {
    console.log('››'.bold.blue, 'Getting all tags');

    var tags = _.uniq(_.flatten(_.pluck(imageList, 'keywords')));

    return tags;
}


function _buildTagsList (imageList) {
    var tags = _getAllTags(imageList);
    var imagesByTag = [];

    _.each(tags, function (tag) {
        console.log('››'.bold.blue, 'Building tag list for "'+tag+'"');

        // Loop through all the images and filter for the current tag
        var imageWithTag = _.filter(imageList, function (imageObject) {
            return _.contains(imageObject['keywords'], tag);
        });

        // Push stuff to the array
        imagesByTag.push({ name: tag, images: imageWithTag });
    });

    console.log('››'.bold.green, 'List of all tags is built');

    return imagesByTag;
}


// Get the image json and start formatting it
getImageJson(function (err, results) {
    var imageList = results;
    console.log('››'.bold.green, 'Image data is built');

    // Build the list of tags
    var tagsList = _buildTagsList(imageList);

    // Process timers
    var endTimer = process.hrtime(startTimer);
    var formattedTimer = prettyHrtime(endTimer);
    console.log('››'.bold.green, '------------------------------');
    console.log('››'.bold.green, 'Completed in: '+formattedTimer);
});
