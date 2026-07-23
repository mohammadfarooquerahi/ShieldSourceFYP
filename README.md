# Shield-Source 🛡️
## About The System
ShieldSource is an integrated cyber incident response system leveraging artificial intelligence for real-time threat detection and automated alert generation.
### Cybersecurity Incident Response System
**Final Year Project (FYP) — Bachelor of Computer Science**

---

## 📌 Project Overview

Shield-Source is a full-stack cybersecurity incident response platform that enables:

- **Users** to report cybersecurity incidents (hacking, malware, ransomware, phishing, data theft, unauthorised access) and upload suspicious log files.
- **Cybersecurity Experts** to review assigned incidents, analyse evidence, and write forensic notes.
- **Admins** to manage users, assign experts, and monitor the overall incident dashboard.
- **ML Microservice** to automatically classify uploaded log files into attack categories (SQL Injection, Brute Force, DDoS, Path Traversal, Normal) with a confidence score and severity rating.

### System Architecture

```
┌─────────────────┐     HTTP/REST      ┌─────────────────────┐
│  React Frontend │ ◄─────────────────► │  Node.js/Express API│
│  (Port 3000)    │                    │  (Port 5000)         │
└─────────────────┘                    └────────┬────────────┘
                                                │ HTTP POST /analyze
                                                ▼
                                       ┌─────────────────────┐
                                       │  Python ML Service  │
                                       │  Flask + sklearn    │
                                       │  (Port 8000)        │
                                       └────────┬────────────┘
                                                │
                                       ┌────────▼────────────┐
                                       │  MySQL 8 Database   │
                                       │  shield_source DB   │
                                       └─────────────────────┘
```

---

## 👥 Team Information

| Role              | Responsibility                          |
|-------------------|-----------------------------------------|
| Team Lead         | System Architecture & Node.js Backend   |
| Frontend Dev      | React UI & Dashboard                    |
| ML Engineer       | Python ML Service & Log Analysis        |
| Database Engineer | MySQL Schema & Query Optimisation       |

---

## ✅ Prerequisites

Make sure all of the following are installed before setting up the project:

| Tool         | Version  | Download                                      |
|--------------|----------|-----------------------------------------------|
| Node.js      | 18.x LTS | https://nodejs.org                            |
| Python       | 3.9+     | https://python.org                            |
| MySQL Server | 8.0+     | https://dev.mysql.com/downloads/mysql/        |
| Git          | Latest   | https://git-scm.com                           |

---

## 🗂️ Project Structure

```
shield-source/
├── client/                  # React frontend (Vite/CRA)
│   ├── src/
│   └── package.json
│
├── server/                  # Node.js Express backend API
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── package.json
│
├── ml-service/              # Python Flask ML microservice
│   ├── app.py               # Flask application entry point
│   ├── requirements.txt     # Python dependencies
│   ├── utils/
│   │   └── log_parser.py    # Log file feature extractor
│   └── model/
│       ├── train_model.py   # Model training script
│       ├── classifier.pkl   # Trained model (generated)
│       └── label_encoder.pkl# Label encoder (generated)
│
├── database/
│   └── schema.sql           # MySQL schema (run once)
│
└── README.md
```

---

## ⚙️ Setup Instructions

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-team/shield-source.git
cd shield-source
```

### Step 2 — Set Up the MySQL Database

1. Open MySQL Workbench or MySQL CLI.
2. Run the schema script:

```bash
mysql -u root -p < database/schema.sql
```

3. Verify the database was created:

```sql
USE shield_source;
SHOW TABLES;
```

Expected tables: `users`, `incidents`, `files`, `expert_notes`, `incident_notes`, `ml_predictions`

**Default accounts seeded by the schema:**

| Email                         | Password   | Role   |
|-------------------------------|------------|--------|
| admin@shieldsource.local      | admin123   | admin  |
| expert@shieldsource.local     | expert123  | expert |

> ⚠️ **Change these passwords immediately after first login!**

---

### Step 3 — Set Up the Node.js Backend

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=shield_source

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# ML Service
ML_SERVICE_URL=http://localhost:8000

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
```

Start the backend:

```bash
npm run dev       # Development (nodemon auto-reload)
# or
node index.js     # Production
```

The API will be available at: `http://localhost:5000`

---

### Step 4 — Set Up the Python ML Microservice

```bash
cd ml-service
```

#### 4a. Create a Python virtual environment (recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

#### 4b. Install dependencies

```bash
pip install -r requirements.txt
```

#### 4c. Train the ML model (REQUIRED before starting the server)

```bash
python model/train_model.py
```

Expected output:
```
============================================================
Shield-Source ML Model Training
============================================================
[1/5] Generating synthetic training data …
      Dataset shape : (700, 8)
[2/5] Encoding labels …
[3/5] Splitting data …
[4/5] Training RandomForestClassifier (200 trees) …
[5/5] Evaluating on test set …
      Accuracy : 0.9929 (99.29%)
  ✔ Saved classifier    → model/classifier.pkl
  ✔ Saved label encoder → model/label_encoder.pkl
============================================================
```

#### 4d. Start the ML service

```bash
python app.py
```

The ML service will be available at: `http://localhost:8000`

