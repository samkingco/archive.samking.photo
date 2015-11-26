// App config
const conf = require('./config/config');
const buildConf = require('./config/dev').settings;
const secret = require('./config/secrets');

// Libs
const fs = require('fs-extra');
const path = require('path');
const _ = require('underscore');
const ImgixClient = require('imgix-core-js');
const imgix = new ImgixClient(secret.imgixUrl);

// Created data things
const getImageList = require('./get-image-list');

// Define a global page list to push pages to
const pageList = {};


// Get some build settings from the arguments
if (process.argv[2]) {
    var buildSettings = JSON.parse(process.argv[2]);
} else {
    var buildSettings = buildConf;
}


// Helper mixins
_.mixin({
    chunk: function (array, unit) {
        if (!_.isArray(array)) return array;

        unit = Math.abs(unit);

        const results = [];
        const length = Math.ceil(array.length / unit);

        for (var i = 0; i < length; i++) {
            results.push(array.slice( i * unit, (i + 1) * unit));
        }

        return results;
    }
});


function _paginateList (list, unit, path) {
    const chunkedList = _.chunk(list, unit);
    const paginatedList = [];
    const maxIndex = chunkedList.length;

    _.each(chunkedList, function (pageData, index) {
        const pageNumber = index + 1;

        var currentUrl = `${path}page/${pageNumber}/`;
        var prevUrl = `${path}page/${pageNumber-1}/`;
        const nextUrl = (pageNumber == maxIndex) ? '' : `${path}page/${pageNumber+1}/`;

        if (pageNumber == 1) {
            prevUrl = '';
            currentUrl = path;
        } else if (pageNumber == 2) {
            prevUrl = path;
        }

        const pageInfo = {
            lol: currentUrl,
            prevUrl: prevUrl,
            nextUrl: nextUrl,
            shareImage: pageData[0].imageUrl,
            images: pageData
        }

        paginatedList.push(pageInfo);
    });

    return paginatedList;
}


function _buildIndexData (imageList, urlKey) {
    // Some useful things for rendering
    const template = conf.urls[urlKey].template;
    const basePath = conf.urls[urlKey].basePath;

    // Sort the list of data to paginate
    const listToPage = _.sortBy(imageList, 'path').reverse();

    // Get a list of the paginated data
    const paginatedData = _paginateList(listToPage, conf.imagesPerPage, basePath);

    //Add data to each page in the list
    _.each(paginatedData, function (page, index) {
        page.currentIndex = index+1;
        page.totalPages = paginatedData.length;
    });

    // Push all the data above into the pageList
    pageList[urlKey] = {
        template: template,
        basePath: basePath,
        pages: paginatedData
    };
}


function _getAllTags (imageList) {
    const tags = _.compact(_.uniq(_.flatten(_.pluck(imageList, 'keywords'))));
    return tags;
}


function _buildTagsList (imageList, urlKey) {
    console.log('››'.bold.blue, 'Generating tags page');
    // Some useful things for rendering
    const template = conf.urls[urlKey].template;
    const basePath = conf.urls[urlKey].basePath;

    // Data setup
    const taggedList = [];
    const tags = _getAllTags(imageList);

    _.each(tags, function (tag) {
        const url = path.join(basePath, tag+'/');

        // Loop through all the images and filter for the current tag
        // and return all images that match
        const imagesWithTag = _.filter(imageList, function (imageObject) {
            return _.contains(imageObject['keywords'], tag);
        });

        // Push all the paginated tag stuff to the array
        taggedList.push({
            name: tag,
            url: url,
            itemCount: imagesWithTag.length
        });
    });

    // Push all the data into the index object
    pageList[urlKey] = {
        template: template,
        basePath: basePath,
        page: {
            tags: _.sortBy(taggedList, 'name')
        }
    };
}


function _buildTaggedList (imageList, urlKey) {
    console.log('››'.bold.blue, 'Generating tagged pages');
    // Some useful things for rendering
    const template = conf.urls[urlKey].template;
    const basePath = conf.urls[urlKey].basePath;


    // Get all the tags
    console.log('  ››'.bold.blue, 'Getting all tags');
    const tags = _getAllTags(imageList);

    _.each(tags, function (tag) {
        console.log('  ››'.bold.blue, `Generating tagged list for ${tag}`);

        const url = path.join(basePath, tag+'/');

        // Loop through all the images and filter for the current tag
        // and return all images that match
        const imagesWithTag = _.filter(imageList, function (imageObject) {
            return _.contains(imageObject['keywords'], tag);
        });

        // Sort the list of data to paginate
        const listToPage = _.sortBy(imagesWithTag, 'path').reverse();

        // Get a list of the paginated data
        const paginatedData = _paginateList(listToPage, conf.imagesPerPage, url);

        //Add data to each page in the list
        _.each(paginatedData, function (page, index) {
            page.tagName = tag;
            page.currentIndex = index+1;
            page.totalPages = paginatedData.length;
        });

        // Push all the paginated tag stuff to the array
        pageList[tag] = {
            template: template,
            basePath: basePath,
            name: tag,
            itemCount: imagesWithTag.length,
            pages: paginatedData
        };
    });
}


