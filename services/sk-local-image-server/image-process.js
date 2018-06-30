const path = require('path');
const sharp = require('sharp');

const processImage = async ctx => {
  const { image } = ctx.params;

  // This will be a mock of imgix in terms of params and image processing

  ctx.body = sharp(imagePath).toBuffer();
  ctx.type = '.jpg';
  ctx.status = 200;
};

module.exports = processImage;
