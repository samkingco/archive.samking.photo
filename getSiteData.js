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
            url: currentUrl,
            prevUrl: prevUrl,
            nextUrl: nextUrl,
            images: pageData
        }

        paginatedList.push(pageInfo);
    });

    return paginatedList;
}


function _buildPaginatedIndex (imageList, basePath) {
    var paginatedIndex = [];

    var indexList = _.sortBy(imageList, 'path').reverse();
    var indexPages = _paginateList(indexList, conf.imagesPerPage, basePath);

    //Add data to each page in the list
    _.each(indexPages, function (page, index) {
        page.currentIndex = index+1;
        page.totalPages = indexPages.length;
    });

    // Push all the paginated tag stuff to the array
    paginatedIndex.push(indexPages);

    return _.flatten(paginatedIndex);
}


function _getAllTags (imageList) {
    console.log('››'.bold.blue, 'Getting all tags');

    var tags = _.uniq(_.flatten(_.pluck(imageList, 'keywords')));

    return tags;
}


function _buildTaggedList (imageList) {
    var tags = _getAllTags(imageList);
    var taggedList = [];

    _.each(tags, function (tag) {
        console.log('  ››'.bold.blue, 'Building tagged list for "'+tag+'"');

        var url = '/tagged/'+tag+'/';

        // Loop through all the images and filter for the current tag
        var imagesWithTag = _.filter(imageList, function (imageObject) {
            return _.contains(imageObject['keywords'], tag);
        });

        // Build a paginated list of each tag
        var paginatedTag = _buildPaginatedIndex(imagesWithTag, url);

        // Push all the paginated tag stuff to the array
        taggedList.push({
            name: tag,
            url: url,
            itemCount: imagesWithTag.length,
            index: paginatedTag
        });
    });

    console.log('››'.bold.green, 'List of all tags is built');

    return _.flatten(taggedList);
}


function _buildSiteInformation () {
    var staticFiles = _cachebustStatic(conf.staticFiles);

    return {
        urls: conf.urls,
        staticFiles: staticFiles,
        author: conf.author,
        info: conf.siteInfo
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
    var indexList = _buildPaginatedIndex(imageList, '/');
    var taggedList = _buildTaggedList(imageList);

    siteList.push({
        site: siteInformationList,
        index: indexList,
        tagged: taggedList
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
        fs.writeFile(path.join(conf.CACHE_DIR, conf.SITE_CACHE_FILE), JSON.stringify(siteList, null, 2));

        callback(err, siteList);
    });
}
