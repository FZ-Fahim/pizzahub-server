let app;
try {
  app = require('../dist/app');
} catch (e) {
  app = require('../src/app');
}

const expressApp = app.default || app;

module.exports = (req, res) => {
  return expressApp(req, res);
};
