// ─────────────────────────────────────────────
// Shield-Source | Main Server Entry Point
// Mounts all routes and starts Express server
// ─────────────────────────────────────────────
const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const authRoutes     = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const expertRoutes   = require('./routes/expertRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const chatRoutes     = require('./routes/chatRoutes');
const mlServiceUrl   = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const app = express();

// ── Middleware ──────────────────────────────
// Allow requests from React frontend on ANY localhost port (3001, 5173, etc.)
app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins (Localhost + Vercel) for FYP
    callback(null, true);
  },
  credentials: true
}));

// Parse incoming JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded evidence files statically
// NOTE: files are stored outside public root for security
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ──────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/expert',    expertRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/chat',      chatRoutes);     // Two-way chat per incident

// ── Health Check ────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'Shield-Source API is running', timestamp: new Date() });
});

// ── Global Error Handler ─────────────────────
// Catches any unhandled errors from route handlers
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  // Never expose raw stack traces to the client
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ── Start Server ─────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🛡️  Shield-Source API running on http://localhost:${PORT}`);
  console.log(`📁  Uploads stored at: ${path.join(__dirname, 'uploads')}`);
  console.log(`🤖  ML Service URL: ${mlServiceUrl}`);
});
