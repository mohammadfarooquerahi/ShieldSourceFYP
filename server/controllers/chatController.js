// controllers/chatController.js
// Handles fetching and sending chat messages for an incident
// Uses incident_notes table columns: id, incident_id, author_id, author_name, author_role, note, created_at

const pool = require('../config/db');

// GET /api/chat/:incidentId
const getMessages = async (req, res) => {
  try {
    const incidentId    = req.params.incidentId;
    const requesterId   = req.user.id;
    const requesterRole = req.user.role;

    // Access control: only owner, assigned expert, or admin
    if (requesterRole !== 'admin') {
      const [incRows] = await pool.query(
        'SELECT user_id, assigned_expert_id FROM incidents WHERE id = ?',
        [incidentId]
      );
      if (incRows.length === 0)
        return res.status(404).json({ message: 'Incident not found.' });

      const inc      = incRows[0];
      const isOwner  = inc.user_id          === requesterId;
      const isExpert = inc.assigned_expert_id === requesterId;
      if (!isOwner && !isExpert)
        return res.status(403).json({ message: 'Access denied.' });
    }

    // Fetch messages — no JOIN needed, author info stored directly in table
    const [messages] = await pool.query(
      `SELECT
         id,
         incident_id,
         note        AS message,
         created_at,
         author_id   AS sender_id,
         author_name AS sender_name,
         author_role AS sender_role
       FROM incident_notes
       WHERE incident_id = ?
       ORDER BY created_at ASC`,
      [incidentId]
    );

    return res.status(200).json({ messages });
  } catch (err) {
    console.error('GetMessages error:', err);
    return res.status(500).json({ message: 'Failed to fetch messages.' });
  }
};

// POST /api/chat/:incidentId
const sendMessage = async (req, res) => {
  try {
    const incidentId  = req.params.incidentId;
    const senderId    = req.user.id;
    const senderRole  = req.user.role;
    const senderName  = req.user.name;
    const { message } = req.body;

    if (!message || message.trim() === '')
      return res.status(400).json({ message: 'Message cannot be empty.' });

    // Access control
    if (senderRole !== 'admin') {
      const [incRows] = await pool.query(
        'SELECT user_id, assigned_expert_id FROM incidents WHERE id = ?',
        [incidentId]
      );
      if (incRows.length === 0)
        return res.status(404).json({ message: 'Incident not found.' });

      const inc      = incRows[0];
      const isOwner  = inc.user_id          === senderId;
      const isExpert = inc.assigned_expert_id === senderId;
      if (!isOwner && !isExpert)
        return res.status(403).json({ message: 'Access denied.' });
    }

    // Insert — use author_id/author_name/author_role columns (not user_id)
    const [result] = await pool.query(
      `INSERT INTO incident_notes (incident_id, author_id, author_name, author_role, note)
       VALUES (?, ?, ?, ?, ?)`,
      [incidentId, senderId, senderName, senderRole, message.trim()]
    );

    // Return the newly created message
    const [newMsg] = await pool.query(
      `SELECT
         id, incident_id, note AS message, created_at,
         author_id AS sender_id, author_name AS sender_name, author_role AS sender_role
       FROM incident_notes WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ message: newMsg[0] });
  } catch (err) {
    console.error('SendMessage error:', err);
    return res.status(500).json({ message: 'Failed to send message.' });
  }
};

module.exports = { getMessages, sendMessage };
