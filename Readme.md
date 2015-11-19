# samking.co

#### Version 5.0

I'm fed up with how laborious it is to post new photos to my current site. I have to write things and I'm lazy—so I'm re-thinking what my website should be.

## Currently

This beta version of [samking.co](http://samking.co) is a "static site" that gets generated purely by images and their associated meta data. I'll outline the build process below.

1. `getImageData.js` reads all the image files inside `images/`.
2. It picks certain bits of meta data for each image, along with resizing the image into different formats to `optimised_images/`.
3. It generates a JSON object as a way of caching what images have already been processed as it's quite computationally expensive.
4. `getSiteData.js` gets passed the data from `getImageData.js` and generates new data for different pages e.g. groups of images by keyword to create a tags directory.
5. It too saves it's output as a JSON file as a way of caching.
6. Finally, `index.js` gets this big site list and goes off to render the correct templates at the right urls.
7. Once the pages are rendered, then it's just a case of building and copying all static files to the final `build/` directory.

## Todo

There's still a shit load I need to do:

- Design the thing
- Build the front-end
- Write all the docs
- Rename some things because naming is hard
- Simplify a few functions
- Set up some kind of deployment script
- Look at using Dropbox as a deployment trigger :sunglasses:
