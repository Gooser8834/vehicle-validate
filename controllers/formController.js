const path = require('path');
const fs = require('fs');
const Form = require('../models/Form');
const Submission = require('../models/Submission');

/**
 * GET /api/forms
 * Return all forms
 */
async function getAllForms(req, res) {
    try {
        const forms = await Form.find({}, 'name'); // return name and _id
        res.json(forms);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching forms' });
    }
}

/**
 * GET /api/forms/:id
 * Return a single form with its fields
 */
async function getFormById(req, res) {
    try {
        const form = await Form.findById(req.params.id);
        if (!form) return res.status(404).json({ error: 'Form not found' });
        res.json(form);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching form' });
    }
}

/**
 * POST /api/forms
 * Create a new form
 * Body: { name: string, fields: [ { label, type, required } ] }
 */
async function createForm(req, res) {
    try {
        const { name, fields } = req.body;
        const form = new Form({ name, fields });
        await form.save();
        res.status(201).json(form);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Invalid form data' });
    }
}

/**
 * PUT /api/forms/:id
 * Update a form (name and fields)
 */
async function updateForm(req, res) {
    try {
        const { name, fields } = req.body;
        const form = await Form.findByIdAndUpdate(
            req.params.id,
            { name, fields },
            { new: true }
        );
        if (!form) return res.status(404).json({ error: 'Form not found' });
        res.json(form);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Invalid data' });
    }
}

/**
 * DELETE /api/forms/:id
 * Delete form and its submissions
 * Also deletes uploaded files associated with submissions
 */
async function deleteForm(req, res) {
    try {
        const formId = req.params.id;
        await Form.findByIdAndDelete(formId);

        // remove any submissions referencing this form and their uploaded files
        const subs = await Submission.find({ form: formId });

        // delete uploaded files for those submissions
        for (const s of subs) {
            if (Array.isArray(s.photos)) {
                for (const p of s.photos) {
                    try {
                        fs.unlinkSync(path.join(__dirname, '..', p));
                    } catch (e) {

                    }
                }
            }
        }

        await Submission.deleteMany({ form: formId });
        res.json({ message: 'Form and related submissions deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting form' });
    }
}

module.exports = {
    getAllForms,
    getFormById,
    createForm,
    updateForm,
    deleteForm
};

