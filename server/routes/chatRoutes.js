// routes/chatRoutes.js
// Chat API — mounted at /api/chat in index.js
// Handles two-way communication between user and expert per incident

const express = require('express');
const router  = express.Router();
const { getMessages, sendMessage } = require('../controllers/chatController');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/chat/:incidentId  — fetch all messages for an incident
// Accessible by: incident owner (user) + assigned expert + admin
router.get('/:incidentId', authenticate, getMessages);

// POST /api/chat/:incidentId — send a new message
// Accessible by: incident owner (user) + assigned expert + admin
router.post('/:incidentId', authenticate, sendMessage);

module.exports = router;
