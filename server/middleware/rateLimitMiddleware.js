const rateLimit = require('express-rate-limit');

const createIncidentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many incident submissions. Please try again in a minute.' }
});

module.exports = {
  createIncidentLimiter
};
