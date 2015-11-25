// App config
const conf = require('./lib/config/config');
const buildConf = require('./lib/config/production').settings;
const secret = require('./lib/config/secrets');
const args = [JSON.stringify(buildConf)];

// Libs
const childProcess = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const colors = require('colors');
const s3 = require('s3');
const Rsync = require('rsync');


// Build the site with the production config
function buildSite(callback) {
    // keep track of whether callback has been invoked to prevent multiple invocations
    var invoked = false;
    var process = childProcess.fork('./build', args);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });
}

// Now we can run a script and invoke a callback when complete, e.g.
buildSite(function (err) {
    if (err) throw err;

    // Finished building the site so kick off the S3 upload
    uploadImagesToS3();
});



// Set up the s3 client
var s3client = s3.createClient({
    s3Options: {
        accessKeyId: secret.s3AccessKey,
        secretAccessKey: secret.s3SecretKey
    }
});


// Set some options for uploading files
var uploadImages = {
    localDir: conf.IMAGES_DIR,
    deleteRemoved: true,
    s3Params: {
        Bucket: "samkingco-imgix",
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
