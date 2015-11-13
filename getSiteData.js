var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

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
        console.log('  ››'.bold.blue, 'Building tag list for "'+tag+'"');

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




function _buildSiteList (imageList) {
    var siteList = [];
    var tagsList = _buildTagsList(imageList);

    siteList.push({ images: imageList, tags: tagsList });

    return siteList;
}


// Get the image json and start formatting it
module.exports = function (callback) {
    getImageJson(function (err, result) {
        console.log('››'.bold.green, 'Image data is built');

        console.log('››'.bold.blue, 'Building site data');
        // Build the list of tags
        var siteList = _buildSiteList(result);

        callback(err, siteList);
    });
}
