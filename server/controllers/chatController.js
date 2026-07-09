// controllers/chatController.js
// Handles fetching and sending chat messages for an incident
// Both the incident owner (user) and the assigned expert can read/write

const pool = require('../config/db');

// ── GET MESSAGES ──────────────────────────────────────────────────────────────
// GET /api/chat/:incidentId
// Returns all messages for the incident, with author name and role
const getMessages = async (req, res) => {
  try {
    const incidentId = req.params.incidentId;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // Access control: only owner, assigned expert, or admin can read
    if (requesterRole !== 'admin') {
      const [incRows] = await pool.query(
        `SELECT user_id, assigned_expert_id FROM incidents WHERE id = ?`,
        [incidentId]
      );
      if (incRows.length === 0)
        return res.status(404).json({ message: 'Incident not found.' });

      const inc = incRows[0];
      const isOwner   = inc.user_id === requesterId;
      const isExpert  = inc.assigned_expert_id === requesterId;
      if (!isOwner && !isExpert)
        return res.status(403).json({ message: 'Access denied.' });
    }

    const [messages] = await pool.query(
      `SELECT
         n.id,
         n.incident_id,
         n.note        AS message,
         n.created_at,
         u.id          AS sender_id,
         u.name        AS sender_name,
         u.role        AS sender_role
       FROM incident_notes n
       JOIN users u ON n.user_id = u.id
       WHERE n.incident_id = ?
       ORDER BY n.created_at ASC`,
      [incidentId]
    );

    return res.status(200).json({ messages });
  } catch (err) {
    console.error('GetMessages error:', err);
    return res.status(500).json({ message: 'Failed to fetch messages.' });
  }
};

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
// POST /api/chat/:incidentId
// Body: { message: "text here" }
// Both owner (user) and assigned expert (and admin) can send
const sendMessage = async (req, res) => {
  try {
    const incidentId  = req.params.incidentId;
    const senderId    = req.user.id;
    const senderRole  = req.user.role;
    const { message } = req.body;

    if (!message || message.trim() === '')
      return res.status(400).json({ message: 'Message cannot be empty.' });

    // Access control
    if (senderRole !== 'admin') {
      const [incRows] = await pool.query(
        `SELECT user_id, assigned_expert_id FROM incidents WHERE id = ?`,
        [incidentId]
      );
      if (incRows.length === 0)
        return res.status(404).json({ message: 'Incident not found.' });

      const inc = incRows[0];
      const isOwner  = inc.user_id === senderId;
      const isExpert = inc.assigned_expert_id === senderId;
      if (!isOwner && !isExpert)
        return res.status(403).json({ message: 'Access denied.' });
    }

    const [result] = await pool.query(
      `INSERT INTO incident_notes (incident_id, user_id, note) VALUES (?, ?, ?)`,
      [incidentId, senderId, message.trim()]
    );

    // Return the newly created message with sender info
    const [newMsg] = await pool.query(
      `SELECT
         n.id, n.incident_id, n.note AS message, n.created_at,
         u.id AS sender_id, u.name AS sender_name, u.role AS sender_role
       FROM incident_notes n
       JOIN users u ON n.user_id = u.id
       WHERE n.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ message: newMsg[0] });
  } catch (err) {
    console.error('SendMessage error:', err);
    return res.status(500).json({ message: 'Failed to send message.' });
  }
};

module.exports = { getMessages, sendMessage };
