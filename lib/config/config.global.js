var config = module.exports = {};

config.cdnURL = 'http://d7fclsx94b4tt.cloudfront.net';

config.info = {
    name: 'Sam King',
    byline: 'Photographer & Designer',
    description: 'The creative process Journal of Photographer & Designer – Sam King.',
    defaultKeywords: ['sam king', 'photographer', 'photography', 'designer', 'web designer', 'graphic designer', 'developer', 'london', 'united kingdom'],
    instagram: 'samkingphoto',
    twitter: 'samkingphoto',
    github: 'samisking',
    email: 'mail@samking.co',
}

config.IMAGES_DIR = './images';
config.OPT_IMAGES_DIR = './optimised_images';
config.SRC_DIR = './src';
config.DEST_DIR = './build/';
config.CACHE_DIR = './cache/';
config.IMAGE_CACHE_FILE = 'image-list.json';
config.SITE_CACHE_FILE = 'site-data.json';
config.PAGE_CACHE_FILE = 'page-data.json';
config.imagesPerPage = 64;

config.imageSizes = {};
config.imageSizes.small = {
    width: 768,
    quality: 75,
    extension: '_sml'
};
config.imageSizes.medium = {
    width: 1216,
    quality: 75,
    extension: '_med'
};
config.imageSizes.large = {
    width: 2880,
    quality: 50,
    extension: '_lrg'
};


// Static pages that have no context data
config.flatpages = {};
config.flatpages._info = {
    template: 'templates/flatpages/info.html',
    url: '/info/index.html',
    basePath: '/info/'
};
config.flatpages._404 = {
    template: 'templates/flatpages/404.html',
    url: '404.html',
    basePath: '/404.html'
};


// All urls that have some context data
config.pages = {};
config.pages._index = {
    template: 'templates/index.html',
    basePath: '/'
};
config.pages._tagsIndex = {
    template: 'templates/tags.html',
    basePath: '/tagged/'
};
config.pages._tagged = {
    template: 'templates/tagged.html',
    basePath: '/tagged/'
};
config.pages._archive = {
    template: 'templates/archive.html',
    basePath: '/archive/'
};


// Static urls
config.staticfiles = {}
config.staticfiles.css = {
    src: '/static/css/style.css',
    dest: '/static/css/samking.css'
};
config.staticfiles.js = {
    src: '/static/js/app.js',
    dest: '/static/js/samking.js'
};
