import app from '../dist/app.js';

const expressApp = app.default || app;

export default function handler(req, res) {
  return expressApp(req, res);
}
