const path = require('path');
const fs = require('fs');
const Form = require('../models/Form');
const Submission = require('../models/Submission');

/**
 * POST /api/forms/:id/submissions
 * Create a new submission for a form
 * Handles file uploads via multer middleware
 */
async function createSubmission(req, res) {
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
}

/**
 * GET /api/submissions
 * Get all submissions, optionally filtered by form ID
 * Query param: ?form=<formId>
 */
async function getAllSubmissions(req, res) {
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
}

/**
 * PUT /api/submissions/:id/notes
 * Update notes for a submission
 */
async function updateSubmissionNotes(req, res) {
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
}

/**
 * DELETE /api/submissions/:id
 * Delete a submission and its associated uploaded files
 */
async function deleteSubmission(req, res) {
    try {
        const sub = await Submission.findById(req.params.id);
        if (!sub) return res.status(404).json({ error: 'Submission not found' });

        if (Array.isArray(sub.photos)) {
            for (const p of sub.photos) {
                try {
                    fs.unlinkSync(path.join(__dirname, '..', p));
                } catch (e) {
                }
            }
        }

        await sub.remove();
        res.json({ message: 'Submission deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete submission' });
    }
}

module.exports = {
    createSubmission,
    getAllSubmissions,
    updateSubmissionNotes,
    deleteSubmission
};

