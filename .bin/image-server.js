const path = require('path');
const Koa = require('koa');
const KoaRouter = require('koa-router');
const sharp = require('sharp');

const { PORT = 4000, APP_IMAGES_DEST } = process.env;

const app = new Koa();
const router = new KoaRouter();

const processImage = async ctx => {
  const { image } = ctx.params;
  const { width } = ctx.query;

  const extension = image.substring(image.lastIndexOf('.') + 1, image.length);

  if (extension === 'ico') {
    ctx.status = 200;
    return;
  }

  // This will be a mock of image lambda in terms of params and processing
  const imagePath = path.resolve(__dirname, APP_IMAGES_DEST, image);
  const imageWidth = Number(width) || 2880;

  const imageBuffer = await sharp(imagePath)
    .resize(imageWidth, imageWidth)
    .withoutEnlargement()
    .max()
    .toBuffer();

  ctx.body = imageBuffer;
  ctx.type = `.${extension}`;
  ctx.status = 200;
};

const delay = (msMin, msMax) => async (ctx, next) => {
  const ms = Math.floor(Math.random() * (msMax - msMin + 1) + msMin);
  await new Promise(r => setTimeout(r, ms));
  await next();
};

router.get('/:image', processImage);
app.use(delay(500, 2000));

app.use(router.routes());
app.listen(PORT);

console.info(`→ Assets server running at http://localhost:${PORT}`);
