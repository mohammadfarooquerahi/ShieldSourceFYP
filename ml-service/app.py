"""
Shield-Source Cybersecurity Incident Response System
File   : ml-service/app.py
Purpose: Flask REST API microservice that exposes the trained Random Forest
         classifier to the Node.js backend.

ENDPOINTS
─────────
  GET  /health            → Liveness probe (used by Docker / load balancers)
  POST /analyze           → Analyse a log file and return a threat prediction

HOW TO START
────────────
  Development  :  python app.py
  Production   :  gunicorn -w 4 -b 0.0.0.0:8000 app:app   (Linux/macOS)
                  waitress-serve --port=8000 app:app         (Windows)

VIVA TALKING POINTS
───────────────────
  • The model is loaded ONCE at startup (not per request) for performance.
  • CORS is enabled so the React client can call this service directly if needed.
  • predict_proba() returns per-class probabilities; we take the max as the
    confidence score stored in ml_predictions.confidence_score.
  • The severity is derived from a static mapping consistent with
    SEVERITY_MAP in train_model.py.
"""

import os
import sys
import traceback

import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Resolve paths robustly — works regardless of CWD when app.py is launched
# ---------------------------------------------------------------------------
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))   # ml-service/
MODEL_DIR  = os.path.join(BASE_DIR, 'model')
UTILS_DIR  = os.path.join(BASE_DIR, 'utils')

# Make sure our own packages are importable
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from utils.log_parser import extract_features, parse_log_file

# ---------------------------------------------------------------------------
# Model paths
# ---------------------------------------------------------------------------
CLASSIFIER_PATH    = os.path.join(MODEL_DIR, 'classifier.pkl')
LABEL_ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')

# ---------------------------------------------------------------------------
# Severity mapping — must match SEVERITY_MAP in train_model.py
# ---------------------------------------------------------------------------
SEVERITY_MAP = {
    'Normal'         : 'low',
    'Brute_Force'    : 'medium',
    'SQL_Injection'  : 'high',
    'Path_Traversal' : 'high',
    'DDoS'           : 'critical',
}

# Feature column order must EXACTLY match the training order in train_model.py
FEATURE_COLUMNS = [
    'total_lines',
    'error_lines',
    'sql_keywords',
    'auth_failures',
    'unique_ips',
    'high_freq_ip_lines',
    'path_traversal',
]

