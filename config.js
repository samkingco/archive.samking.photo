var exports = module.exports = {};


// Build vars
exports.IMAGES_DIR = './images';
exports.OPT_IMAGES_DIR = './optimised_images';
exports.SRC_DIR = './src';
exports.DEST_DIR = './build/';
exports.CACHE_DIR = './cache/';
exports.IMAGE_CACHE_FILE = 'image-list.json';
exports.SITE_CACHE_FILE = 'site-list.json';
exports.imagesPerPage = 6;

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
}


// Static urls
exports.staticFiles = {
    css: '/static/css/style.css',
    scss: '/static/_sass/style.scss',
    js: '/static/js/app.js'
}


// Author & site info
exports.author = {
    name: 'Sam King',
    byline: 'Photographer & Designer',
    instagram: 'samkingphoto',
    twitter: 'samkingphoto',
    github: 'samisking',
    emai: 'mail@samking.co',
    emailSafe: '&#109;&#97;&#105;&#108;&#64;&#115;&#97;&#109;&#107;&#105;&#110;&#103;&#46;&#99;&#111;'
}


exports.urls = {
    index: '/',
    tags: '/tags/',
    tagged: '/tagged/'
}


// Site info
exports.siteInfo = {
    analytics: 'UA-23814339-7',
    description: 'The creative process Journal of Photographer & Designer – Sam King.',
    defaultKeywords: [  'sam king',
                        'photographer',
                        'photography',
                        'designer',
                        'web designer',
                        'graphic designer',
                        'developer',
                        'london',
                        'united kingdom' ]
}
