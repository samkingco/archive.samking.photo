// App config
var conf = require('./config');

// Libs
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

// Created data things
var getImageJson = require('./getImageData');


// Helper mixins
_.mixin({
    chunk: function (array, unit) {
        if (!_.isArray(array)) return array;

        unit = Math.abs(unit);

        var results = [];
        var length = Math.ceil(array.length / unit);

        for (var i = 0; i < length; i++) {
            results.push(array.slice( i * unit, (i + 1) * unit));
        }

        return results;
    }
});


function _paginateList (list, unit, path) {
    var chunkedList = _.chunk(list, unit);
    var paginatedList = [];
    var maxIndex = chunkedList.length;

    _.each(chunkedList, function (pageData, index) {
        var pageNumber = index + 1;

        var currentUrl = path+'page/'+pageNumber+'/';
        var prevUrl;
        var nextUrl = (pageNumber == maxIndex) ? '' : path+'page/'+(pageNumber+1)+'/';

        if (pageNumber == 1) {
            prevUrl = '';
            currentUrl = path;
        } else if (pageNumber == 2) {
            prevUrl = path;
        } else {
            prevUrl = path+'page/'+(pageNumber-1)+'/';
        }

        var pageInfo = {
            currentUrl: currentUrl,
            prevUrl: prevUrl,
            nextUrl: nextUrl,
            images: pageData
        }

        paginatedList.push(pageInfo);
    });

    return paginatedList;
}


function _buildIndexData (imageList, urlKey) {
    // Some useful things for rendering
    var template = conf.urls[urlKey].template;
    var basePath = conf.urls[urlKey].basePath;

    // Data setup
    var indexData = {};

    // Sort the list of data to paginate
    var listToPage = _.sortBy(imageList, 'path').reverse();

    // Get a list of the paginated data
    var paginatedData = _paginateList(listToPage, conf.imagesPerPage, basePath);

    //Add data to each page in the list
    _.each(paginatedData, function (page, index) {
        page.currentIndex = index+1;
        page.totalPages = paginatedData.length;
    });

    // Push all the data above into the index object
    indexData.template = template;
    indexData.basePath = basePath;
    indexData.pages = paginatedData;

    return indexData;
}


function _buildArchivesList (imageList, urlKey) {
    // Some useful things for rendering
    var template = conf.urls[urlKey].template;
    var basePath = conf.urls[urlKey].basePath;

    // Data setup
    var archivesData = {};
    var monthList = [];

    // Group archive images by date
    var archivedByDate = _.groupBy(imageList, function (image) {
        var timestamp = new Date(image.timestamp);
        var yyyymm = timestamp.getFullYear() + '-' + (timestamp.getMonth() + 1);

        return yyyymm;
    });

    // Create an object for each date group
    _.each(archivedByDate, function (monthImages, YYYY_MM) {
        console.log('  ››'.bold.blue, 'Building archive group for "'+YYYY_MM+'"');

        // Apply a sort to the images
        monthImages = _.sortBy(monthImages, 'path').reverse();

        // Set the month name to be the timestamp of the first item
        // so we can format to whatever in the template
        var name = monthImages[0].timestamp;

        // Push each month to the array
        monthList.push({
            name: name,
            itemCount: monthImages.length,
            images: monthImages
        });
    });

    // Push all the data above into the index object
    archivesData.template = template;
    archivesData.basePath = basePath;
    archivesData.page = monthList;

    return archivesData;
}


function _getAllTags (imageList) {
    console.log('››'.bold.blue, 'Getting all tags');
    var tags = _.compact(_.uniq(_.flatten(_.pluck(imageList, 'keywords'))));
    return tags;
}


function _buildTaggedList (imageList, urlKey) {
    // Some useful things for rendering
    var template = conf.urls[urlKey].template;
    var basePath = conf.urls[urlKey].basePath;

    // Data setup
    var taggedData = {};
    var paginatedTaggedList = [];
    var tags = _getAllTags(imageList);

    _.each(tags, function (tag) {
        console.log('  ››'.bold.blue, 'Building tagged list for "'+tag+'"');

        var url = path.join(basePath, tag+'/');

        // Loop through all the images and filter for the current tag
        // and return all images that match
        var imagesWithTag = _.filter(imageList, function (imageObject) {
            return _.contains(imageObject['keywords'], tag);
        });

        // Sort the list of data to paginate
        var listToPage = _.sortBy(imagesWithTag, 'path').reverse();

        // Get a list of the paginated data
        var paginatedData = _paginateList(listToPage, conf.imagesPerPage, url);

        //Add data to each page in the list
        _.each(paginatedData, function (page, index) {
            page.tagName = tag;
            page.currentIndex = index+1;
            page.totalPages = paginatedData.length;
        });

        // Push all the paginated tag stuff to the array
        paginatedTaggedList.push({
            name: tag,
            itemCount: imagesWithTag.length,
            pages: paginatedData
        });
    });

    // Push all the data into the index object
    taggedData.template = template;
    taggedData.basePath = basePath;
    taggedData.data = paginatedTaggedList;

    console.log('››'.bold.green, 'List of all tags is built');

    return taggedData;
}


function _buildSiteInformation () {
    var staticFiles = _cachebustStatic(conf.staticFiles);

    return {
        staticFiles: staticFiles,
        author: conf.author,
        info: conf.siteInfo,
        urls: conf.urls
    }
}


function _cachebustStatic (staticList) {
    var staticFiles = {};

    _.each(staticList, function (file, key) {
        var modified = Date.parse(fs.statSync(path.join(conf.SRC_DIR, file.src)).mtime);
        var newFileName = file.dest.substring(0, file.dest.lastIndexOf(".")) + "_" + modified + file.dest.substring(file.dest.lastIndexOf("."));

        var fileObj = {
            src: file.src,
            dest: newFileName
        }

        staticFiles[key] = fileObj;
    });

    return staticFiles;
}


function _buildSiteList (imageList) {
    var siteList = [];

    // Build the list of global site data
    var siteInformationList = _buildSiteInformation();

    // Sort & paginate all the lists
    var indexList = _buildIndexData(imageList, 'index');
    var archiveList = _buildArchivesList(imageList, 'archive');
    var taggedList = _buildTaggedList(imageList, 'tagged');

    siteList.push({
        site: siteInformationList,
        sitePages: {
            index: indexList,
            archive: archiveList,
            tagged: taggedList
        }
    });

    return siteList;
}


// Get the image json and start formatting it into the site list
module.exports = function (callback) {
    getImageJson(function (err, result) {
        console.log('››'.bold.green, 'Image data is built');
        console.log('››'.bold.blue, 'Building site data');

        var siteList = _buildSiteList(result);

        // Write the site file to the cache
        fs.outputFileSync(path.join(conf.CACHE_DIR, conf.SITE_CACHE_FILE), JSON.stringify(siteList, null, 2));

        callback(err, siteList);
    });
}
