// controllers/incidentController.js
// Manages cybersecurity incident reports submitted by regular users.
// Handles file uploads, SHA-256 hashing, ML classification, and CRUD operations.

const pool = require('../config/db');
const { generateFileHash } = require('../utils/hashUtil');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// ── CREATE INCIDENT ────────────────────────────────────────────────────────────

/**
 * createIncident(req, res)
 * Allows an authenticated user to report a new cybersecurity incident.
 *
 * Expected multipart/form-data:
 *   Fields: title, description, severity (low|medium|high|critical)
 *   File:   evidence (optional — attached log, pcap, image, etc.)
 *
 * Steps:
 *  1. Validate required text fields
 *  2. If a file was uploaded, compute its SHA-256 hash
 *  3. Call the ML microservice to classify the incident text
 *  4. Save everything to the incidents table
 *  5. Return the created incident
 */
const createIncident = async (req, res) => {
  try {
    const { title, description, severity } = req.body;
    const userId = req.user.id; // Set by authenticate middleware

    // ── Validate required text fields ───────────────────────────────────────
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    const incidentSeverity = severity || 'medium';

    // ── Handle optional file upload ─────────────────────────────────────────
    let filePath = null;
    let fileName = null;
    let fileHash = null;

    if (req.file) {
      // req.file is populated by multer when a file is uploaded
      filePath = req.file.path;                      // Absolute path on disk
      fileName = req.file.originalname;              // Original filename from client

      // Generate SHA-256 fingerprint of the uploaded file
      // This can be used later to detect if the same file was submitted twice
      fileHash = await generateFileHash(filePath);
    }

    // ── Call ML Microservice ────────────────────────────────────────────────
    // The ML service analyzes the incident title + description and predicts
    // what type of attack this might be (e.g., DDoS, Phishing, Malware).
    // We use a timeout so a slow ML service won't hang the entire request.
    let mlPrediction = 'Unknown';

    try {
      const mlResponse = await axios.post(
        `${process.env.ML_SERVICE_URL}/analyze`,
        { title, description },
        { timeout: 10000 } // 10-second timeout — ML inference can be slow
      );

      // Expect { prediction: "DDoS" } or { label: "Phishing" } from the ML service
      mlPrediction = mlResponse.data.prediction
        || mlResponse.data.label
        || 'Unknown';
    } catch (mlErr) {
      // If ML service is down, we still save the incident — just mark prediction unknown
      // This makes the system resilient: core functionality doesn't fail if ML is offline
      console.warn('ML service unavailable or timed out:', mlErr.message);
      mlPrediction = 'ML Service Unavailable';
    }

    // ── Save incident to database ───────────────────────────────────────────
    const [result] = await pool.query(
      `INSERT INTO incidents
         (user_id, title, description, severity, file_path, file_name, file_hash, ml_prediction, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [userId, title, description, incidentSeverity, filePath, fileName, fileHash, mlPrediction]
    );

    // ── Fetch the newly created record to return it ─────────────────────────
    const [rows] = await pool.query(
      'SELECT * FROM incidents WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Incident reported successfully.',
      incident: rows[0]
    });
  } catch (err) {
    console.error('CreateIncident error:', err);
    return res.status(500).json({ message: 'Server error creating incident.' });
  }
};

// ── GET CURRENT USER'S INCIDENTS ───────────────────────────────────────────────

/**
 * getUserIncidents(req, res)
 * Returns all incidents submitted by the currently logged-in user.
 * Also joins with the users table to include the assigned expert's name.
 */
const getUserIncidents = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT i.*, u.name AS assigned_expert_name
       FROM incidents i
       LEFT JOIN users u ON i.assigned_expert_id = u.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [userId]
    );

    return res.status(200).json({ incidents: rows });
  } catch (err) {
    console.error('GetUserIncidents error:', err);
    return res.status(500).json({ message: 'Server error fetching incidents.' });
  }
};

// ── GET ALL INCIDENTS (Admin only) ─────────────────────────────────────────────

/**
 * getAllIncidents(req, res)
 * Returns every incident in the system with reporter and expert info.
 * Protected by authorize('admin') in the route definition.
 */
const getAllIncidents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         i.*,
         reporter.name  AS reporter_name,
         reporter.email AS reporter_email,
         expert.name    AS assigned_expert_name,
         expert.email   AS assigned_expert_email
       FROM incidents i
       LEFT JOIN users reporter ON i.user_id = reporter.id
       LEFT JOIN users expert   ON i.assigned_expert_id = expert.id
       ORDER BY i.created_at DESC`
    );

    return res.status(200).json({ incidents: rows });
  } catch (err) {
    console.error('GetAllIncidents error:', err);
    return res.status(500).json({ message: 'Server error fetching all incidents.' });
  }
};

