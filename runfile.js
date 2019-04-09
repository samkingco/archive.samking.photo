const { run } = require('runjs');
const pkg = require('./package.json');

const envMap = {
  local: 'development',
  dev: 'development',
  prod: 'production',
};

const PATHS = {
  bin: '.bin',
  dist: 'dist',
  contentSrc: 'content',
  contentDest: 'content/dist',
  imagesDest: 'content/dist/images',
};

const PORTS = {
  SERVE_DIST: 3000,
};

function start() {
  console.log(`Starting ${pkg.name} for ${envMap.dev}`);
  run('react-static start');
}

function buildSite(stage = 'prod') {
  console.log(`Building ${pkg.name} for ${envMap[stage]}`);
  run(`react-static build ${stage === 'dev' ? '--staging' : ''}`);
}

function analyze() {
  console.log(`Building ${pkg.name} for ${envMap.dev}`);
  run('react-static build --analyze');
}

function serve(port = PORTS.SERVE_DIST) {
  console.log(`Serving ${pkg.name}`);
  run(`serve dist -p ${port}`);
}

module.exports = {
  start,
  build: {
    all(stage) {
      buildSite(stage);
    },
    site: buildSite,
  },
  analyze,
  serve,
};
