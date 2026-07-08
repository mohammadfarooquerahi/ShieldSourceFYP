// middleware/authMiddleware.js
// Provides two Express middleware functions:
//   1. authenticate  - Verifies the Bearer JWT in the Authorization header
//                      and attaches the decoded payload to req.user
//   2. authorize     - Factory function that returns a middleware checking
//                      whether req.user has one of the allowed roles

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * authenticate
 * Extracts the JWT from "Authorization: Bearer <token>",
 * verifies it with JWT_SECRET, and stores the decoded user
 * payload on req.user so downstream handlers can use it.
 *
 * Returns 401 if no token is present or 403 if the token is invalid/expired.
 */
const authenticate = (req, res, next) => {
  // Read the full Authorization header value
  const authHeader = req.headers['authorization'];

  // The header must exist and start with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided. Access denied.' });
  }

  // Extract only the token part (after "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify throws if token is expired, tampered, or uses wrong secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded payload (id, email, role) to request for use in controllers
    req.user = decoded;

    next(); // Hand off to the next middleware or route handler
  } catch (err) {
    // Distinguish between expired tokens and truly invalid ones (helpful for frontend)
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token has expired. Please log in again.' });
    }
    return res.status(403).json({ message: 'Invalid token. Access denied.' });
  }
};

/**
 * authorize(...roles)
 * Returns a middleware that checks if the authenticated user's role
 * is one of the permitted roles. Must be used AFTER authenticate.
 *
 * Usage: router.get('/admin-only', authenticate, authorize('admin'), handler)
 *
 * @param {...string} roles - Allowed role strings, e.g. 'admin', 'expert', 'user'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user is set by the authenticate middleware above
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(', ')}.`
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
