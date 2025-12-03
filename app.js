/**
 * app.js
 * Main Express server for Vehicle Validate
 *
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

// Models
const Form = require('./models/Form');
const Submission = require('./models/Submission');

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
 */
app.post('/api/forms/:id/submissions', upload.array('photos'), async (req, res) => {
  try {
    const formId = req.params.id;
    const dataRaw = req.body.data;
    let parsed = {};

    if (dataRaw) {
      parsed = JSON.parse(dataRaw);
    }

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const photos = (req.files || []).map(f =>
      path.join('uploads', f.filename)
    );

    const submission = new Submission({
      form: formId,
      answers: parsed.answers || {},
      photos,
      submittedAt: new Date(),
      notes: parsed._notes || ''
    });

    await submission.save();
    res.status(201).json(submission);
  } catch (err) {
    console.error('Error saving submission:', err);
    res.status(400).json({ error: 'Invalid submission data' });
  }
});

/**
 * GET /api/submissions
 */
app.get('/api/submissions', async (req, res) => {
  try {
    const query = {};
    if (req.query.form) query.form = req.query.form;

    const subs = await Submission.find(query)
      .sort({ submittedAt: -1 })
      .lean();

    res.json(subs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * PUT /api/submissions/:id/notes
 */
app.put('/api/submissions/:id/notes', async (req, res) => {
  try {
    const update = await Submission.findByIdAndUpdate(
      req.params.id,
      { notes: req.body.notes || '' },
      { new: true }
    );

    if (!update) return res.status(404).json({ error: 'Submission not found' });

    res.json(update);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to update notes' });
  }
});

/**
 * DELETE /api/submissions/:id
 */
app.delete('/api/submissions/:id', async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    if (Array.isArray(sub.photos)) {
      for (const p of sub.photos) {
        try {
          fs.unlinkSync(path.join(__dirname, p));
        } catch (e) { }
      }
    }

    await sub.remove();
    res.json({ message: 'Submission deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

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