// ── GET SINGLE INCIDENT BY ID ──────────────────────────────────────────────────

/**
 * getIncidentById(req, res)
 * Returns a single incident's full details including notes.
 * Accessible by the incident owner, assigned expert, or admin.
 */
const getIncidentById = async (req, res) => {
  try {
    const incidentId = req.params.id;
    const { id: userId, role } = req.user;

    // ── Fetch incident with reporter and expert details ─────────────────────
    const [rows] = await pool.query(
      `SELECT
         i.*,
         reporter.name  AS reporter_name,
         reporter.email AS reporter_email,
         expert.name    AS assigned_expert_name
       FROM incidents i
       LEFT JOIN users reporter ON i.user_id = reporter.id
       LEFT JOIN users expert   ON i.assigned_expert_id = expert.id
       WHERE i.id = ?`,
      [incidentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Incident not found.' });
    }

    const incident = rows[0];

    // ── Access control ──────────────────────────────────────────────────────
    // Admin can see all. Expert can see their assigned ones. User sees only their own.
    if (
      role !== 'admin' &&
      role !== 'expert' &&
      incident.user_id !== userId
    ) {
      return res.status(403).json({ message: 'Access denied to this incident.' });
    }

    // ── Fetch related notes ─────────────────────────────────────────────────
    const [notes] = await pool.query(
      `SELECT n.*, u.name AS author_name
       FROM incident_notes n
       JOIN users u ON n.user_id = u.id
       WHERE n.incident_id = ?
       ORDER BY n.created_at ASC`,
      [incidentId]
    );

    return res.status(200).json({ incident, notes });
  } catch (err) {
    console.error('GetIncidentById error:', err);
    return res.status(500).json({ message: 'Server error fetching incident.' });
  }
};

// ── ASSIGN EXPERT (Admin only) ─────────────────────────────────────────────────

/**
 * assignExpert(req, res)
 * Admin assigns a cybersecurity expert to an incident.
 *
 * Expected body: { incidentId, expertId }
 */
const assignExpert = async (req, res) => {
  try {
    const { incidentId, expertId } = req.body;

    if (!incidentId || !expertId) {
      return res.status(400).json({ message: 'incidentId and expertId are required.' });
    }

    // ── Verify the target user is actually an expert ────────────────────────
    const [expertRows] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'expert'",
      [expertId]
    );
    if (expertRows.length === 0) {
      return res.status(404).json({ message: 'Expert user not found.' });
    }

    // ── Update the incident ─────────────────────────────────────────────────
    const [result] = await pool.query(
      `UPDATE incidents
       SET assigned_expert_id = ?, status = 'assigned', updated_at = NOW()
       WHERE id = ?`,
      [expertId, incidentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Incident not found.' });
    }

    return res.status(200).json({ message: 'Expert assigned successfully.' });
  } catch (err) {
    console.error('AssignExpert error:', err);
    return res.status(500).json({ message: 'Server error assigning expert.' });
  }
};

// ── UPDATE STATUS ──────────────────────────────────────────────────────────────

/**
 * updateStatus(req, res)
 * Updates the status of an incident.
 * Allowed statuses: open | assigned | in_progress | resolved | closed
 *
 * Expected body: { status }
 */
const updateStatus = async (req, res) => {
  try {
    const incidentId = req.params.id;
    const { status } = req.body;

    const VALID_STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const [result] = await pool.query(
      'UPDATE incidents SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, incidentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Incident not found.' });
    }

    return res.status(200).json({ message: `Status updated to "${status}".` });
  } catch (err) {
    console.error('UpdateStatus error:', err);
    return res.status(500).json({ message: 'Server error updating status.' });
  }
};

module.exports = {
  createIncident,
  getUserIncidents,
  getAllIncidents,
  getIncidentById,
  assignExpert,
  updateStatus
};
