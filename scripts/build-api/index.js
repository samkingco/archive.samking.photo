const path = require('path');
const YAML = require('yamljs');

const {
  buildTagsJSON,
  buildPhotoSetsJSON,
  buildPhotosJSON,
} = require('./photos');

const { buildDesignJSON } = require('./design');

const {
  slugify,
  readDimensions,
  readExif,
  getImageListFromMarkdown,
  parseMarkdown,
  writeToAPI,
  copyImages,
} = require('./utils');

const { IMAGES_DEST_URL, CONTENT_DIR, API_SERVICE_DIR } = process.env;
const imageDestURL = IMAGES_DEST_URL || 'https://samking.imgix.net';

const contentDir = path.resolve(CONTENT_DIR || 'content');
const apiServiceDir = path.resolve(
  API_SERVICE_DIR || 'services/sk-website-api',
);

const build = async () => {
  // Load the content
  const loadSrc = src => YAML.load(path.resolve(contentDir, src));
  const aboutSrc = loadSrc('about.yml');
  const tagsSrc = loadSrc('photos/tags.yml');
  const setsSrc = loadSrc('photos/sets.yml');
  const photosSrc = loadSrc('photos/photos.yml');
  const designSrc = [loadSrc('design/lyst.yml')];

  // Generate individual JSON
  const buildJSON = async (src, buildFn, imagesDir, ...args) =>
    await buildFn(
      src,
      imagesDir ? path.resolve(contentDir, imagesDir) : null,
      imageDestURL,
      ...args,
    );

  const aboutJSON = await buildJSON(aboutSrc, () => aboutSrc);

  const tagsJSON = await buildJSON(tagsSrc, buildTagsJSON, null, photosSrc);

  const photosJSON = await buildJSON(
    photosSrc,
    buildPhotosJSON,
    'photos/images',
    tagsJSON,
  );

  const photoSetsJSON = await buildJSON(
    setsSrc,
    buildPhotoSetsJSON,
    null,
    photosJSON,
  );

  const designJSON = await buildJSON(
    designSrc,
    buildDesignJSON,
    'design/images',
  );

  // Write the JSON to the service
  const writeData = async (name, data, transform) =>
    await writeToAPI(
      path.resolve(apiServiceDir, 'data'),
      name,
      transform ? transform(data) : data,
    );

  await writeData('about', aboutJSON);
  await writeData('tags', tagsJSON);
  await writeData('photoSets', photoSetsJSON);

  await writeData('photos', photosJSON, i =>
    i.map(({ meta, ...photo }) => photo),
  );

  await writeData('design', designJSON, i =>
    i.map(({ images, ...rest }) => rest),
  );

  // Copy images for publishing later
  await copyImages([
    ...photosJSON,
    ...designJSON.reduce((i, project) => [...i, ...project.images], []),
  ]);
};

build();
