// routes/expertRoutes.js
// Defines endpoints available exclusively to authenticated experts.
// These routes are mounted at /api/expert in index.js

const express = require('express');
const router = express.Router();

const {
  getAssignedIncidents,
  addNote,
  updateIncidentStatus
} = require('../controllers/expertController');

const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes in this file require:
//   1. A valid JWT (authenticate)
//   2. The user must have the 'expert' role (authorize)

// ── GET /api/expert/assigned ──────────────────────────────────────────────────
// Returns all incidents currently assigned to the logged-in expert.
router.get('/assigned', authenticate, authorize('expert', 'admin'), getAssignedIncidents);

// ── POST /api/expert/note ─────────────────────────────────────────────────────
// Adds an investigation note to a specific incident.
// Body: { incidentId, note }
// Controller verifies the expert is actually assigned to the target incident.
router.post('/note', authenticate, authorize('expert', 'admin'), addNote);

// ── PATCH /api/expert/status ──────────────────────────────────────────────────
// Expert updates the status of one of their assigned incidents.
// Body: { incidentId, status }
// Allowed status values: in_progress | resolved | closed
router.patch('/status', authenticate, authorize('expert', 'admin'), updateIncidentStatus);

module.exports = router;
