/**
 * Title: Vehicle Validate Application
 * Created By: Kory Goossens, Ahmed Said, Chase Petrowksy
 * Course: [Course Name/Number]
 * Date: December 5, 2025
 * 
 * Main Express server for Vehicle Validate
 * - Serves static frontend from /public
 * - Connects to MongoDB Atlas using mongoose
 * - Accepts CRUD for forms and submissions
 * - Handles image uploads via multer, stores files in /uploads and saves paths in MongoDB
 *
 * Extensive comments explain each part.
 */

require('dotenv').config(); // load .env
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');

// Controllers
const formController = require('./controllers/formController');
const submissionController = require('./controllers/submissionController');

const app = express();

// Basic middleware
app.use(cors()); // allow frontend requests (for development)
app.use(express.json()); // parse JSON request bodies

// Serve uploads statically so browser can request image URLs
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_DIR)));

// Serve frontend static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- Multer configuration for file uploads -----------------
// Files are stored in uploads/ and filenames are prefixed with timestamp for uniqueness
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/\s+/g, '-');
    cb(null, Date.now() + '-' + safe);
  }
});
const upload = multer({ storage });

// ---------------- Connect to MongoDB Atlas ------------------------------
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not set in .env');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, {})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// ---------------------- API: Forms -------------------------------------

/**
 * GET /api/forms
 * Return all forms
 */
app.get('/api/forms', formController.getAllForms);

/**
 * GET /api/forms/:id
 * Return a single form with its fields
 */
app.get('/api/forms/:id', formController.getFormById);

/**
 * POST /api/forms
 * Create a new form
 * Body: { name: string, fields: [ { label, type, required } ] }
 */
app.post('/api/forms', formController.createForm);

/**
 * PUT /api/forms/:id
 * Update a form (name and fields)
 */
app.put('/api/forms/:id', formController.updateForm);

/**
 * DELETE /api/forms/:id
 * Delete form and its submissions
 */
app.delete('/api/forms/:id', formController.deleteForm);

// ---------------------- API: Submissions --------------------------------

/**
 * POST /api/forms/:id/submissions
 * Create a new submission
 */
app.post('/api/forms/:id/submissions', upload.array('photos'), submissionController.createSubmission);

/**
 * GET /api/submissions
 * Get all submissions, optionally filtered by form ID
 */
app.get('/api/submissions', submissionController.getAllSubmissions);

/**
 * PUT /api/submissions/:id/notes
 * Update notes for a submission
 */
app.put('/api/submissions/:id/notes', submissionController.updateSubmissionNotes);

/**
 * DELETE /api/submissions/:id
 * Delete a submission and its uploaded files
 */
app.delete('/api/submissions/:id', submissionController.deleteSubmission);

// ---------------------------------------------------------------------
// FIXED CATCH-ALL ROUTE (NO MORE path-to-regexp ERRORS)
// ---------------------------------------------------------------------
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------- Start server ----------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
