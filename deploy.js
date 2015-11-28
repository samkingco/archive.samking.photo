// Set the production flag
process.env.NODE_ENV = 'production';

// App config
var config = require('./lib/config');
var secret = require('./lib/config/secrets');

// Libs
var colors = require('colors');
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var s3 = require('s3');
var Rsync = require('rsync');





// Set up the s3 client
var s3client = s3.createClient({
    s3Options: {
        accessKeyId: secret.s3AccessKey,
        secretAccessKey: secret.s3SecretKey
    }
});


// Upload the images to S3 first
var uploadImages = {
    localDir: config.OPT_IMAGES_DIR,
    deleteRemoved: true,
    s3Params: {
        Bucket: "samkingco-v5",
        Prefix: "images/"
    }
};

function uploadImagesToS3(callback) {
    var s3uploader = s3client.uploadDir(uploadImages);

    console.log('››'.bold.blue, 'Starting S3 image transfer');

    s3uploader.on('error', function (err) {
        console.log('››'.bold.red, 'Unable to sync');
        if (err) return callback(err);
    });

    s3uploader.on('end', function () {
        console.log('››'.bold.green, 'Completed S3 image upload');
        callback(null);
    });
}


// Upload static files
var uploadStatic = {
    localDir: config.STATIC_DEST_DIR,
    s3Params: {
        Bucket: "samkingco-v5",
        Prefix: "static/"
    }
};

function uploadStaticToS3(callback) {
    var s3uploader = s3client.uploadDir(uploadStatic);

    console.log('››'.bold.blue, 'Starting S3 static transfer');

    s3uploader.on('error', function (err) {
        console.log('››'.bold.red, 'Unable to sync');
        if (err) return callback(err);
    });

    s3uploader.on('end', function () {
        console.log('››'.bold.green, 'Completed S3 static upload');
        callback(null);
    });
}


// Deploy everything else that isn't on S3 to the server
var rsync = new Rsync()
  .shell('ssh')
  .flags('azv --delete')
  .exclude('images')
  .source('build/')
  .destination(secret.DEPLOY_DEST);

function deployServerFiles(callback) {
    console.log('››'.bold.blue, 'Starting server deploy');

    // Now rsync the build dir to the server
    rsync.execute(function (error, code, cmd) {
        console.log('››'.bold.green, 'Server files deployed');
        callback(null);
    });
}


// Kick off the upload to S3 and subsequent server deploy
async.series([
    uploadImagesToS3,
    uploadStaticToS3,
    deployServerFiles
], function (err, results) {
    if (err) return console.error(err);
    console.log('››'.bold.green, 'Deployment done!');
});

