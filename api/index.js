const app = require('../server/server');

// Vercel serverless handler
module.exports = (req, res) => {
  // Strip any trailing issues and let Express handle routing
  return app(req, res);
};
