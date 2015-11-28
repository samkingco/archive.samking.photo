// App config
var config = require('./config');
var secret = require('./config/secrets');

// Libs
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

// Get the list of processed data
var getImageList = require('./get-image-list');

// Define a global page list to push pages to
var pageList = {};





// Underscore extension to chunk arrays to a particular size
// and return a new array of chunked arrays
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


// Generate a list of pages at a particular unit value
function paginateList(list, unit, path) {
    var chunkedList = _.chunk(list, unit);
    var maxIndex = chunkedList.length;

    var paginatedList = [];

    // Each page in the full list
    _.each(chunkedList, function (pageData, index) {
        var pageNumber = index + 1;

        var currentUrl = `${path}page/${pageNumber}/`;
        var prevUrl = `${path}page/${pageNumber-1}/`;
        var nextUrl = (pageNumber == maxIndex)
            ? ''
            : `${path}page/${pageNumber+1}/`;

        // Overwrite page url's based on the page index
        if (pageNumber == 1) {
            prevUrl = '';
            currentUrl = path;
        } else if (pageNumber == 2) {
            prevUrl = path;
        }

        var pageInfo = {}
        pageInfo.currentUrl = currentUrl;
        pageInfo.prevUrl = prevUrl;
        pageInfo.nextUrl = nextUrl;
        pageInfo.shareImage = pageData[0].sizes.large;
        pageInfo.images = pageData;

        paginatedList.push(pageInfo);
    });

    return paginatedList;
}


// Generate all the context data for the index page
function generateIndexData(imageList, urlKey) {
    var template = config.pages[urlKey].template;
    var basePath = config.pages[urlKey].basePath;

    // Sort the list of data to paginate by filename
    var listToPage = _.sortBy(imageList, 'path').reverse();

    // Get a list of the paginated data
    var paginatedData = paginateList(listToPage, config.IMAGES_PER_PAGE, basePath);

    //Add data to each page in the list
    _.each(paginatedData, function (page, index) {
        page.currentIndex = index+1;
        page.totalPages = paginatedData.length;
    });

    // Push all the data above into the global pageList
    pageList[urlKey] = {
        template: template,
        basePath: basePath,
        pages: paginatedData
    };
}


// Returns a list of all unique image tags
function getAllTags(imageList) {
    var tags = _.compact(_.uniq(_.flatten(_.pluck(imageList, 'keywords'))));
    return tags;
}


// Generate all the context data for the tag list page
function generateTagsPageData(imageList, urlKey) {
    console.log('  ››'.bold.blue, 'Generating index page');
    var template = config.pages[urlKey].template;
    var basePath = config.pages[urlKey].basePath;

    var taggedList = [];
    var tags = getAllTags(imageList);

    _.each(tags, function (tag) {
        var url = path.join(basePath, tag+'/');

        // Loop through all the images and filter for the current tag
        // returning all images that match
        var imagesWithTag = _.filter(imageList, function (imageObject) {
            return _.contains(imageObject['keywords'], tag);
        });

        // And then push the tags data to the context
        taggedList.push({
            name: tag,
            url: url,
            itemCount: imagesWithTag.length
        });
    });

    // Push all the data above into the global pageList
    pageList[urlKey] = {
        template: template,
        basePath: basePath,
        page: {
            tags: _.sortBy(taggedList, 'name')
        }
    };
}