**Production (Linux/macOS — use Gunicorn):**
```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

**Production (Windows — use Waitress):**
```bash
pip install waitress
waitress-serve --port=8000 app:app
```

---

### Step 5 — Set Up the React Frontend

```bash
cd client
npm install
npm run dev       # Development server on http://localhost:3000
```

---

## 🌐 API Endpoints

### Node.js Backend (Port 5000)

| Method | Endpoint                          | Auth     | Description                        |
|--------|-----------------------------------|----------|------------------------------------|
| POST   | `/api/auth/register`              | None     | Register a new user                |
| POST   | `/api/auth/login`                 | None     | Login, receive JWT token           |
| GET    | `/api/incidents`                  | JWT      | List all incidents (role-filtered) |
| POST   | `/api/incidents`                  | JWT      | Create a new incident              |
| GET    | `/api/incidents/:id`              | JWT      | Get incident details               |
| PUT    | `/api/incidents/:id/status`       | Expert   | Update incident status             |
| POST   | `/api/incidents/:id/assign`       | Admin    | Assign expert to incident          |
| POST   | `/api/incidents/:id/files`        | JWT      | Upload log file                    |
| GET    | `/api/incidents/:id/files`        | JWT      | List files for incident            |
| POST   | `/api/incidents/:id/notes`        | Expert   | Add expert forensic note           |
| GET    | `/api/incidents/:id/notes`        | JWT      | Get all notes for incident         |
| GET    | `/api/incidents/:id/predictions`  | JWT      | Get ML predictions for incident    |
| GET    | `/api/admin/users`                | Admin    | List all users                     |
| PUT    | `/api/admin/users/:id/role`       | Admin    | Change user role                   |

### Python ML Service (Port 8000)

| Method | Endpoint          | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | `/health`         | Service liveness check                   |
| POST   | `/analyze`        | Analyse a log file, return prediction    |
| POST   | `/analyze/batch`  | Analyse multiple log files at once       |

#### POST `/analyze` — Request Body

**Option A — Send log content as string:**
```json
{
  "log_content": "192.168.1.1 GET /index.php?id=1 UNION SELECT...",
  "file_id": 42
}
```

**Option B — Send server-side file path:**
```json
{
  "file_path": "/absolute/path/to/server/uploads/abc123.log",
  "file_id": 42
}
```

#### POST `/analyze` — Response

```json
{
  "file_id": 42,
  "threat_type": "SQL_Injection",
  "confidence_score": 0.9750,
  "severity": "high",
  "features": {
    "total_lines": 120,
    "error_lines": 15,
    "sql_keywords": 45,
    "auth_failures": 2,
    "unique_ips": 3,
    "high_freq_ip_lines": 8,
    "path_traversal": 0
  }
}
```

#### Severity Levels

| Threat Type    | Severity | Meaning                                  |
|----------------|----------|------------------------------------------|
| Normal         | low      | No attack detected                       |
| Brute_Force    | medium   | Credential stuffing / password spray     |
| SQL_Injection  | high     | Database exfiltration risk               |
| Path_Traversal | high     | Filesystem exposure risk                 |
| DDoS           | critical | Service availability under attack        |

---

## 🧪 Testing the ML Service

Use `curl` or Postman to test the endpoints manually:

```bash
# Health check
curl http://localhost:8000/health

# Analyse log content
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d "{\"log_content\": \"GET /page?id=1 UNION SELECT username FROM users-- \nSELECT * FROM admin\nDROP TABLE users\", \"file_id\": 1}"
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** — add them to `.gitignore`
2. **Passwords** are stored as bcrypt hashes (cost factor 10) — never plain text
3. **File uploads** are renamed to UUIDs to prevent filename injection
4. **SHA-256 hashes** are stored for every uploaded file for integrity verification
5. **JWT tokens** expire after 7 days by default
6. **ML service** should NOT be exposed to the public internet — proxy it through the Node.js backend

---

## 📊 ML Model Details

| Parameter        | Value                               |
|------------------|-------------------------------------|
| Algorithm        | Random Forest Classifier            |
| Trees            | 200 estimators                      |
| Training samples | 700 (synthetic, balanced)           |
| Classes          | Normal, SQL_Injection, Brute_Force, DDoS, Path_Traversal |
| Feature count    | 7                                   |
| Expected accuracy| ~99% (synthetic data)               |
| Serialisation    | joblib (classifier.pkl)             |

### Feature Vector

| Feature             | Description                                  |
|---------------------|----------------------------------------------|
| `total_lines`       | Total number of log lines                    |
| `error_lines`       | Lines with ERROR/CRITICAL/FATAL keywords     |
| `sql_keywords`      | Lines with SQL injection keywords            |
| `auth_failures`     | Lines with failed login/auth failure text    |
| `unique_ips`        | Number of distinct IP addresses in log       |
| `high_freq_ip_lines`| Lines from IPs appearing > 10 times         |
| `path_traversal`    | Lines containing `../` or `..\` sequences   |

---

## 🚀 Running All Services (Quick Start)

Open three terminal windows:

**Terminal 1 — Database:** (Already running if MySQL service is started)

**Terminal 2 — Backend API:**
```bash
cd server && npm run dev
```

**Terminal 3 — ML Service:**
```bash
cd ml-service
venv\Scripts\activate        # Windows
python app.py
```

**Terminal 4 — Frontend:**
```bash
cd client && npm run dev
```

Open your browser at: **http://localhost:3000**

---
## Local Installation
1. Clone the repository to your local machine.
2. Install dependencies using pip install -r requirements.txt.
3. Run the application locally to access the ShieldSource dashboard.

## 📝 License

This project is developed for academic purposes as part of a Final Year Project.

---

*Shield-Source — Defending Digital Assets Through Intelligent Incident Response*
