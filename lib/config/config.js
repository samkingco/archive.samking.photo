var exports = module.exports = {};


// Build vars
exports.IMAGES_DIR = './images';
exports.OPT_IMAGES_DIR = './optimised_images';
exports.SRC_DIR = './src';
exports.DEST_DIR = './build/';
exports.CACHE_DIR = './cache/';
exports.IMAGE_CACHE_FILE = 'image-list.json';
exports.SITE_CACHE_FILE = 'site-data.json';
exports.PAGE_CACHE_FILE = 'page-data.json';
exports.imagesPerPage = 64;

exports.imageSizes = {
    small: {
        width: 768,
        quality: 75,
        extension: '_sml'
    },
    medium: {
        width: 1216,
        quality: 75,
        extension: '_med'
    },
    large: {
        width: 2880,
        quality: 50,
        extension: '_lrg'
    }
};

exports.buildSettings = {
    useImgix: false
};


// Static pages that have no context data
exports.flatpages = {
    _info: {
        template: 'templates/flatpages/info.html',
        url: '/info/index.html',
        basePath: '/info/'
    },
    _404: {
        template: 'templates/flatpages/404.html',
        url: '404.html',
        basePath: '/404.html'
    }
}


// All urls that have some context data
exports.urls = {
    _index: {
        template: 'templates/index.html',
        basePath: '/'
    },
    _tagsIndex: {
        template: 'templates/tags.html',
        basePath: '/tagged/'
    },
    _tagged: {
        template: 'templates/tagged.html',
        basePath: '/tagged/'
    },
    _archive: {
        template: 'templates/archive.html',
        basePath: '/archive/'
    }
}


// Static urls
exports.staticfiles = {
    css: {
        src: '/static/css/style.css',
        dest: '/static/css/samking.css'
    },
    js: {
        src: '/static/js/app.js',
        dest: '/static/js/samking.js'
    }
}


// Author & site info
exports.info = {
    baseUrl: 'http://samking.co',
    name: 'Sam King',
    byline: 'Photographer & Designer',
    description: 'The creative process Journal of Photographer & Designer – Sam King.',
    defaultKeywords: ['sam king', 'photographer', 'photography', 'designer', 'web designer', 'graphic designer', 'developer', 'london', 'united kingdom'],
    instagram: 'samkingphoto',
    twitter: 'samkingphoto',
    github: 'samisking',
    email: 'mail@samking.co',
    analytics: 'UA-23814339-7'
}
