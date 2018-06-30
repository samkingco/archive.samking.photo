const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const YAML = require('yamljs');
const md5File = require('md5-file/promise');
const { slugify, readDimensions, readExif } = require('./utils');

const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);

const { IMAGES_SRC_BASE_URL, CONTENT_DIR, API_SERVICE_DIR } = process.env;

const contentDir = path.resolve(CONTENT_DIR || 'content');
const apiServiceDir = path.resolve(
  API_SERVICE_DIR || 'services/sk-website-api',
);

const getSetIdFromTitle = title => slugify(title);

const buildTagsJSON = async (tagsSrc, photosSrc) =>
  tagsSrc.map(tag => ({
    id: slugify(tag),
    name: tag,
    count: photosSrc.reduce(
      (count, photo) =>
        photo.tags && photo.tags.includes(tag) ? count + 1 : count,
      0,
    ),
  }));

const buildPhotosJSON = async (photosSrc, allTags) => {
  const imagePath = image => path.resolve(contentDir, `./photos/${image}`);

  const getImageData = photosSrc.map(async ({ src }) => ({
    hash: await md5File(imagePath(src)),
    dimensions: await readDimensions(imagePath(src)),
    exif: await readExif(imagePath(src)),
  }));

  const allImageData = await Promise.all(getImageData);

  return photosSrc.map(({ src, title, set, tags }, index) => {
    const id = allImageData[index].hash;
    const { width, height } = allImageData[index].dimensions;

    const extension = src.substring(src.lastIndexOf('.') + 1, src.length);
    const imageBaseUrl = IMAGES_SRC_BASE_URL || 'https://samking.imgix.net';
    const imageSrc = `${imageBaseUrl}/${id}.${extension}`;

    return {
      id,
      number: index + 1,
      src: imageSrc,
      width,
      height,
      ratio: height / width,
      title,
      exif: allImageData[index].exif,
      set: set ? getSetIdFromTitle(set) : null,
      tags: allTags.reduce((photoTags, tag) => {
        if (tags && tags.includes(tag.name)) return [...photoTags, tag.id];
        return photoTags;
      }, []),
      // Only used for publishing the images. Will be stripped before it goes into the API
      originalFilePath: imagePath(src),
      publishedFileName: `${id}.${extension}`,
    };
  });
};

const buildPhotoSetsJSON = async (setsSrc, allTags, photosJSON) =>
  setsSrc.map(({ title, description, tags }) => {
    const id = getSetIdFromTitle(title);
    return {
      id,
      title,
      description,
      photos: photosJSON.reduce(
        (photos, photo) =>
          photo.set && photo.set === id ? [...photos, photo.id] : photos,
        [],
      ),
    };
  });

const writeApiFile = async (pathName, data) =>
  await writeFileAsync(
    path.resolve(apiServiceDir, pathName),
    JSON.stringify(data, null, 2),
  ).catch(err => console.error('ERROR: unable to save', pathName));

const publishPhotos = async photos => {
  // Copy to `./images` to be served by local server
  const copyPhotos = photos.map(
    async photo =>
      await copyFileAsync(
        photo.originalFilePath,
        path.resolve('.images', photo.publishedFileName),
      ).catch(err => console.error(`ERROR: failed to copy ${photo.id}`)),
  );

  await Promise.all(copyPhotos);
};

const build = async () => {
  // Load the content
  const aboutSrc = YAML.load(path.resolve(contentDir, 'about.yml'));
  const tagsSrc = YAML.load(path.resolve(contentDir, 'tags.yml'));
  const setsSrc = YAML.load(path.resolve(contentDir, 'sets.yml'));
  const photosSrc = YAML.load(path.resolve(contentDir, 'photos.yml'));

  // Generate individual JSON
  const aboutJSON = aboutSrc;
  const tagsJSON = await buildTagsJSON(tagsSrc, photosSrc);
  const photosJSON = await buildPhotosJSON(photosSrc, tagsJSON);
  const photoSetsJSON = await buildPhotoSetsJSON(setsSrc, tagsJSON, photosJSON);

  // Write the JSON to the service
  await writeApiFile('./data/about.json', aboutJSON);
  await writeApiFile('./data/tags.json', tagsJSON);
  await writeApiFile(
    './data/photos.json',
    photosJSON.map(photo => {
      const { originalFilePath, publishedFileName, ...rest } = photo;
      return rest;
    }),
  );
  await writeApiFile('./data/photoSets.json', photoSetsJSON);

  // Publish photos
  await publishPhotos(photosJSON);
};

build();
