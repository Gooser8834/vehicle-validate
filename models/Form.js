/**
 * Form model
 * - name: string (title)
 * - fields: array of { label, type, required }
 */
const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, required: true }, // text, textarea, number, checkbox, date, file
  required: { type: Boolean, default: false }
});

const FormSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fields: { type: [FieldSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Form', FormSchema);
