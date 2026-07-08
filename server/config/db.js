// config/db.js
// Creates and exports a MySQL2 connection pool using environment variables.
// Using a pool (instead of a single connection) allows multiple concurrent
// queries — critical for a web server handling many requests simultaneously.

const mysql = require('mysql2/promise'); // Promise-based MySQL2 driver
require('dotenv').config();              // Load variables from .env file

// createPool returns a pool object that manages multiple DB connections.
// The pool automatically creates new connections when needed and recycles old ones.
const pool = mysql.createPool({
  host: process.env.DB_HOST,       // Database server host (e.g. localhost)
  user: process.env.DB_USER,       // MySQL username (e.g. root)
  password: process.env.DB_PASS,   // MySQL password
  database: process.env.DB_NAME,   // Database name (shield_source)
  waitForConnections: true,        // Queue queries if pool is busy
  connectionLimit: 10,             // Max 10 simultaneous connections
  queueLimit: 0                    // 0 = unlimited waiting queue
});

module.exports = pool;
