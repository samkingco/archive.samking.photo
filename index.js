var fs = require('fs-extra');
var async = require('async');
var _ = require('underscore');
var path = require('path');
var gm = require('gm').subClass({imageMagick: true});



function getModifiers (path) {
    var baseName = path.split('.');
    var modifiers = baseName[0].split('-');
    modifiers.splice(0, 1);

    if (!modifiers.length) {
        modifiers = null;
    }

    return modifiers;
}



function _getImageList (imgListCallback) {
    var imgList = [];
    var iteration = 0;
    var images = fs.readdirSync('./images').sort();


    _.each(images, function (img) {
        var imgPath = path.join('./images/', img);
        var imgData;

        async.series({
            path: function (callback) {
                callback(null, imgPath);
            },

            modifiers: function (callback) {
                var modifiers = getModifiers(img);
                callback(null, modifiers)
            },

            timestamp: function (callback) {
                gm(imgPath).identify('%[EXIF:DateTimeOriginal]', function (err, value) {
                    if (err) callback(err);
                    value = value.replace(':', '-').replace(':', '-').replace(' ', 'T');
                    var datetime = new Date(value);
                    callback(null, datetime);
                });
            },

            shutter: function (callback) {
                gm(imgPath).identify('%[EXIF:ExposureTime]', function (err, value) {
                    if (err) callback(err);
                    callback(null, value);
                });
            },

            aperture: function (callback) {
                gm(imgPath).identify('%[EXIF:FNumber]', function (err, value) {
                    if (err) callback(err);
                    var a = value.split('/');
                    var aperture = a[0] / a[1];
                    callback(null, aperture.toString());
                });
            },

            iso: function (callback) {
                gm(imgPath).identify('%[EXIF:ISOSpeedRatings]', function (err, value) {
                    if (err) callback(err);
                    callback(null, value);
                });
            },

            focal: function (callback) {
                gm(imgPath).identify('%[EXIF:FocalLengthIn35mmFilm]', function (err, value) {
                    if (err) callback(err);
                    callback(null, value);
                });
            },

            keywords: function (callback) {
                gm(imgPath).identify('%[IPTC:2:25]', function (err, value) {
                    if (err) callback(err);
                    callback(null, value.split(';'));
                });
            },

            caption: function (callback) {
                gm(imgPath).identify('%[IPTC:2:120]', function (err, value) {
                    if (err) callback(err);
                    callback(null, value);
                });
            }
        }, addToImageList);

    });


    function addToImageList (err, singleImageData) {
        iteration++;

        imgList.push(singleImageData);

        returnImageList(imgList);
    }


    function returnImageList (data) {
        if (iteration == images.length) {
            imgListCallback(data);
        }
    }
}


function run () {
    _getImageList(function (listOfImageData) {
        var sortedList = _.sortBy(listOfImageData, 'path');
        console.log(sortedList);
    });
}

run();
