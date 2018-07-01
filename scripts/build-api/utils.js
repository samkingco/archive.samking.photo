const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const md5File = require('md5-file/promise');
const sizeOf = promisify(require('image-size'));
const { ExifImage } = require('exif');
const remark = require('remark')();

const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);

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

const processImages = async (images, { imgSrc, imgDest, includeExif }) => {
  const imagePath = image => path.resolve(imgSrc, image);

  const getImageData = images.map(async ({ src }) => ({
    hash: await md5File(imagePath(src)),
    dimensions: await readDimensions(imagePath(src)),
    exif: includeExif ? await readExif(imagePath(src)) : null,
  }));

  const allImageData = await Promise.all(getImageData);

  return allImageData.map(({ hash, dimensions, exif }, index) => {
    const originalImage = images[index];
    const { src } = originalImage;
    const { width, height } = dimensions;

    const extension = src.substring(src.lastIndexOf('.') + 1, src.length);

    return {
      src: `${imgDest}/${hash}.${extension}`,
      width,
      height,
      ratio: height / width,
      exif,
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
};

const getImageListFromMarkdown = content => {
  const ast = remark.parse(content);

  const getImages = list =>
    list.reduce((imageList, node) => {
      if (node === null) return imageList;

      if (node.children && Array.isArray(node.children)) {
        return [...imageList, ...getImages(node.children)];
      }

      if (node.type === 'image' && !node.url.startsWith('http')) {
        return [...imageList, { src: node.url }];
      }

      return imageList;
    }, []);

  return getImages([ast]);
};

const parseMarkdown = (content, imageTransformData) => {
  const ast = remark.parse(content);

  function transformer(node) {
    if (node === null) return;

    if (Array.isArray(node)) {
      return node.map(transformer);
    }

    const transformedChildren = node.children
      ? transformer(node.children)
      : null;

    const children =
      transformedChildren && transformedChildren.length === 1
        ? transformedChildren[0]
        : transformedChildren;

    // Return arrays to destructure in the format of:
    // [type, children, attributes];

    switch (node.type) {
      case 'root':
        return children;
      case 'heading':
        return [`h${node.depth}`, children];
      case 'text':
        return node.value;
      case 'list':
        return [node.ordered ? 'ol' : 'ul', children];
      case 'listItem':
        return ['li', children];
      case 'paragraph': {
        const childIsImage = Array.isArray(children) && children[0] === 'img';
        return childIsImage ? children : ['p', children];
      }
      case 'link':
        return ['a', children, { title: node.title, href: node.url }];
      case 'image': {
        const imageTransform = imageTransformData.find(
          i => i.meta.src === node.url,
        );

        const isLocal = !node.url.startsWith('http') && imageTransform;

        const src = isLocal ? imageTransform.src : node.url;
        const width = isLocal ? imageTransform.width : null;
        const height = isLocal ? imageTransform.height : null;
        const ratio = isLocal ? imageTransform.ratio : null;

        return [
          'img',
          null,
          {
            caption: node.title,
            alt: node.alt,
            src,
            width,
            height,
            ratio,
          },
        ];
      }
      case 'emphasis':
        return ['em', children];
      case 'strong':
        return ['strong', children];
      case 'inlineCode':
        return ['code', children];
      case 'code':
        return ['pre', ['code', null, node.value], { lang: node.lang }];
      case 'blockquote':
        return ['blockquote', children];
      case 'break':
        return ['br'];
      case 'thematicBreak':
        return ['hr'];
      case 'linkReference':
        return ['span', children];
      default:
        return node;
    }
  }

  return transformer(ast);
};

const writeToAPI = async (apiDir, outputName, data) =>
  await writeFileAsync(
    path.resolve(apiDir, `${outputName}.json`),
    JSON.stringify(data, null, 2),
  ).catch(err => console.error('ERROR: unable to save', outputName));

const copyImages = async images => {
  // Copy to `./images` to be served by local server or synced to S3
  const copyImagesOperation = images.map(
    async image =>
      await copyFileAsync(
        image.meta.path,
        path.resolve(process.cwd(), '.images', image.meta.publishedFileName),
      ).catch(err => console.error(`ERROR: failed to copy ${image.meta.path}`)),
  );

  await Promise.all(copyImagesOperation).catch(err =>
    console.error('ERROR: failed to copy images'),
  );
};

module.exports = {
  slugify,
  processImages,
  getImageListFromMarkdown,
  parseMarkdown,
  writeToAPI,
  copyImages,
};
