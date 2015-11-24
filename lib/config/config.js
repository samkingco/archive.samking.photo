var exports = module.exports = {};


// Build vars
exports.IMAGES_DIR = './images';
exports.SRC_DIR = './src';
exports.DEST_DIR = './build/';
exports.CACHE_DIR = './cache/';
exports.IMAGE_CACHE_FILE = 'image-list.json';
exports.SITE_CACHE_FILE = 'site-data.json';
exports.imagesPerPage = 64;
exports.useImgix = false;


// Static pages that have no context data
exports.flatpages = {
    info: {
        template: 'templates/flatpages/info.html',
        url: '/info/index.html',
        basePath: '/info/'
    },
    fourohfour: {
        template: 'templates/flatpages/404.html',
        url: '404.html',
        basePath: '/404.html'
    }
}


// All urls that have some context data
exports.urls = {
    index: {
        template: 'templates/index.html',
        basePath: '/'
    },
    tagsIndex: {
        template: 'templates/tags.html',
        basePath: '/tagged/'
    },
    tagged: {
        template: 'templates/tagged.html',
        basePath: '/tagged/'
    },
    archive: {
        template: 'templates/archive.html',
        basePath: '/archive/'
    }
}


// Static urls
exports.staticFiles = {
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
exports.author = {
    name: 'Sam King',
    byline: 'Photographer & Designer',
    instagram: 'samkingphoto',
    twitter: 'samkingphoto',
    github: 'samisking',
    email: 'mail@samking.co'
}


// Site info
exports.siteInfo = {
    baseUrl: 'http://samking.co',
    analytics: 'UA-23814339-7',
    description: 'The creative process Journal of Photographer & Designer – Sam King.',
    defaultKeywords: ['sam king', 'photographer', 'photography', 'designer', 'web designer', 'graphic designer', 'developer', 'london', 'united kingdom']
}
