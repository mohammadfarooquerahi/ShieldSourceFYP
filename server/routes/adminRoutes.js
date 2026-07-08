// routes/adminRoutes.js
// Defines admin-only management endpoints.
// These routes are mounted at /api/admin in index.js
// All routes require authenticate + authorize('admin')

const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getAllIncidentsAdmin,
  assignExpert,
  getStats
} = require('../controllers/adminController');

const { authenticate, authorize } = require('../middleware/authMiddleware');

// Shorthand middleware array — applied to every route in this file
// rather than repeating authenticate, authorize('admin') on each one.
// Both middleware functions run in sequence for every admin route.
const adminGuard = [authenticate, authorize('admin')];

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// Returns all registered users (id, name, email, role, created_at).
// Passwords are never included in the query result.
router.get('/users', adminGuard, getAllUsers);

// ── GET /api/admin/incidents ──────────────────────────────────────────────────
// Returns all incidents with full joins (reporter, expert, ML prediction).
router.get('/incidents', adminGuard, getAllIncidentsAdmin);

// ── POST /api/admin/assign ────────────────────────────────────────────────────
// Assigns a specific expert user to handle an incident.
// Body: { incidentId, expertId }
router.post('/assign', adminGuard, assignExpert);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
// Returns aggregated dashboard statistics:
//   - Total users / by role
//   - Total incidents / by status / by severity / by ML prediction
router.get('/stats', adminGuard, getStats);

module.exports = router;
