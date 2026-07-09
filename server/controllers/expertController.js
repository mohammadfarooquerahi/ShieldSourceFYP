// controllers/expertController.js
// Handles actions available exclusively to cybersecurity experts:
//  - Viewing incidents assigned to them
//  - Adding investigation notes
//  - Updating incident status after analysis

const pool = require('../config/db');

// ── GET ASSIGNED INCIDENTS ─────────────────────────────────────────────────────

/**
 * getAssignedIncidents(req, res)
 * Returns all incidents where the current expert is the assigned expert.
 * Also fetches the incident reporter's name for context.
 */
const getAssignedIncidents = async (req, res) => {
  try {
    const expertId = req.user.id; // Comes from authenticate middleware

    const [rows] = await pool.query(
      `SELECT
         i.id,
         i.title,
         i.description,
         i.incident_type as type,
         i.status,
         i.created_at,
         i.updated_at,
         u.name  AS reporter_name,
         u.email AS reporter_email,
         f.original_filename AS file_name,
         f.stored_filename   AS stored_file_name,
         f.sha256_hash AS file_hash,
         mlp.threat_type AS ml_prediction,
         mlp.severity AS severity
       FROM incidents i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN files f ON f.incident_id = i.id
       LEFT JOIN ml_predictions mlp ON mlp.file_id = f.id
       WHERE i.assigned_expert_id = ?
       ORDER BY i.created_at DESC`,
      [expertId]
    );

    if (rows.length > 0) {
      const incidentIds = rows.map(r => r.id);
      const [notes] = await pool.query(
        'SELECT id, incident_id, note, created_at FROM incident_notes WHERE incident_id IN (?) ORDER BY created_at ASC',
        [incidentIds]
      );
      
      const notesByIncident = {};
      notes.forEach(n => {
        if (!notesByIncident[n.incident_id]) notesByIncident[n.incident_id] = [];
        notesByIncident[n.incident_id].push(n);
      });

      rows.forEach(r => {
        r.notes = notesByIncident[r.id] || [];
      });
    }

    return res.status(200).json({ incidents: rows });
  } catch (err) {
    console.error('GetAssignedIncidents error:', err);
    return res.status(500).json({ message: 'Server error fetching assigned incidents.' });
  }
};

// ── ADD INVESTIGATION NOTE ─────────────────────────────────────────────────────

/**
 * addNote(req, res)
 * Allows an expert to add a text note to an incident.
 * Notes form an audit trail of the investigation.
 *
 * Expected body: { incidentId, note }
 *
 * Security: We verify the expert is actually assigned to the incident
 * before allowing them to add a note (prevents cross-incident access).
 */
const addNote = async (req, res) => {
  try {
    const expertId = req.user.id;
    const { incidentId, note } = req.body;

    // ── Validate required fields ────────────────────────────────────────────
    if (!incidentId || !note || note.trim() === '') {
      return res.status(400).json({ message: 'incidentId and note content are required.' });
    }

    // ── Verify the expert is assigned to this incident ──────────────────────
    // This prevents one expert from adding notes to another expert's incident
    const [incidentRows] = await pool.query(
      'SELECT id FROM incidents WHERE id = ? AND assigned_expert_id = ?',
      [incidentId, expertId]
    );

    if (incidentRows.length === 0) {
      return res.status(403).json({
        message: 'Access denied. You are not assigned to this incident.'
      });
    }

    // ── Insert note into incident_notes table ───────────────────────────────
    const [result] = await pool.query(
      'INSERT INTO incident_notes (incident_id, user_id, note) VALUES (?, ?, ?)',
      [incidentId, expertId, note.trim()]
    );

    return res.status(201).json({
      message: 'Note added successfully.',
      noteId: result.insertId
    });
  } catch (err) {
    console.error('AddNote error:', err);
    return res.status(500).json({ message: 'Server error adding note.' });
  }
};

// ── UPDATE INCIDENT STATUS (Expert) ───────────────────────────────────────────

/**
 * updateIncidentStatus(req, res)
 * Allows the assigned expert to update the status of their incident.
 * E.g., moving from 'assigned' → 'in_progress' → 'resolved'.
 *
 * Expected body: { incidentId, status }
 *
 * Same security check: expert must own the assignment.
 */
const updateIncidentStatus = async (req, res) => {
  try {
    const expertId = req.user.id;
    const { incidentId, status } = req.body;

    // ── Validate status value ───────────────────────────────────────────────
    const VALID_STATUSES = ['in_progress', 'resolved'];
    if (!incidentId || !status) {
      return res.status(400).json({ message: 'incidentId and status are required.' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Experts can set status to: ${VALID_STATUSES.join(', ')}`
      });
    }

    // ── Verify expert owns the assignment ───────────────────────────────────
    const [incidentRows] = await pool.query(
      'SELECT id FROM incidents WHERE id = ? AND assigned_expert_id = ?',
      [incidentId, expertId]
    );

    if (incidentRows.length === 0) {
      return res.status(403).json({
        message: 'Access denied. You are not assigned to this incident.'
      });
    }

    // ── Update the status ───────────────────────────────────────────────────
    await pool.query(
      'UPDATE incidents SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, incidentId]
    );

    return res.status(200).json({
      message: `Incident status updated to "${status}".`
    });
  } catch (err) {
    console.error('UpdateIncidentStatus error:', err);
    return res.status(500).json({ message: 'Server error updating status.' });
  }
};

module.exports = { getAssignedIncidents, addNote, updateIncidentStatus };
