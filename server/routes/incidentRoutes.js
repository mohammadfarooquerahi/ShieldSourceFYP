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
  updateStatus
} = require('../controllers/incidentController');

const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ── POST /api/incidents ───────────────────────────────────────────────────────
// Protected: any authenticated user can report an incident.
// upload.single('evidence') tells Multer to look for a single file
// in the form field named "evidence". If no file is sent, req.file is undefined.
// Body (multipart/form-data): { title, description, severity } + optional file "evidence"
router.post(
  '/',
  authenticate,                    // Step 1: Verify JWT
  upload.single('evidence'),       // Step 2: Process file upload (if any)
  createIncident                   // Step 3: Business logic
);

// ── GET /api/incidents/my ─────────────────────────────────────────────────────
// Protected: returns ONLY the incidents submitted by the logged-in user.
// IMPORTANT: This route must be defined BEFORE '/:id' to prevent Express
// from treating "my" as a route parameter value.
router.get('/my', authenticate, getUserIncidents);

// ── GET /api/incidents (admin only) ──────────────────────────────────────────
// Protected: returns ALL incidents. Admin dashboard use-case.
router.get('/', authenticate, authorize('admin'), getAllIncidents);

// ── GET /api/incidents/:id ────────────────────────────────────────────────────
// Protected: returns a single incident by ID.
// Controller performs additional access check (owner/expert/admin).
router.get('/:id', authenticate, getIncidentById);

// ── PATCH /api/incidents/:id/status ──────────────────────────────────────────
// Protected: admin or expert can update incident status.
// Body: { status }
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'expert'), // Both admins and experts can change status
  updateStatus
);

module.exports = router;
