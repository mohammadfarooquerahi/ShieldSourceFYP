// routes/authRoutes.js
// Defines all authentication-related API endpoints.
// These routes are mounted at /api/auth in index.js

const express = require('express');
const router = express.Router();

const { register, login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// ── POST /api/auth/register ──────────────────────────────────────────────────
// Public endpoint — no authentication required.
// Creates a new user account with hashed password.
// Body: { name, email, password, role? }
router.post('/register', register);

// ── POST /api/auth/login ─────────────────────────────────────────────────────
// Public endpoint — no authentication required.
// Validates credentials and returns a signed JWT.
// Body: { email, password }
router.post('/login', login);

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
// Protected endpoint — requires valid JWT in Authorization header.
// Returns the current user's profile from the database.
// Header: Authorization: Bearer <token>
router.get('/me', authenticate, getMe);

module.exports = router;
