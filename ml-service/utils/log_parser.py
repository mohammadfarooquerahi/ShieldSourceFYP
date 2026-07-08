"""
Shield-Source Cybersecurity Incident Response System
File   : ml-service/utils/log_parser.py
Purpose: Parse raw log files and extract numerical features that are fed to
         the Machine Learning classifier.

Key functions
─────────────
  parse_log_file(filepath)          – Reads a file from disk, returns feature dict
  extract_features(log_content)     – Works on a plain string (called by both
                                      parse_log_file and the /analyze endpoint
                                      when JSON log_content is sent)

Feature engineering rationale (important for viva!)
────────────────────────────────────────────────────
  total_lines         – Baseline volume; large log ≈ more events to analyse
  error_lines         – High error count suggests exploitation attempts
  sql_keywords        – SQL injection uses SELECT/UNION/DROP/INSERT in HTTP params
  auth_failures       – Repeated "failed login" messages → Brute Force attack
  unique_ips          – Many unique IPs in a short log → distributed attack
  high_freq_ip_lines  – Lines whose IP appears > threshold → DDoS single-source
  path_traversal      – ../ or ..\\ sequences → Directory Traversal attack
"""

import re
import os
from collections import Counter

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Regex to find IPv4 addresses anywhere in a log line
_IP_PATTERN = re.compile(
    r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}'
    r'(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b'
)

# Keywords that appear in SQL injection payloads (case-insensitive)
_SQL_KEYWORDS = re.compile(
    r'\b(SELECT|DROP|UNION|INSERT|UPDATE|DELETE|EXEC|CAST|CHAR|CONVERT)\b',
    re.IGNORECASE
)

# Patterns that indicate failed authentication events
_AUTH_FAIL_PATTERN = re.compile(
    r'(failed\s+login|authentication\s+failure|invalid\s+password|'
    r'login\s+failed|unauthorized|invalid\s+credentials|access\s+denied)',
    re.IGNORECASE
)

# Path traversal sequences — both Unix and Windows style
_PATH_TRAVERSAL_PATTERN = re.compile(r'\.\.[/\\]')

# Error-level log entries
_ERROR_PATTERN = re.compile(
    r'\b(error|critical|fatal|exception|traceback)\b',
    re.IGNORECASE
)

# How many times an IP must appear in the log to be considered "high frequency"
# (indicative of a DDoS burst from a single source)
_HIGH_FREQ_THRESHOLD = 10


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_features(log_content: str) -> dict:
    """
    Parse a log string and return a flat dictionary of numerical features.

    Parameters
    ----------
    log_content : str
        Raw text content of the log file.

    Returns
    -------
    dict
        {
          'total_lines'        : int,   # Total line count
          'error_lines'        : int,   # Lines containing error/critical/fatal
          'sql_keywords'       : int,   # Lines with SQL injection keywords
          'auth_failures'      : int,   # Lines with failed-login patterns
          'unique_ips'         : int,   # Number of distinct IPv4 addresses found
          'high_freq_ip_lines' : int,   # Lines whose source IP is "high frequency"
          'path_traversal'     : int,   # Lines with ../ or ..\\ sequences
        }

    Viva note: These 7 features form the feature vector X fed to the Random Forest.
    """

    # Split into individual lines; filter out completely blank lines
    lines = [line for line in log_content.splitlines() if line.strip()]
    total_lines = len(lines)

    # --- Per-line counters ---
    error_lines      = 0
    sql_keyword_hits = 0
    auth_fail_hits   = 0
    path_trav_hits   = 0

    # Collect ALL IP addresses to determine unique count and frequency
    all_ips = []          # includes duplicates (needed for Counter)

    for line in lines:
        # Error detection
        if _ERROR_PATTERN.search(line):
            error_lines += 1

        # SQL injection keyword detection
        if _SQL_KEYWORDS.search(line):
            sql_keyword_hits += 1

        # Authentication failure detection
        if _AUTH_FAIL_PATTERN.search(line):
            auth_fail_hits += 1

        # Path traversal detection
        if _PATH_TRAVERSAL_PATTERN.search(line):
            path_trav_hits += 1

        # Collect every IP found on this line
        ips_on_line = _IP_PATTERN.findall(line)
        all_ips.extend(ips_on_line)

    # --- IP-based features ---
    ip_counter  = Counter(all_ips)
    unique_ips  = len(ip_counter)          # Number of distinct source IPs

    # Build set of IPs that appear more than the threshold
    high_freq_ips = {ip for ip, cnt in ip_counter.items()
                     if cnt > _HIGH_FREQ_THRESHOLD}

    # Count lines that contain at least one high-frequency IP
    high_freq_ip_lines = 0
    for line in lines:
        ips_on_line = set(_IP_PATTERN.findall(line))
        if ips_on_line & high_freq_ips:   # intersection
            high_freq_ip_lines += 1

    return {
        'total_lines'        : total_lines,
        'error_lines'        : error_lines,
        'sql_keywords'       : sql_keyword_hits,
        'auth_failures'      : auth_fail_hits,
        'unique_ips'         : unique_ips,
        'high_freq_ip_lines' : high_freq_ip_lines,
        'path_traversal'     : path_trav_hits,
    }


def parse_log_file(filepath: str) -> dict:
    """
    Read a log file from disk and return its extracted feature dictionary.

    Parameters
    ----------
    filepath : str
        Absolute or relative path to the log file.

    Returns
    -------
    dict
        Same structure as extract_features().

    Raises
    ------
    FileNotFoundError
        If the specified file does not exist.
    ValueError
        If the file is empty.
    """

    # Validate the path exists before attempting to open
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"Log file not found: {filepath}")

    # Try UTF-8 first; fall back to latin-1 which can decode any byte sequence
    # (many log files contain mixed encodings)
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as fh:
            content = fh.read()
    except Exception as exc:
        with open(filepath, 'r', encoding='latin-1') as fh:
            content = fh.read()

    if not content.strip():
        raise ValueError(f"Log file is empty: {filepath}")

    # Delegate to the string-based extractor
    return extract_features(content)


# ---------------------------------------------------------------------------
# Quick self-test (run this file directly to verify the parser works)
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    # Fabricated mini-log covering all feature categories
    sample_log = """
192.168.1.1 - - [01/Jan/2025:10:00:01 +0000] "GET /index.php?id=1 UNION SELECT username,password FROM users-- HTTP/1.1" 200 512
192.168.1.1 - - [01/Jan/2025:10:00:02 +0000] "GET /index.php?id=1 DROP TABLE users-- HTTP/1.1" 400 128
10.0.0.5    - - [01/Jan/2025:10:00:03 +0000] "POST /login HTTP/1.1" 401 64   -- Failed login attempt
10.0.0.5    - - [01/Jan/2025:10:00:04 +0000] "POST /login HTTP/1.1" 401 64   -- authentication failure
203.0.113.9 - - [01/Jan/2025:10:00:05 +0000] "GET /../../etc/passwd HTTP/1.1" 403 32
192.168.1.1 - - [01/Jan/2025:10:00:06 +0000] ERROR: Unhandled exception in request handler
192.168.1.1 - - [01/Jan/2025:10:00:07 +0000] "GET / HTTP/1.1" 200 1024
""" * 5   # repeat to simulate realistic log size

    features = extract_features(sample_log)
    print("Extracted features:")
    for key, value in features.items():
        print(f"  {key:25s}: {value}")
