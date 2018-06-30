const Koa = require('koa');
const KoaRouter = require('koa-router');
const imageProcess = require('./image-process');

const { LOCAL_IMAGE_SERVER_PORT } = process.env;
const PORT = LOCAL_IMAGE_SERVER_PORT || 3002;

const app = new Koa();
const router = new KoaRouter();

router.get('/:image', imageProcess);

app.use(router.routes());
app.listen(PORT);

console.info(`→ listening on http://localhost:${PORT}`);
