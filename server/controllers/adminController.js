// controllers/adminController.js
// Provides full administrative control over users, incidents, and system stats.
// All functions are protected by authenticate + authorize('admin') in the routes.

const pool = require('../config/db');

// ── GET ALL USERS ──────────────────────────────────────────────────────────────

/**
 * getAllUsers(req, res)
 * Returns all registered users with their basic profile details.
 * Passwords are deliberately excluded from the SELECT for security.
 */
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.status(200).json({ users: rows });
  } catch (err) {
    console.error('GetAllUsers error:', err);
    return res.status(500).json({ message: 'Server error fetching users.' });
  }
};

// ── GET ALL INCIDENTS WITH JOINS ───────────────────────────────────────────────

/**
 * getAllIncidentsAdmin(req, res)
 * Returns all incidents with full details — reporter info, expert info,
 * ML prediction, file hash, and current status.
 * Uses LEFT JOINs so incidents with no assigned expert still appear.
 */
const getAllIncidentsAdmin = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         i.id,
         i.title,
         i.description,
         i.severity,
         i.status,
         i.ml_prediction,
         i.file_name,
         i.file_hash,
         i.created_at,
         i.updated_at,
         reporter.id    AS reporter_id,
         reporter.name  AS reporter_name,
         reporter.email AS reporter_email,
         expert.id      AS expert_id,
         expert.name    AS expert_name,
         expert.email   AS expert_email
       FROM incidents i
       LEFT JOIN users reporter ON i.user_id = reporter.id
       LEFT JOIN users expert   ON i.assigned_expert_id = expert.id
       ORDER BY i.created_at DESC`
    );

    return res.status(200).json({ incidents: rows });
  } catch (err) {
    console.error('GetAllIncidentsAdmin error:', err);
    return res.status(500).json({ message: 'Server error fetching incidents.' });
  }
};

// ── ASSIGN EXPERT ──────────────────────────────────────────────────────────────

/**
 * assignExpert(req, res)
 * Admin assigns a specific expert user to handle an incident.
 *
 * Expected body: { incidentId, expertId }
 *
 * Also auto-transitions incident status from 'open' → 'assigned'
 * only if it is currently 'open' (prevents re-assigning resolved incidents
 * without explicitly re-opening them).
 */
const assignExpert = async (req, res) => {
  try {
    const { incidentId, expertId } = req.body;

    if (!incidentId || !expertId) {
      return res.status(400).json({ message: 'incidentId and expertId are required.' });
    }

    // ── Verify the target user exists and has the 'expert' role ────────────
    const [expertRows] = await pool.query(
      "SELECT id, name FROM users WHERE id = ? AND role = 'expert'",
      [expertId]
    );
    if (expertRows.length === 0) {
      return res.status(404).json({ message: 'Expert not found or user is not an expert.' });
    }

    // ── Verify the incident exists ─────────────────────────────────────────
    const [incidentRows] = await pool.query(
      'SELECT id, status FROM incidents WHERE id = ?',
      [incidentId]
    );
    if (incidentRows.length === 0) {
      return res.status(404).json({ message: 'Incident not found.' });
    }

    // ── Perform the assignment ─────────────────────────────────────────────
    // CASE expression: only change 'open' to 'assigned'; keep other statuses
    await pool.query(
      `UPDATE incidents
       SET assigned_expert_id = ?,
           status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END,
           updated_at = NOW()
       WHERE id = ?`,
      [expertId, incidentId]
    );

    return res.status(200).json({
      message: `Expert "${expertRows[0].name}" assigned to incident #${incidentId}.`
    });
  } catch (err) {
    console.error('AssignExpert admin error:', err);
    return res.status(500).json({ message: 'Server error assigning expert.' });
  }
};

// ── GET DASHBOARD STATS ────────────────────────────────────────────────────────

/**
 * getStats(req, res)
 * Returns aggregated counts for the admin dashboard.
 *
 * Provides:
 *  - Total users (by role)
 *  - Total incidents (by status)
 *  - Total incidents (by severity)
 *  - Total incidents (by ML prediction category)
 *
 * Uses separate queries for clarity and maintainability.
 * Could be combined into one query with subqueries for performance at scale.
 */
const getStats = async (req, res) => {
  try {
    // ── User counts by role ─────────────────────────────────────────────────
    const [userStats] = await pool.query(
      `SELECT role, COUNT(*) AS count
       FROM users
       GROUP BY role`
    );

    // ── Incident counts by status ───────────────────────────────────────────
    const [statusStats] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM incidents
       GROUP BY status`
    );

    // ── Incident counts by severity ─────────────────────────────────────────
    const [severityStats] = await pool.query(
      `SELECT severity, COUNT(*) AS count
       FROM incidents
       GROUP BY severity`
    );

    // ── Incident counts by ML prediction ───────────────────────────────────
    const [mlStats] = await pool.query(
      `SELECT ml_prediction, COUNT(*) AS count
       FROM incidents
       GROUP BY ml_prediction
       ORDER BY count DESC`
    );

    // ── Overall totals ──────────────────────────────────────────────────────
    const [[{ totalUsers }]] = await pool.query(
      'SELECT COUNT(*) AS totalUsers FROM users'
    );
    const [[{ totalIncidents }]] = await pool.query(
      'SELECT COUNT(*) AS totalIncidents FROM incidents'
    );

    return res.status(200).json({
      totalUsers,
      totalIncidents,
      usersByRole: userStats,
      incidentsByStatus: statusStats,
      incidentsBySeverity: severityStats,
      incidentsByMLPrediction: mlStats
    });
  } catch (err) {
    console.error('GetStats error:', err);
    return res.status(500).json({ message: 'Server error fetching stats.' });
  }
};

module.exports = { getAllUsers, getAllIncidentsAdmin, assignExpert, getStats };
