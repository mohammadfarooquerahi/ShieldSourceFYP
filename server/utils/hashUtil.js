// utils/hashUtil.js
// Utility to generate a SHA-256 hash of a file from its path.
// Used to create a unique fingerprint of uploaded evidence files
// so we can detect duplicate uploads or verify file integrity.

const crypto = require('crypto'); // Node.js built-in cryptography module
const fs = require('fs');         // File system module for reading files

/**
 * generateFileHash(filePath)
 * Reads the file at filePath in a streaming fashion and computes
 * its SHA-256 digest as a hexadecimal string.
 *
 * @param {string} filePath - Absolute or relative path to the file
 * @returns {Promise<string>} - Resolves to a 64-character hex hash string
 *
 * Why streams? Large files (e.g., 10MB .pcap) should NOT be read entirely
 * into memory with fs.readFileSync — streams process data in chunks,
 * keeping memory usage low regardless of file size.
 */
function generateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    // Create a SHA-256 hash object
    const hash = crypto.createHash('sha256');

    // Create a readable stream from the file
    const stream = fs.createReadStream(filePath);

    // As each data chunk arrives, feed it into the hash computation
    stream.on('data', (chunk) => hash.update(chunk));

    // When the stream ends, finalize the hash and resolve the Promise
    stream.on('end', () => {
      const hexDigest = hash.digest('hex'); // Convert to hex string (64 chars)
      resolve(hexDigest);
    });

    // If anything goes wrong (file not found, permission error, etc.) reject
    stream.on('error', (err) => reject(err));
  });
}

module.exports = { generateFileHash };
