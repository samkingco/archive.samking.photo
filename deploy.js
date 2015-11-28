// Set the production flag
process.env.NODE_ENV = 'production';

// App config
var config = require('./lib/config');
var secret = require('./lib/config/secrets');

// Libs
var fs = require('fs-extra');
var path = require('path');
var colors = require('colors');
var s3 = require('s3');
var Rsync = require('rsync');





// Set up the s3 client
var s3client = s3.createClient({
    s3Options: {
        accessKeyId: secret.s3AccessKey,
        secretAccessKey: secret.s3SecretKey
    }
});


// Set some options for uploading files
var uploadImages = {
    localDir: config.OPT_IMAGES_DIR,
    deleteRemoved: true,
    s3Params: {
        Bucket: "samkingco-v5",
        Prefix: "images/"
    }
};


// Set up the rsync command
var rsync = new Rsync()
  .shell('ssh')
  .flags('azv --delete')
  .exclude('images')
  .source('build/')
  .destination(secret.DEPLOY_DEST);


// Upload the images to S3 first
function uploadImagesToS3 () {
    var s3uploader = s3client.uploadDir(uploadImages);

    console.log('››'.bold.blue, 'Starting S3 image transfer');

    s3uploader.on('error', function (err) {
        console.log('››'.bold.red, 'Unable to sync');
        if (err) console.error(err.stack);
    });

    s3uploader.on('progress', function () {
        // console.log("progress", s3uploader.progressAmount, s3uploader.progressTotal);
    });

    s3uploader.on('end', function () {
        console.log('››'.bold.green, 'Completed S3 upload');

        console.log('››'.bold.blue, 'Starting server deploy');

        // Now rsync the build dir to the server
        rsync.execute(function (error, code, cmd) {
            console.log('››››'.bold.green, 'Deploy done');
        });
    });
}


// Kick off the upload to S3 and subsequent server deploy
uploadImagesToS3();
