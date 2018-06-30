const { promisify } = require('util');
const { ExifImage } = require('exif');
const sizeOf = promisify(require('image-size'));

const slugify = baseName =>
  baseName
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text

const readDimensions = async image =>
  await sizeOf(image)
    .then(({ width, height }) => ({ width, height }))
    .catch(err => console.error('ERROR: getting dimensions of image', image));

const readExif = async image =>
  new Promise((resolve, reject) => {
    ExifImage({ image }, (error, exifData) => {
      if (error) return resolve(null);

      const { exif } = exifData;

      const dateArr = exif.DateTimeOriginal.replace(' ', ':').split(':');
      const captureTime = new Date(...dateArr.map(i => Number(i))).getTime();

      return resolve({
        captureTime,
        exposure: exif.ExposureTime,
        aperture: exif.FNumber,
        iso: exif.ISO,
        focal: exif.FocalLength,
      });
    });
  });

module.exports = {
  slugify,
  readDimensions,
  readExif,
};
