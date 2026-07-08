// controllers/authController.js
// Handles user authentication: registration, login, and profile fetch.
// Uses bcryptjs for password hashing and jsonwebtoken for session tokens.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// ── REGISTER ─────────────────────────────────────────────────────────────────

/**
 * register(req, res)
 * Creates a new user account.
 *
 * Expected request body:
 *   { name, email, password, role? }
 *
 * Role defaults to 'user'. Admins can create 'expert' or 'admin' accounts
 * via a separate admin flow, but here we restrict to 'user' for public registration.
 *
 * Steps:
 *  1. Validate required fields
 *  2. Check if email already exists
 *  3. Hash password with bcrypt (10 salt rounds = good security vs speed balance)
 *  4. Insert new user into DB
 *  5. Return success (no token here — user must log in)
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ── Validate required fields ────────────────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    // ── Check for duplicate email ───────────────────────────────────────────
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // ── Hash the password ───────────────────────────────────────────────────
    // bcrypt salt rounds = 10 means 2^10 = 1024 iterations — strong enough
    // to slow brute-force attacks without making registration noticeably slow.
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Determine role ──────────────────────────────────────────────────────
    // Public registration only allows 'user'. Role escalation is admin-only.
    const userRole = role === 'expert' || role === 'admin' ? 'user' : (role || 'user');

    // ── Insert into database ────────────────────────────────────────────────
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, userRole]
    );

    return res.status(201).json({
      message: 'Registration successful.',
      userId: result.insertId
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────

/**
 * login(req, res)
 * Authenticates a user and returns a signed JWT.
 *
 * Expected request body:
 *   { email, password }
 *
 * Steps:
 *  1. Find user by email
 *  2. Compare plain password against stored bcrypt hash
 *  3. Sign a JWT with user's id, email, and role (expires in 24h)
 *  4. Return token + basic user info
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validate fields ─────────────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // ── Find user by email ──────────────────────────────────────────────────
    const [rows] = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Intentionally vague — don't reveal whether the email exists
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];

    // ── Compare password with stored hash ───────────────────────────────────
    // bcrypt.compare handles the salt extraction automatically
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // ── Create JWT ──────────────────────────────────────────────────────────
    // The payload is embedded inside the token (NOT encrypted, just signed).
    // Never put sensitive data like the full password hash in the payload.
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Token valid for 24 hours
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

// ── GET ME ────────────────────────────────────────────────────────────────────

/**
 * getMe(req, res)
 * Returns the current authenticated user's profile.
 * req.user is populated by the authenticate middleware.
 * We re-query the DB for fresh data (in case name/role changed since token was issued).
 */
const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Server error fetching profile.' });
  }
};

module.exports = { register, login, getMe };
