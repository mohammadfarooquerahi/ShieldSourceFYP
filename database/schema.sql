-- =============================================================================
-- Shield-Source Cybersecurity Incident Response System
-- Database Schema
-- File   : schema.sql
-- Purpose: Creates all tables required by the Node.js backend API.
--          Run once against a fresh MySQL 8 instance.
-- Usage  : mysql -u root -p < schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create and select the database
-- ---------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS shield_source
  CHARACTER SET utf8mb4          -- Full Unicode support (emojis, CJK, etc.)
  COLLATE utf8mb4_unicode_ci;    -- Case-insensitive, accent-insensitive sorting

USE shield_source;

-- ---------------------------------------------------------------------------
-- 2. users
--    Stores all system users: normal users, cybersecurity experts, admins.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name          VARCHAR(120)    NOT NULL,                         -- Display name
    email         VARCHAR(255)    NOT NULL UNIQUE,                  -- Login identity
    password_hash VARCHAR(255)    NOT NULL,                         -- bcrypt hash (never plain-text)
    role          ENUM(
                    'user',       -- Can submit incidents and upload log files
                    'expert',     -- Can be assigned incidents, add notes
                    'admin'       -- Full access, user management
                  )               NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_users_email (email),   -- Fast login lookup
    INDEX idx_users_role  (role)     -- Filter experts for assignment
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 3. incidents
--    Each row represents one reported cybersecurity incident.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
    id                 INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id            INT UNSIGNED    NOT NULL,                    -- Reporter (FK → users)
    title              VARCHAR(255)    NOT NULL,
    description        TEXT            NOT NULL,
    incident_type      ENUM(
                         'hacking',              -- General unauthorised system compromise
                         'malware',              -- Virus, trojan, worm infections
                         'ransomware',           -- Files encrypted / ransom demanded
                         'phishing',             -- Social-engineering email attacks
                         'data_theft',           -- Exfiltration of sensitive data
                         'unauthorized_access'   -- Logins without permission
                       )               NOT NULL,
    status             ENUM(
                         'open',                 -- Newly submitted, awaiting triage
                         'in_progress',          -- Expert working on it
                         'resolved'              -- Case closed
                       )               NOT NULL DEFAULT 'open',
    assigned_expert_id INT UNSIGNED    NULL,                       -- NULL until assigned
    created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_incidents_user
        FOREIGN KEY (user_id)            REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_incidents_expert
        FOREIGN KEY (assigned_expert_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_incidents_user_id   (user_id),
    INDEX idx_incidents_expert_id (assigned_expert_id),
    INDEX idx_incidents_status    (status),
    INDEX idx_incidents_type      (incident_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 4. files
--    Log / evidence files uploaded by users against an incident.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS files (
    id                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    incident_id       INT UNSIGNED    NOT NULL,                    -- FK → incidents
    original_filename VARCHAR(255)    NOT NULL,                    -- As uploaded by the user
    stored_filename   VARCHAR(255)    NOT NULL,                    -- UUID-based name on disk
    sha256_hash       CHAR(64)        NOT NULL,                    -- Integrity check (hex string)
    file_size         BIGINT UNSIGNED NOT NULL,                    -- Bytes
    uploaded_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_files_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,

    INDEX idx_files_incident_id  (incident_id),
    INDEX idx_files_sha256       (sha256_hash)   -- Detect duplicate uploads
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 5. expert_notes
--    Forensic notes written by assigned cybersecurity experts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expert_notes (
    id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    incident_id  INT UNSIGNED    NOT NULL,                         -- FK → incidents
    expert_id    INT UNSIGNED    NOT NULL,                         -- FK → users (role=expert)
    note_content TEXT            NOT NULL,                         -- Markdown-supported content
    created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_notes_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_expert
        FOREIGN KEY (expert_id)   REFERENCES users(id)     ON DELETE CASCADE,

    INDEX idx_notes_incident_id (incident_id),
    INDEX idx_notes_expert_id   (expert_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 6. incident_notes
--    Two-way incident communication notes/messages (user, expert, admin).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incident_notes (
    id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    incident_id  INT UNSIGNED    NOT NULL,
    user_id      INT UNSIGNED    NOT NULL,                         -- FK → users (author)
    author_id    INT UNSIGNED    NULL,                             -- Denormalized snapshot for chat APIs
    author_name  VARCHAR(120)    NULL,
    author_role  ENUM('user', 'expert', 'admin') NULL,
    note         TEXT            NOT NULL,
    created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_incident_notes_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    CONSTRAINT fk_incident_notes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_incident_notes_incident_id (incident_id),
    INDEX idx_incident_notes_user_id     (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 7. ml_predictions
--    Stores the output of the Python ML microservice for each uploaded file.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ml_predictions (
    id               INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    file_id          INT UNSIGNED      NOT NULL,                   -- FK → files
    threat_type      VARCHAR(100)      NOT NULL,                   -- e.g. SQL_Injection
    confidence_score DECIMAL(5, 4)     NOT NULL,                   -- 0.0000 – 1.0000
    severity         ENUM(
                       'low',          -- Normal / informational
                       'medium',       -- Moderate threat (e.g. Brute_Force)
                       'high',         -- Serious threat (e.g. SQL_Injection)
                       'critical'      -- Immediate action required (e.g. DDoS, Ransomware)
                     )                 NOT NULL,
    created_at       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_predictions_file
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,

    INDEX idx_predictions_file_id  (file_id),
    INDEX idx_predictions_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- SEED DATA
-- =============================================================================
-- Default admin account
--   email    : admin@shieldsource.local
--   password : admin123
--   hash     : bcrypt cost-10 hash of "admin123"
--              Generated with: bcrypt.hash("admin123", 10)
-- IMPORTANT: Change this password immediately after first login!
-- =============================================================================
INSERT INTO users (name, email, password_hash, role)
VALUES (
    'System Administrator',
    'admin@shieldsource.local',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.i',
    'admin'
)
ON DUPLICATE KEY UPDATE name = VALUES(name);   -- Safe to run schema multiple times

-- Default expert account (for testing assignments)
--   email    : expert@shieldsource.local
--   password : expert123
INSERT INTO users (name, email, password_hash, role)
VALUES (
    'Lead Security Expert',
    'expert@shieldsource.local',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'expert'
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
