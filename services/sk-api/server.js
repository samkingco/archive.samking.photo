const slsHttp = require('serverless-http');

const api = require('./api');
module.exports.api = slsHttp(api);