# ---------------------------------------------------------------------------
# Load model at startup
# ---------------------------------------------------------------------------
def load_model():
    """
    Load the pre-trained classifier and label encoder from disk.
    Called once at module import time (i.e. when Flask starts up).

    Raises SystemExit if model files are missing — the service cannot
    function without a trained model.
    """
    if not os.path.isfile(CLASSIFIER_PATH):
        print("=" * 60, file=sys.stderr)
        print("ERROR: classifier.pkl not found!", file=sys.stderr)
        print(f"  Expected path: {CLASSIFIER_PATH}", file=sys.stderr)
        print("  Run first: python model/train_model.py", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        sys.exit(1)

    if not os.path.isfile(LABEL_ENCODER_PATH):
        print("ERROR: label_encoder.pkl not found!", file=sys.stderr)
        print("  Run first: python model/train_model.py", file=sys.stderr)
        sys.exit(1)

    clf = joblib.load(CLASSIFIER_PATH)
    le  = joblib.load(LABEL_ENCODER_PATH)
    print(f"[Shield-Source ML] Model loaded from {CLASSIFIER_PATH}")
    print(f"[Shield-Source ML] Classes: {list(le.classes_)}")
    return clf, le


# Load model into module-level variables (shared across all requests)
classifier, label_encoder = load_model()

# ---------------------------------------------------------------------------
# Flask application factory
# ---------------------------------------------------------------------------
app = Flask(__name__)

# Enable CORS for all routes and all origins
# In production you would restrict origins to your frontend domain:
#   CORS(app, origins=["https://your-frontend.com"])
CORS(app)


# ---------------------------------------------------------------------------
# Helper: run the ML pipeline on a feature dict
# ---------------------------------------------------------------------------
def _predict(features: dict) -> dict:
    """
    Convert a feature dict into a model prediction.

    Parameters
    ----------
    features : dict
        Output of extract_features() or parse_log_file().

    Returns
    -------
    dict
        {
          'threat_type'      : str,    # Class name (e.g. 'SQL_Injection')
          'confidence_score' : float,  # Max class probability  0.0–1.0
          'severity'         : str,    # 'low' | 'medium' | 'high' | 'critical'
        }
    """
    # Build the feature vector in the EXACT same column order as training
    # (numpy array shape: [1, 7])
    feature_vector = np.array(
        [[features.get(col, 0) for col in FEATURE_COLUMNS]],
        dtype=float
    )

    # predict() returns the integer-encoded class
    predicted_class_int = classifier.predict(feature_vector)[0]

    # predict_proba() returns probabilities for EACH class in sorted order
    probabilities = classifier.predict_proba(feature_vector)[0]   # shape: (n_classes,)

    # Confidence = the probability assigned to the winning class
    confidence_score = float(np.max(probabilities))

    # Decode integer → human-readable class name
    threat_type = label_encoder.inverse_transform([predicted_class_int])[0]

    # Map class name → severity level
    severity = SEVERITY_MAP.get(threat_type, 'medium')

    return {
        'threat_type'      : threat_type,
        'confidence_score' : round(confidence_score, 4),
        'severity'         : severity,
    }


# ---------------------------------------------------------------------------
# Route: GET /health
# ---------------------------------------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    """
    Liveness / readiness probe.

    Returns 200 OK with a JSON body so that orchestration tools (Docker
    HEALTHCHECK, Kubernetes readiness probe, etc.) can confirm the service
    is running.

    Example response:
        {"status": "ok", "service": "shield-source-ml", "model_loaded": true}
    """
    return jsonify({
        'status'       : 'ok',
        'service'      : 'shield-source-ml',
        'model_loaded' : True,
        'classes'      : list(label_encoder.classes_),
    }), 200


# ---------------------------------------------------------------------------
# Route: POST /analyze
# ---------------------------------------------------------------------------
@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyse a log file and return an ML-based threat prediction.

    Request body (JSON) — two modes:

    Mode A — send log content as a string:
        {
          "log_content" : "<raw log text …>",
          "file_id"     : 42
        }

    Mode B — send a server-side file path:
        {
          "file_path" : "/absolute/path/to/logfile.log",
          "file_id"   : 42
        }

    Success response (200):
        {
          "file_id"          : 42,
          "threat_type"      : "SQL_Injection",
          "confidence_score" : 0.9750,
          "severity"         : "high",
          "features"         : { … extracted features … }
        }

    Error responses:
        400 – Missing / invalid input
        422 – File parsing failed
        500 – Internal server error
    """

    # ------------------------------------------------------------------
    # 1. Parse JSON body
    # ------------------------------------------------------------------
    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            'error': 'Request body must be valid JSON with Content-Type: application/json'
        }), 400

    file_id = data.get('file_id')   # Optional but recommended for DB linking

    # ------------------------------------------------------------------
    # 2. Determine input mode and extract features
    # ------------------------------------------------------------------
    try:
        if 'log_content' in data:
            # ── Mode A: client sends raw log text ──
            log_content = data['log_content']
            if not isinstance(log_content, str) or not log_content.strip():
                return jsonify({'error': "'log_content' must be a non-empty string"}), 400

            features = extract_features(log_content)

        elif 'file_path' in data:
            # ── Mode B: client sends a file path on the server's filesystem ──
            file_path = data['file_path']
            if not isinstance(file_path, str) or not file_path.strip():
                return jsonify({'error': "'file_path' must be a non-empty string"}), 400

            # Security guard: only allow absolute paths (prevent injection)
            if not os.path.isabs(file_path):
                return jsonify({'error': "'file_path' must be an absolute path"}), 400

            features = parse_log_file(file_path)

        else:
            return jsonify({
                'error': "Request must include either 'log_content' or 'file_path'"
            }), 400

    except FileNotFoundError as exc:
        return jsonify({'error': str(exc)}), 422

    except ValueError as exc:
        return jsonify({'error': str(exc)}), 422

    except Exception as exc:
        # Catch-all for unexpected parsing errors
        traceback.print_exc()
        return jsonify({'error': f'Feature extraction failed: {str(exc)}'}), 500

    # ------------------------------------------------------------------
    # 3. Run ML prediction
    # ------------------------------------------------------------------
    try:
        prediction = _predict(features)
    except Exception as exc:
        traceback.print_exc()
        return jsonify({'error': f'Prediction failed: {str(exc)}'}), 500

    # ------------------------------------------------------------------
    # 4. Build and return response
    # ------------------------------------------------------------------
    response = {
        'file_id'          : file_id,
        'threat_type'      : prediction['threat_type'],
        'confidence_score' : prediction['confidence_score'],
        'severity'         : prediction['severity'],
        'features'         : features,   # Return features for transparency / debugging
    }

    return jsonify(response), 200


# ---------------------------------------------------------------------------
# Route: POST /analyze/batch  (bonus endpoint — analyse multiple logs at once)
# ---------------------------------------------------------------------------
@app.route('/analyze/batch', methods=['POST'])
def analyze_batch():
    """
    Analyse multiple log entries in a single HTTP request.

    Request body:
        {
          "items": [
            {"log_content": "…", "file_id": 1},
            {"file_path": "/path/to/file.log", "file_id": 2}
          ]
        }

    Response:
        {
          "results": [
            {"file_id": 1, "threat_type": "…", …},
            {"file_id": 2, "threat_type": "…", …}
          ]
        }
    """

    data = request.get_json(silent=True)
    if not data or 'items' not in data:
        return jsonify({'error': "Request must include an 'items' array"}), 400

    items = data['items']
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({'error': "'items' must be a non-empty array"}), 400

    results = []
    for item in items:
        file_id = item.get('file_id')
        try:
            if 'log_content' in item:
                features = extract_features(item['log_content'])
            elif 'file_path' in item:
                features = parse_log_file(item['file_path'])
            else:
                results.append({'file_id': file_id, 'error': 'Missing log_content or file_path'})
                continue

            prediction = _predict(features)
            results.append({
                'file_id'          : file_id,
                'threat_type'      : prediction['threat_type'],
                'confidence_score' : prediction['confidence_score'],
                'severity'         : prediction['severity'],
                'features'         : features,
            })
        except Exception as exc:
            results.append({'file_id': file_id, 'error': str(exc)})

    return jsonify({'results': results}), 200


# ---------------------------------------------------------------------------
# Error handlers — return JSON instead of HTML for API consistency
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found', 'available': ['/health', '/analyze', '/analyze/batch']}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'HTTP method not allowed for this endpoint'}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    print("=" * 60)
    print(" Shield-Source ML Microservice")
    print(" Running on http://0.0.0.0:8000")
    print(" Endpoints:")
    print("   GET  /health")
    print("   POST /analyze")
    print("   POST /analyze/batch")
    print("=" * 60)

    # debug=False in production; set debug=True only during development
    # host='0.0.0.0' makes the server accessible from other machines (Docker)
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=False,    # Set to True during development for auto-reload
    )
