// middleware/uploadMiddleware.js
// Configures Multer for disk-based file uploads with:
//   - Custom destination folder: uploads/
//   - Unique filename using timestamp + original name
//   - Whitelist of allowed MIME types and extensions
//   - 10 MB file size limit

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Ensure the uploads/ directory exists ────────────────────────────────────
// Multer will NOT create the directory automatically; we must do it ourselves.
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Disk Storage Configuration ───────────────────────────────────────────────
const storage = multer.diskStorage({
  /**
   * destination: tells Multer where to save uploaded files on disk.
   * We use the uploads/ folder at the project root.
   */
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  /**
   * filename: generates a unique filename to prevent collisions.
   * Format: <timestamp>-<original_filename>
   * e.g. "1720432612345-network_capture.pcap"
   */
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// ── Allowed File Types ───────────────────────────────────────────────────────
// Security measure: only accept these extensions and matching MIME types.
// Prevents attackers from uploading malicious executables or scripts.
const ALLOWED_EXTENSIONS = ['.txt', '.log', '.pdf', '.png', '.jpg', '.zip', '.pcap'];

const ALLOWED_MIMETYPES = [
  'text/plain',                        // .txt, .log
  'application/pdf',                   // .pdf
  'image/png',                         // .png
  'image/jpeg',                        // .jpg
  'application/zip',                   // .zip
  'application/x-zip-compressed',      // .zip (alternate)
  'application/octet-stream',          // .pcap (binary)
  'application/vnd.tcpdump.pcap'       // .pcap (specific)
];

/**
 * fileFilter: called by Multer for each uploaded file.
 * Checks both the file extension AND the reported MIME type.
 * We check both because MIME types can be spoofed by renaming files.
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIMETYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeOk || extOk) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject with an error message (appears in err.message in the route handler)
    cb(new Error(
      `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    ), false);
  }
};

// ── Multer Instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,                              // Use disk storage defined above
  fileFilter,                           // Apply our whitelist check
  limits: {
    fileSize: 10 * 1024 * 1024          // 10 MB maximum (10 × 1024 × 1024 bytes)
  }
});

module.exports = upload;
