/**
 * Submission model
 * - form: ObjectId reference to Form
 * - answers: key -> value pairs of responses
 * - photos: array of upload paths (relative to server, served at /uploads/)
 * - notes: internal notes (editable via dashboard)
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubmissionSchema = new Schema({
  form: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
  answers: { type: Schema.Types.Mixed, default: {} },
  photos: { type: [String], default: [] },
  notes: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', SubmissionSchema);