function _buildArchivesList (imageList, urlKey) {
    console.log('››'.bold.blue, 'Generating archive groups');
    // Some useful things for rendering
    const template = conf.urls[urlKey].template;
    const basePath = conf.urls[urlKey].basePath;

    // Data setup
    const monthList = [];

    // Group archive images by date
    const archivedByDate = _.groupBy(imageList, function (image) {
        const timestamp = new Date(image.timestamp);
        const yyyymm = timestamp.getFullYear() + '-' + (timestamp.getMonth() + 1);

        return yyyymm;
    });

    // Create an object for each date group
    _.each(archivedByDate, function (monthImages, YYYY_MM) {
        console.log('  ››'.bold.blue, `Generating archive group for ${YYYY_MM}`);

        // Apply a sort to the images
        monthImages = _.sortBy(monthImages, 'path').reverse();

        // Set the month name to be the timestamp of the first item
        // so we can format to whatever in the template
        const name = monthImages[0].timestamp;

        // Push each month to the array
        monthList.push({
            name: name,
            itemCount: monthImages.length,
            images: monthImages
        });
    });

    // Push all the data above into the pageList
    pageList[urlKey] = {
        template: template,
        basePath: basePath,
        page: {
            months: _.sortBy(monthList, 'name').reverse(),
            shareImage: monthList[0].images[0].imageUrl
        }
    };
}


function _buildFlatPages (flatpages) {
    _.each(flatpages, function (flatpage, key) {
        flatpage.page = {};
        pageList[key] = flatpage;
    });
}


function _buildPageList (imageList) {
    // Sort & paginate all the lists
    _buildIndexData(imageList, '_index');
    _buildTaggedList(imageList, '_tagged');
    _buildArchivesList(imageList, '_archive');
    _buildTagsList(imageList, '_tagsIndex');
    _buildFlatPages(conf.flatpages);

    return pageList;
}


function _cachebustStatic (staticList) {
    const staticfiles = {};

    _.each(staticList, function (file, key) {
        const modified = Date.parse(fs.statSync(path.join(conf.SRC_DIR, file.src)).mtime);

        // file-name_${modified}.ext
        const newFileName = `${file.dest.substring(0, file.dest.lastIndexOf("."))}_${modified}${file.dest.substring(file.dest.lastIndexOf("."))}`;

        const fileObj = {
            src: file.src,
            dest: newFileName
        }

        staticfiles[key] = fileObj;
    });

    return staticfiles;
}


function _buildSiteList () {
    const staticfiles = _cachebustStatic(conf.staticfiles);

    return {
        staticfiles: staticfiles,
        info: conf.info
    };
}


/**
 * Transforms an image object from image-list.json
 * by adding or removing things from the object
 * @param  {object} image The image object we're iterating over
 */
function _transformInputImages(imageList) {
    _.each(imageList, function (image) {
        if (buildSettings.useImgix) {
            image.url = imgix.path(image.path.replace('images/', '')).toUrl().toString();
        } else {
            image.url = path.join('/', image.path);
        }
    });

    return imageList;
}


// Get the image json and start formatting it into the site list
module.exports = function (callback) {
    getImageList(function (err, result) {
        console.log('››'.bold.blue, 'Generating site data');

        const siteData   = _buildSiteList();

        const siteImages = _transformInputImages(result);
        const pageList   = _buildPageList(siteImages);

        // Write the site file to the cache
        fs.outputFile(path.join(conf.CACHE_DIR, conf.SITE_CACHE_FILE), JSON.stringify(siteData, null, 2), function (err) {});

        fs.outputFile(path.join(conf.CACHE_DIR, conf.PAGE_CACHE_FILE), JSON.stringify(pageList, null, 2), function (err) {});

        var arr = []
        arr.push({
            site: siteData,
            pages: pageList
        });

        callback(err, arr);
    });
}