// Generates data for each tag page
function generateSingleTagPageData(imageList, urlKey) {
    console.log('  ››'.bold.blue, 'Generating tags page');
    var template = config.pages[urlKey].template;
    var basePath = config.pages[urlKey].basePath;

    var tags = getAllTags(imageList);

    _.each(tags, function (tag) {
        console.log('  ››'.bold.blue, `Generating tag data for ${tag}`);

        var url = path.join(basePath, tag+'/');

        // Loop through all the images and filter for the current tag
        // returning all images that match
        var imagesWithTag = _.filter(imageList, function (imageObject) {
            return _.contains(imageObject['keywords'], tag);
        });

        // Sort the list of data to paginate
        var listToPage = _.sortBy(imagesWithTag, 'path').reverse();

        // Get a list of the paginated data
        var paginatedData = paginateList(listToPage, config.IMAGES_PER_PAGE, url);

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


// Generates data for the archive page
function generateArchiveData(imageList, urlKey) {
    var template = config.pages[urlKey].template;
    var basePath = config.pages[urlKey].basePath;

    var monthList = [];

    // Group archive images by date
    var archivedByDate = _.groupBy(imageList, function (image) {
        var timestamp = new Date(image.timestamp);
        var yyyymm = timestamp.getFullYear() +
                     '-' +
                     (timestamp.getMonth() + 1);

        return yyyymm;
    });

    // Create an object for each date group
    _.each(archivedByDate, function (monthImages, YYYY_MM) {
        console.log('  ››'.bold.blue, `Generating archive for ${YYYY_MM}`);

        // Sort the images by filename in reverse
        monthImages = _.sortBy(monthImages, 'path').reverse();

        // Set the month name to be the timestamp of the first item
        // so we can format the date to whatever we want in the template
        var name = monthImages[0].timestamp;

        // Push each month to the array
        monthList.push({
            name: name,
            itemCount: monthImages.length,
            images: monthImages
        });
    });

    // Now sort the months by date in reverse order:
    // latest months first
    monthList = _.sortBy(monthList, 'name').reverse();

    // Push all the data above into the pageList
    pageList[urlKey] = {
        template: template,
        basePath: basePath,
        page: {
            months: monthList,
            shareImage: monthList[0].images[0].imageUrl
        }
    };
}


// Generate context data for each flat page
function generateFlatpagesData(flatpages) {
    _.each(flatpages, function (flatpage, key) {
        console.log('  ››'.bold.blue, `Generating ${key} flatpage`);
        flatpage.page = {};
        pageList[key] = flatpage;
    });
}


// Sort & paginate all the lists
function buildSitePageList(imageList) {
    generateIndexData(imageList, '_index');
    generateSingleTagPageData(imageList, '_tagged');
    generateArchiveData(imageList, '_archive');
    generateTagsPageData(imageList, '_tagsIndex');
    generateFlatpagesData(config.flatpages);

    return pageList;
}


// Adds modified time to each static file
function cachebustStatic(staticList) {
    var staticfiles = {};

    _.each(staticList, function (file, key) {
        var modified = Date.parse(
            fs.statSync(path.join(config.SRC_DIR, file.src))
            .mtime
        );

        // file-name_${modified}.ext
        var newFileName = file.dest.substring(0, file.dest.lastIndexOf(".")) +
                          '_' +
                          modified +
                          file.dest.substring(file.dest.lastIndexOf("."));

        staticfiles[key] = {};
        staticfiles[key].src = file.src;
        staticfiles[key].dest = newFileName;
    });

    return staticfiles;
}


// Generate some data to be used by all templates
function generateGlobalSiteInfo() {
    var staticfiles = cachebustStatic(config.staticfiles);

    return {
        staticfiles: staticfiles,
        info: config.info
    };
}


// Transforms an image object from image-list.json
// by adding or removing things from the object
function transformInputImages(imageList) {
    _.each(imageList, function (image) {
        _.each(image.sizes, function (size, key) {
            if (config.useCDN) {
                // TODO: Sign the cloudfront urls
                var cloudfrontUrl = config.cdnURL+'/'+size;
                image.sizes[key] = cloudfrontUrl;
            } else {
                image.sizes[key] = path.join(config.hostname, size);
            }
        });
    });

    return imageList;
}


// Get the image json and start formatting it into the site list
module.exports = function generateSiteData(callback) {
    getImageList(function (err, result) {
        console.log('››'.bold.blue, 'Generating site data');

        // Write the global site info to the cache
        var siteData   = generateGlobalSiteInfo();

        fs.outputFile(
            path.join(config.CACHE_DIR, config.SITE_CACHE_FILE),
            JSON.stringify(siteData, null, 2),
            function (err) {
                if (err) return callback(err);
            }
        );


        // Write the page data to the cache
        var siteImages = transformInputImages(result);
        var pageList   = buildSitePageList(siteImages);

        fs.outputFile(
            path.join(config.CACHE_DIR, config.PAGE_CACHE_FILE),
            JSON.stringify(pageList, null, 2),
            function (err) {
                if (err) return callback(err);
            }
        );


        // Format the generated site data
        var generatedSite = {};
        generatedSite.site = siteData;
        generatedSite.pages = pageList;

        callback(null, generatedSite);
    });
}
