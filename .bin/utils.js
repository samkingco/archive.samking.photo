const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const fs = require('fs-extra');
const { ExifImage } = require('exif');
const sizeOf = promisify(require('image-size'));

async function writeContentJSON(dir, name, data) {
  return await fs.outputFile(
    path.resolve(dir, name),
    JSON.stringify(data, null, 2),
  );
}

function slugify(baseName) {
  return baseName
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

async function readDimensions(image) {
  return await sizeOf(image)
    .then(({ width, height }) => ({ width, height }))
    .catch(err => console.error('ERROR: getting dimensions of image', image));
}

async function readExif(image) {
  return new Promise((resolve, reject) => {
    ExifImage({ image }, (error, exifData) => {
      const baseExif = {
        cameraMake: null,
        cameraModel: null,
        captureTime: null,
        exposure: null,
        aperture: null,
        iso: null,
        focalLength: null,
      };

      if (error) return resolve(baseExif);

      const { exif, image } = exifData;

      const dateArr = exif.DateTimeOriginal.replace(' ', ':').split(':');
      const captureTime = new Date(...dateArr.map(i => Number(i))).getTime();
      const cameraMake =
        image.Make === 'SONY'
          ? `${image.Make.charAt(0).toUpperCase()}${image.Make.substr(
              1,
            ).toLowerCase()}`
          : image.Make;
      const cameraModel = image.Model === 'ILCE-7' ? 'A7' : image.Model;

      return resolve({
        ...baseExif,
        cameraMake,
        cameraModel,
        captureTime,
        exposure: exif.ExposureTime,
        aperture: exif.FNumber,
        iso: exif.ISO,
        focalLength: exif.FocalLengthIn35mmFormat || exif.FocalLength,
      });
    });
  });
}

async function processImages(images, { src, dest }) {
  const imagePath = image => path.resolve(src, image);

  const getImageData = images.map(async ({ src }) => ({
    hash: await fs.readFile(imagePath(src)).then(data =>
      crypto
        .createHash('sha1')
        .update(data, 'utf8')
        .digest('hex')
        .slice(0, 8),
    ),
    dimensions: await readDimensions(imagePath(src)),
    exif: await readExif(imagePath(src)),
  }));

  const allImageData = await Promise.all(getImageData);

  return allImageData.map(({ hash, dimensions, exif }, index) => {
    const originalImage = images[index];
    const { src } = originalImage;
    const { width, height } = dimensions;

    const extension = src.substring(src.lastIndexOf('.') + 1, src.length);

    return {
      src: `${dest}/${hash}.${extension}`,
      width,
      height,
      ratio: height / width,
      ...exif,
      // Only used for publishing the images.
      // Will be stripped before it goes into the API
      meta: {
        hash,
        src,
        path: imagePath(src),
        publishedFileName: `${hash}.${extension}`,
      },
    };
  });
}

async function copyImages(images, dest) {
  await fs.ensureDir(dest);

  const copyImagesOperation = images.map(image =>
    fs.copyFile(
      image.meta.path,
      path.resolve(dest, image.meta.publishedFileName),
    ),
  );

  await Promise.all(copyImagesOperation).catch(err =>
    console.error('ERROR: failed to copy images', err),
  );
}

module.exports = {
  writeContentJSON,
  slugify,
  processImages,
  copyImages,
};
