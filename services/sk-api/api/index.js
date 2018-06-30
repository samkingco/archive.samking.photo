const Koa = require('koa');
const KoaRouter = require('koa-router');
const endpointDocs = require('./documentation');
const { rawEndpoint, listEndpoint, idEndpoint } = require('./endpoint-helpers');

const about = require('../data/about.json');
const photos = require('../data/photos.json');
const photoSets = require('../data/photoSets.json');
const tags = require('../data/tags.json');

const app = new Koa();
const api = new KoaRouter();

api.get('/', async ctx =>
  rawEndpoint(ctx, {
    message:
      'This is an API of photos and design work. See `endpoints` for more.',
    endpoints: endpointDocs,
  }),
);

api.get('/about', async ctx => rawEndpoint(ctx, about));
api.get('/photos', async ctx => listEndpoint(ctx, photos.reverse()));
api.get('/photos/:id', async ctx => idEndpoint(ctx, photos));
api.get('/photo-sets', async ctx => listEndpoint(ctx, photoSets));
api.get('/photo-sets/:id', async ctx => idEndpoint(ctx, photoSets));
api.get('/tags', async ctx => listEndpoint(ctx, tags));
api.get('/tags/:id', async ctx => idEndpoint(ctx, tags));

app.use(api.routes());

module.exports = app;
