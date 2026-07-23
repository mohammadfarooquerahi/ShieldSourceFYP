// routes/incidentRoutes.js
// Defines incident management API endpoints.
// These routes are mounted at /api/incidents in index.js

const express = require('express');
const router = express.Router();

const {
  createIncident,
  getUserIncidents,
  getAllIncidents,
  getIncidentById,
  updateStatus,
  addUserNote,
} = require('../controllers/incidentController');

const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { createIncidentLimiter } = require('../middleware/rateLimitMiddleware');

// ── POST /api/incidents ───────────────────────────────────────────────────────
// Any authenticated user can report an incident with an optional file upload
router.post('/', createIncidentLimiter, authenticate, upload.single('evidence'), createIncident);

// ── GET /api/incidents/my ─────────────────────────────────────────────────────
// Returns only incidents submitted by the logged-in user (with notes)
// IMPORTANT: defined BEFORE /:id to avoid Express treating "my" as a param
router.get('/my', authenticate, getUserIncidents);

// ── GET /api/incidents (admin only) ──────────────────────────────────────────
// Returns ALL incidents — used by Admin Dashboard
router.get('/', authenticate, authorize('admin'), getAllIncidents);

// ── GET /api/incidents/:id ────────────────────────────────────────────────────
// Returns a single incident by ID (owner / expert / admin access)
router.get('/:id', authenticate, getIncidentById);

// ── POST /api/incidents/:id/note ─────────────────────────────────────────────
// Allows the incident OWNER (user) to post a reply / message to the expert
router.post('/:id/note', authenticate, authorize('user'), addUserNote);

// ── PATCH /api/incidents/:id/status ──────────────────────────────────────────
// Admin or Expert can update the incident status
router.patch('/:id/status', authenticate, authorize('admin', 'expert'), updateStatus);

module.exports = router;
