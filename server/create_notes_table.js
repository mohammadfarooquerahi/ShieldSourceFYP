const pool = require('./config/db');

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incident_notes (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        incident_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('SUCCESS: incident_notes table created!');
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

setup();
