// controllers/incidentController.js
// Manages cybersecurity incident reports submitted by regular users.
// Handles file uploads, SHA-256 hashing, ML classification, and CRUD operations.

const pool = require('../config/db');
const { generateFileHash } = require('../utils/hashUtil');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
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
    // ── Read fields from multipart form ────────────────────────────────────
    // Frontend sends: title, type (incident_type), description
    const { title, description } = req.body;
    const incident_type = req.body.type || req.body.incident_type || 'hacking';
    const userId = req.user.id;

    // ── Validate required fields ────────────────────────────────────────────
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    // ── 1. Insert incident into incidents table ─────────────────────────────
    // Schema: id, user_id, title, description, incident_type, status, assigned_expert_id
    const [result] = await pool.query(
      `INSERT INTO incidents (user_id, title, description, incident_type, status)
       VALUES (?, ?, ?, ?, 'open')`,
      [userId, title, description, incident_type]
    );
    const incidentId = result.insertId;

    // ── 2. Handle file upload → insert into files table ─────────────────────
    let fileRecord = null;
    if (req.file) {
      // Generate SHA-256 hash for forensic integrity
      const sha256Hash = await generateFileHash(req.file.path);

      const [fileResult] = await pool.query(
        `INSERT INTO files (incident_id, original_filename, stored_filename, sha256_hash, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [
          incidentId,
          req.file.originalname,          // Original name from client
          req.file.filename,              // Stored name (timestamp-prefixed)
          sha256Hash,                     // SHA-256 fingerprint
          req.file.size                   // File size in bytes
        ]
      );
      fileRecord = { id: fileResult.insertId, sha256_hash: sha256Hash };

      // ── 3. Call ML service to classify the uploaded file ─────────────────
      try {
        let fileContent = '';
        try { fileContent = fs.readFileSync(req.file.path, 'utf8'); } catch(e) { fileContent = req.file.originalname; }
        const mlResponse = await axios.post(
          `${process.env.ML_SERVICE_URL}/analyze`,
          { log_content: fileContent || 'no content', file_id: fileRecord.id },
          { timeout: 15000 }
        );

        // ── 4. Save ML result into ml_predictions table ─────────────────────
        await pool.query(
          `INSERT INTO ml_predictions (file_id, threat_type, confidence_score, severity)
           VALUES (?, ?, ?, ?)`,
          [
            fileRecord.id,
            mlResponse.data.threat_type   || 'Unknown',
            mlResponse.data.confidence_score || 0.0,
            mlResponse.data.severity      || 'low'
          ]
        );
      } catch (mlErr) {
        // ML failure is non-fatal — incident is still saved
        console.warn('ML service unavailable:', mlErr.message);
      }
    }

    // ── 5. Return the created incident ──────────────────────────────────────
    const [rows] = await pool.query(
      'SELECT * FROM incidents WHERE id = ?',
      [incidentId]
    );

    return res.status(201).json({
      message: 'Incident reported successfully.',
      incident: rows[0]
    });

  } catch (err) {
    console.error('CreateIncident error:', err);
    return res.status(500).json({ message: err.message || 'Server error creating incident.' });
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
      `SELECT
         i.id,
         i.title,
         i.description,
         i.incident_type as type,
         i.status,
         i.created_at,
         i.updated_at,
         u.name AS assigned_expert_name,
         f.original_filename AS file_name,
         f.stored_filename AS stored_file_name,
         f.sha256_hash AS file_hash,
         mlp.threat_type AS ml_prediction,
         mlp.severity AS severity
       FROM incidents i
       LEFT JOIN users u ON i.assigned_expert_id = u.id
       LEFT JOIN files f ON f.incident_id = i.id
       LEFT JOIN ml_predictions mlp ON mlp.file_id = f.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [userId]
    );

    // Fetch conversation notes for each incident
    if (rows.length > 0) {
      const incidentIds = rows.map(r => r.id);
      const [notes] = await pool.query(
        `SELECT n.id, n.incident_id, n.note, n.created_at,
                n.author_name, n.author_role
         FROM incident_notes n
         WHERE n.incident_id IN (?)
         ORDER BY n.created_at ASC`,
        [incidentIds]
      );
      const notesByIncident = {};
      notes.forEach(n => {
        if (!notesByIncident[n.incident_id]) notesByIncident[n.incident_id] = [];
        notesByIncident[n.incident_id].push(n);
      });
      rows.forEach(r => { r.notes = notesByIncident[r.id] || []; });
    }

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
       SET assigned_expert_id = ?, status = 'in_progress', updated_at = NOW()
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

// ── USER ADDS NOTE / MESSAGE TO THEIR OWN INCIDENT ────────────────────────────

/**
 * addUserNote(req, res)
 * Allows the incident owner (user) to post a message/reply on their own incident.
 * This creates two-way communication between user and expert.
 * Expected body: { incidentId, note }
 */
const addUserNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { incidentId, note } = req.body;

    if (!incidentId || !note || note.trim() === '') {
      return res.status(400).json({ message: 'incidentId and note are required.' });
    }

    // Verify user owns this incident
    const [incidentRows] = await pool.query(
      'SELECT id FROM incidents WHERE id = ? AND user_id = ?',
      [incidentId, userId]
    );
    if (incidentRows.length === 0) {
      return res.status(403).json({ message: 'Access denied. This is not your incident.' });
    }

    await pool.query(
      'INSERT INTO incident_notes (incident_id, user_id, note) VALUES (?, ?, ?)',
      [incidentId, userId, note.trim()]
    );

    return res.status(201).json({ message: 'Message sent successfully.' });
  } catch (err) {
    console.error('AddUserNote error:', err);
    return res.status(500).json({ message: 'Server error sending message.' });
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
  updateStatus,
  addUserNote,
};
