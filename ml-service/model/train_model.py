"""
Shield-Source Cybersecurity Incident Response System
File   : ml-service/model/train_model.py
Purpose: Generate synthetic training data and train a RandomForestClassifier
         to classify log files into attack categories.

HOW TO RUN
──────────
  cd d:\\FYP99\\shield-source\\ml-service
  python model/train_model.py

OUTPUT
──────
  model/classifier.pkl    – Trained RandomForestClassifier
  model/label_encoder.pkl – Fitted LabelEncoder (int → class name)

VIVA TALKING POINTS
───────────────────
  • Why synthetic data?  Real attack log datasets are scarce, proprietary, and
    may contain PII.  Synthetic data lets us control class balance and feature
    distributions while demonstrating the ML pipeline clearly.

  • Feature vector (7 dimensions):
      [total_lines, error_lines, sql_keywords, auth_failures,
       unique_ips, high_freq_ip_lines, path_traversal]

  • Why Random Forest?
      - Works well with small/medium tabular datasets
      - Naturally handles feature interactions (e.g. high sql_keywords AND
        high unique_ips together)
      - Provides .predict_proba() for confidence scores
      - Resistant to overfitting via bootstrap aggregation

  • Severity mapping reflects real-world risk:
      Normal        → low       (no attack)
      Brute_Force   → medium    (credential stuffing; often automated)
      SQL_Injection → high      (data breach risk)
      DDoS          → critical  (service unavailability)
      Path_Traversal→ high      (file system exposure)
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# __file__ is  ml-service/model/train_model.py
# MODEL_DIR is ml-service/model/
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

CLASSIFIER_PATH    = os.path.join(MODEL_DIR, 'classifier.pkl')
LABEL_ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')

# ---------------------------------------------------------------------------
# Severity mapping — used by app.py at inference time
# ---------------------------------------------------------------------------
SEVERITY_MAP = {
    'Normal'         : 'low',
    'Brute_Force'    : 'medium',
    'SQL_Injection'  : 'high',
    'Path_Traversal' : 'high',
    'DDoS'           : 'critical',
}

# Column names match the keys returned by log_parser.extract_features()
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
# Synthetic data generation
# ---------------------------------------------------------------------------

def _rng_int(rng, low, high, size):
    """Convenience: draw random integers using the provided Generator."""
    return rng.integers(low, high + 1, size=size)


def generate_synthetic_data(n_samples: int = 700, random_seed: int = 42) -> pd.DataFrame:
    """
    Create a labelled dataset that mimics the statistical patterns of each
    attack type as seen in real log files.

    Each class is generated independently with domain-appropriate feature ranges,
    then concatenated into one shuffled DataFrame.

    Parameters
    ----------
    n_samples : int
        Total number of samples across all classes.
    random_seed : int
        NumPy random seed for reproducibility.

    Returns
    -------
    pd.DataFrame
        Columns: FEATURE_COLUMNS + ['label']
    """

    rng = np.random.default_rng(random_seed)

    # How many samples per class (roughly balanced)
    per_class = n_samples // 5        # 5 classes
    remainder = n_samples - per_class * 5

    rows = []

    # -------------------------------------------------------------------------
    # 1. Normal traffic — baseline; low on everything except total_lines
    # -------------------------------------------------------------------------
    n = per_class
    for _ in range(n):
        rows.append({
            'total_lines'        : rng.integers(50,  500),
            'error_lines'        : rng.integers(0,   10),
            'sql_keywords'       : rng.integers(0,   2),
            'auth_failures'      : rng.integers(0,   3),
            'unique_ips'         : rng.integers(1,   30),
            'high_freq_ip_lines' : rng.integers(0,   5),
            'path_traversal'     : rng.integers(0,   1),
            'label'              : 'Normal',
        })

    # -------------------------------------------------------------------------
    # 2. SQL Injection — high sql_keywords, moderate errors, small IP set
    #    (attacker usually operates from a single IP or small proxy pool)
    # -------------------------------------------------------------------------
    n = per_class
    for _ in range(n):
        rows.append({
            'total_lines'        : rng.integers(100, 800),
            'error_lines'        : rng.integers(5,   60),
            'sql_keywords'       : rng.integers(20,  200),   # ← key signal
            'auth_failures'      : rng.integers(0,   10),
            'unique_ips'         : rng.integers(1,   10),
            'high_freq_ip_lines' : rng.integers(0,   20),
            'path_traversal'     : rng.integers(0,   5),
            'label'              : 'SQL_Injection',
        })

    # -------------------------------------------------------------------------
    # 3. Brute Force — high auth_failures, often a single or few IPs hammering
    #    the login endpoint repeatedly
    # -------------------------------------------------------------------------
    n = per_class
    for _ in range(n):
        rows.append({
            'total_lines'        : rng.integers(200, 1500),
            'error_lines'        : rng.integers(10,  80),
            'sql_keywords'       : rng.integers(0,   5),
            'auth_failures'      : rng.integers(50,  500),   # ← key signal
            'unique_ips'         : rng.integers(1,   15),
            'high_freq_ip_lines' : rng.integers(30,  200),   # same IPs repeat
            'path_traversal'     : rng.integers(0,   2),
            'label'              : 'Brute_Force',
        })

    # -------------------------------------------------------------------------
    # 4. DDoS — massive total_lines, many unique IPs OR a single IP with an
    #    extremely high frequency (volumetric flood)
    # -------------------------------------------------------------------------
    n = per_class
    for _ in range(n):
        rows.append({
            'total_lines'        : rng.integers(5000, 50000),  # ← key signal
            'error_lines'        : rng.integers(100,  2000),
            'sql_keywords'       : rng.integers(0,    10),
            'auth_failures'      : rng.integers(0,    20),
            'unique_ips'         : rng.integers(50,   5000),   # ← key signal
            'high_freq_ip_lines' : rng.integers(200,  5000),   # ← key signal
            'path_traversal'     : rng.integers(0,    3),
            'label'              : 'DDoS',
        })

    # -------------------------------------------------------------------------
    # 5. Path Traversal — high path_traversal count, elevated errors
    # -------------------------------------------------------------------------
    n = per_class + remainder   # absorb any remainder into last class
    for _ in range(n):
        rows.append({
            'total_lines'        : rng.integers(50,  600),
            'error_lines'        : rng.integers(5,   50),
            'sql_keywords'       : rng.integers(0,   5),
            'auth_failures'      : rng.integers(0,   8),
            'unique_ips'         : rng.integers(1,   20),
            'high_freq_ip_lines' : rng.integers(0,   15),
            'path_traversal'     : rng.integers(20,  150),   # ← key signal
            'label'              : 'Path_Traversal',
        })

    df = pd.DataFrame(rows)

    # Shuffle so classes are interleaved (important for cross-validation)
    df = df.sample(frac=1, random_state=random_seed).reset_index(drop=True)

    return df


# ---------------------------------------------------------------------------
# Training pipeline
# ---------------------------------------------------------------------------

def train_and_save_model():
    """
    Full training pipeline:
      1. Generate synthetic data
      2. Encode string labels to integers
      3. Split into train / test sets (80 / 20)
      4. Fit RandomForestClassifier
      5. Evaluate and print metrics
      6. Persist model + encoder to disk
    """

    print("=" * 60)
    print("Shield-Source ML Model Training")
    print("=" * 60)

    # ------------------------------------------------------------------
    # Step 1: Generate data
    # ------------------------------------------------------------------
    print("\n[1/5] Generating synthetic training data …")
    df = generate_synthetic_data(n_samples=700)
    print(f"      Dataset shape : {df.shape}")
    print(f"      Class counts  :\n{df['label'].value_counts().to_string()}")

    # ------------------------------------------------------------------
    # Step 2: Encode labels
    #   LabelEncoder converts strings → ints:
    #   e.g. Brute_Force=0, DDoS=1, Normal=2, Path_Traversal=3, SQL_Injection=4
    # ------------------------------------------------------------------
    print("\n[2/5] Encoding labels …")
    le = LabelEncoder()
    y  = le.fit_transform(df['label'])
    X  = df[FEATURE_COLUMNS].values.astype(float)
    print(f"      Classes : {list(le.classes_)}")

    # ------------------------------------------------------------------
    # Step 3: Train / Test split
    #   stratify=y ensures each class is proportionally represented
    # ------------------------------------------------------------------
    print("\n[3/5] Splitting data (80% train, 20% test, stratified) …")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )
    print(f"      Training samples : {len(X_train)}")
    print(f"      Test samples     : {len(X_test)}")

    # ------------------------------------------------------------------
    # Step 4: Train RandomForestClassifier
    #   n_estimators=200  → 200 decision trees (more = better generalization)
    #   max_depth=None    → let trees grow fully (synthetic data is clean)
    #   random_state=42   → reproducible results
    # ------------------------------------------------------------------
    print("\n[4/5] Training RandomForestClassifier (200 trees) …")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight='balanced',  # compensate for any class imbalance
        random_state=42,
        n_jobs=-1,                # use all CPU cores
    )
    clf.fit(X_train, y_train)

    # ------------------------------------------------------------------
    # Step 5: Evaluate
    # ------------------------------------------------------------------
    print("\n[5/5] Evaluating on test set …")
    y_pred = clf.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    print(f"\n      Accuracy : {acc:.4f} ({acc*100:.2f}%)")
    print("\n      Classification Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=le.classes_
    ))

    # ------------------------------------------------------------------
    # Persist to disk — save FIRST so model is always stored even if
    # subsequent print statements fail on this terminal encoding
    # ------------------------------------------------------------------
    os.makedirs(MODEL_DIR, exist_ok=True)

    joblib.dump(clf, CLASSIFIER_PATH)
    print(f"\n  Saved classifier   -> {CLASSIFIER_PATH}")

    joblib.dump(le, LABEL_ENCODER_PATH)
    print(f"  Saved label encoder -> {LABEL_ENCODER_PATH}")

    # Feature importance — useful for viva explanation
    print("\n      Feature Importances (higher = more influential):")
    importance_pairs = sorted(
        zip(FEATURE_COLUMNS, clf.feature_importances_),
        key=lambda x: x[1], reverse=True
    )
    for feat, imp in importance_pairs:
        bar = '|' * int(imp * 40)
        print(f"        {feat:25s} {imp:.4f}  {bar}")

    print("\n" + "=" * 60)
    print("Training complete! Start the Flask API with:")
    print("  python app.py")
    print("=" * 60)

    return clf, le


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    train_and_save_model()
