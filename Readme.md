# samking.co

#### Version 5.0

I got fed up with how laborious it was to post new photos to my website. I had to write things and I'm lazy. I've removed all the fluff and made the whole process of adding new photos easier—I've essentially made a Node built static site version of tumblr…

## The Process

[samking.co](http://samking.co) is a "static site" that gets generated purely by images and their associated meta data. I'll outline the build process below:

1. `lib/get-image-list.js` reads all the image files inside `images/`.
2. It picks certain bits of meta data for each image, along with resizing the image into different formats to `optimised_images/`.
3. It generates a JSON object as a way of caching what images have already been processed as it's quite computationally expensive.
4. `lib/get-site-data.js` gets passed the data from `lib/get-image-data.js` and generates new data for different pages e.g. groups of images by keyword to create a tags directory.
5. It too saves it's output as a JSON file as a way of caching.
6. Finally, `build.js` gets this big site list and goes off to render the correct templates at the right urls.
7. Once the pages are rendered, then it's just a case of building and copying all static files to the final `build/` directory.

## Todo

- ~~Design the thing~~
- ~~Build the front-end~~
- ~~Make it mobile~~
- ~~Simplify some of the build steps~~
- ~~Set up some kind of deployment script~~
- Build static files in a better way so I can keep mtimes
- Set up a better gzip process for S3
- Write all the docs
