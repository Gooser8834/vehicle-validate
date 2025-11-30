/**
 * public/script.js
 * Frontend logic updated to use backend REST API instead of localStorage.
 *
 * - Works on index.html (manage forms), edit.html, form.html (client), dashboard.html
 * - Uses fetch to call endpoints implemented in app.js
 *
 * Extensive comments included.
 */

// -------------------- Utility helpers --------------------
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Helper to show simple alerts in a consistent pattern.
   * Replace with nicer UI as needed.
   */
  function showAlert(msg) {
    alert(msg);
  }
  
  // -------------------- Forms management (index.html) --------------------
  
  /**
   * Fetch list of forms from server and render as cards.
   */
  async function renderFormCards() {
    const grid = document.getElementById('formsGrid');
    if (!grid) return;
  
    grid.innerHTML = '';
  
    // Create "+" card
    const newCard = document.createElement('div');
    newCard.className = 'form-card add-new-card';
    newCard.innerHTML = '<div style="font-size:36px; text-align:center; padding:20px;">+</div>';
    newCard.onclick = () => createNewForm();
    grid.appendChild(newCard);
  
    try {
      const res = await fetch('/api/forms');
      const forms = await res.json();
  
      forms.forEach((form) => {
        const indexId = form._id;
        const card = document.createElement('div');
        card.className = 'form-card';
        card.innerHTML = `
          <h3>${escapeHtml(form.name || 'Untitled Form')}</h3>
          <div class="dropdown" id="dropdown-${indexId}" style="display:none;">
            <button onclick="event.stopPropagation(); copyClientLink('${indexId}')">Copy Client Link</button>
            <button onclick="event.stopPropagation(); editForm('${indexId}')">Edit Form</button>
            <button class="delete" onclick="event.stopPropagation(); deleteForm('${indexId}')">Delete Form</button>
          </div>
        `;
        card.onclick = (e) => {
          e.stopPropagation();
          document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
          document.getElementById(`dropdown-${indexId}`).style.display = 'block';
        };
        grid.appendChild(card);
      });
  
      // close dropdown on outside click
      document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown').forEach(d => d.style.display = 'none');
      });
  
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<p style="color:red">Failed to load forms</p>';
    }
  }
  
  /**
   * Create new form: create a temporary empty form on server or store in sessionStorage for edit page.
   * We'll store the editing form in sessionStorage (so edit.html reads it) instead of creating on server immediately.
   */
  function createNewForm() {
    const defaultFields = [
      { label: "Full Name", type: "text", required: true },
      { label: "Phone Number", type: "text", required: true },
      { label: "Email Address", type: "text", required: true },
      { label: "Vehicle Year", type: "number", required: true },
      { label: "Vehicle Make", type: "text", required: true },
      { label: "Vehicle Model", type: "text", required: true },
      { label: "Mileage", type: "number", required: true },
      { label: "VIN", type: "text", required: false },
      { label: "Has Keys?", type: "checkbox", required: false },
      { label: "Vehicle Photos", type: "file", required: true },
      { label: "Accident History", type: "textarea", required: false },
    ];
    sessionStorage.setItem('vv_editForm', JSON.stringify(defaultFields));
    sessionStorage.setItem('vv_editIndex', 'null'); // new form
    window.location.href = 'edit.html';
  }
  
  /**
   * Navigate to edit page for a server form: we fetch it and store in sessionStorage for edit page to consume.
   */
  async function editForm(id) {
    try {
      const res = await fetch(`/api/forms/${id}`);
      if (!res.ok) throw new Error('Form not found');
      const form = await res.json();
      sessionStorage.setItem('vv_editForm', JSON.stringify(form.fields || []));
      sessionStorage.setItem('vv_editIndex', id);
      window.location.href = 'edit.html';
    } catch (err) {
      console.error(err);
      showAlert('Failed to load form for editing');
    }
  }
  
  async function deleteForm(id) {
    if (!confirm('Are you sure you want to delete this form and its submissions?')) return;
    try {
      const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showAlert('Form deleted');
      renderFormCards();
    } catch (err) {
      console.error(err);
      showAlert('Failed to delete form');
    }
  }
  
  /**
   * Copy client-facing link to clipboard.
   * Client link will be /form.html?formID=<formId>
   */
  function copyClientLink(id) {
    const base = window.location.origin + window.location.pathname.replace(/[^\/]+$/, '');
    const url = base + 'form.html?formID=' + id;
    navigator.clipboard.writeText(url).then(() => {
      showAlert('Client link copied!\n\n' + url);
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  }
  
  // -------------------- Edit page (edit.html) --------------------
  
  let currentForm = [];
  let editingId = null;
  
  function loadEditPage() {
    const titleEl = document.getElementById('formTitle');
    if (!titleEl) return;
  
    const data = sessionStorage.getItem('vv_editForm');
    const idx = sessionStorage.getItem('vv_editIndex');
  
    if (data) {
      currentForm = JSON.parse(data);
      editingId = idx === 'null' ? null : idx;
    } else {
      // fallback to default if nothing in session
      currentForm = [];
      editingId = null;
    }
  
    titleEl.textContent = editingId ? 'Editing Form' : 'New Form';
    renderPreview();
  }
  
  function addField() {
    const type = document.getElementById('fieldType')?.value;
    const label = document.getElementById('labelInput')?.value.trim();
    const required = document.getElementById('requiredInput')?.checked;
  
    if (!label) {
      showAlert('Please enter a field label.');
      return;
    }
  
    currentForm.push({ label, type, required });
    document.getElementById('labelInput').value = '';
    document.getElementById('requiredInput').checked = false;
    renderPreview();
  }
  
  function renderPreview() {
    const container = document.getElementById('preview');
    if (!container) return;
  
    container.innerHTML = "<h3 style='margin-top:0; color:#4a5568;'>Form Fields:</h3>";
  
    if (currentForm.length === 0) {
      container.innerHTML += "<p style='color:#888; font-style:italic; margin:20px 0;'>No fields yet. Add one above!</p>";
      return;
    }
  
    const fieldsContainer = document.createElement('div');
    fieldsContainer.id = 'fields-container';
  
    currentForm.forEach((field, i) => {
      const item = document.createElement('div');
      item.className = 'field-preview-item';
      item.draggable = true;
      item.dataset.index = i;
  
      item.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
          <span></span><span></span><span></span>
        </div>
        <div class="field-info">
          <strong>${escapeHtml(field.label)}</strong>
          <small>(${field.type}${field.required ? ' • required' : ''})</small>
        </div>
        <div class="delete-btn">
          <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); deleteField(${i})">Delete</button>
        </div>
      `;
  
      // drag & drop handlers to reorder fields
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', i);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = parseInt(item.dataset.index);
        if (fromIndex === toIndex) return;
        const [moved] = currentForm.splice(fromIndex, 1);
        currentForm.splice(toIndex, 0, moved);
        renderPreview();
      });
  
      fieldsContainer.appendChild(item);
    });
  
    container.appendChild(fieldsContainer);
  }
  
  function deleteField(index) {
    currentForm.splice(index, 1);
    renderPreview();
  }
  
  /**
   * Save form:
   * - If editingId is null => POST /api/forms
   * - If editingId exists => PUT /api/forms/:id
   */
  async function saveFormAndReturn() {
    let name = '';
    if (!editingId) {
      name = prompt('Name this form:', 'Vehicle Intake Form')?.trim();
      if (!name) return;
    } else {
      // keep same name or ask? We'll fetch current name or prompt to rename
      name = prompt('Rename this form (leave unchanged to keep current name):', '') || '';
    }
  
    // Build payload
    const payload = {
      name: name || undefined,
      fields: currentForm
    };
  
    try {
      if (!editingId) {
        const res = await fetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Create failed');
        showAlert('Form created');
      } else {
        // fetch the existing to get its name if rename not provided
        const existingRes = await fetch(`/api/forms/${editingId}`);
        const existing = await existingRes.json();
        payload.name = payload.name && payload.name.trim() ? payload.name : existing.name;
        const res = await fetch(`/api/forms/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Update failed');
        showAlert('Form updated');
      }
  
      // clear edit session and go back
      sessionStorage.removeItem('vv_editForm');
      sessionStorage.removeItem('vv_editIndex');
      window.location.href = 'index.html';
    } catch (err) {
      console.error(err);
      showAlert('Failed to save form');
    }
  }
  
  // -------------------- Client form page (form.html) --------------------
  
  /**
   * Load client form from server using query param formID
   * Renders fields and sets up submitClientForm
   */
  async function loadClientForm() {
    const container = document.getElementById('formContainer');
    if (!container) return;
  
    const params = new URLSearchParams(window.location.search);
    const formID = params.get('formID');
    if (!formID) {
      container.innerHTML = "<p style='color:red; font-size:18px;'>Invalid or missing form link.</p>";
      return;
    }
  
    try {
      const res = await fetch(`/api/forms/${formID}`);
      if (!res.ok) throw new Error('Form not found');
      const form = await res.json();
  
      const fields = form.fields || [];
      container.innerHTML = '';
      fields.forEach((field, i) => {
        let inputHtml = '';
        if (field.type === 'textarea') {
          inputHtml = `<textarea id="field-${i}" placeholder="${escapeHtml(field.label)}" ${field.required ? 'required' : ''}></textarea>`;
        } else if (field.type === 'checkbox') {
          inputHtml = `<label><input type="checkbox" id="field-${i}"> ${escapeHtml(field.label)}</label>`;
        } else if (field.type === 'file') {
          inputHtml = `<input type="file" id="field-${i}" accept="image/*" multiple ${field.required ? 'required' : ''}>`;
        } else {
          inputHtml = `<input type="${field.type}" id="field-${i}" placeholder="${escapeHtml(field.label)}" ${field.required ? 'required' : ''}>`;
        }
        const div = document.createElement('div');
        div.className = 'field-box';
        div.innerHTML = `
          <label><strong>${escapeHtml(field.label)}</strong> ${field.required ? "<span style='color:red'>*</span>" : ''}</label><br>
          ${inputHtml}
        `;
        container.appendChild(div);
      });
  
      // attach submit handler to global function
      window.submitClientForm = async function () {
        // build answers map
        const answers = {};
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          const el = document.getElementById(`field-${i}`);
          if (!el) continue;
  
          if (field.type === 'file') {
            const files = el.files;
            if (field.required && files.length === 0) {
              showAlert(`Please upload photos for: ${field.label}`);
              return;
            }
            // we'll attach files to FormData later
          } else if (field.type === 'checkbox') {
            answers[field.label] = el.checked;
          } else {
            const val = el.value ? el.value.trim() : '';
            if (field.required && !val) {
              showAlert(`Please fill in: ${field.label}`);
              return;
            }
            answers[field.label] = val;
          }
        }
  
        // prepare multipart formdata
        const fd = new FormData();
        fd.append('data', JSON.stringify({ answers }));
        // append files
        for (let i = 0; i < fields.length; i++) {
          if (fields[i].type === 'file') {
            const el = document.getElementById(`field-${i}`);
            if (el && el.files) {
              Array.from(el.files).forEach(f => fd.append('photos', f));
            }
          }
        }
  
        try {
          const submitRes = await fetch(`/api/forms/${form._id}/submissions`, {
            method: 'POST',
            body: fd
          });
          if (!submitRes.ok) {
            const err = await submitRes.json().catch(()=>({}));
            throw new Error(err.error || 'Submission failed');
          }
          showAlert('Thank you! Your form has been submitted successfully.');
          // Optionally redirect to a "thank you" page or clear form
          window.location.href = 'index.html';
        } catch (err) {
          console.error(err);
          showAlert('Failed to submit form');
        }
      };
  
    } catch (err) {
      console.error(err);
      container.innerHTML = "<p style='color:red; font-size:18px;'>Invalid or expired form link.</p>";
    }
  }
  
  // -------------------- Dashboard (dashboard.html) --------------------
  
  /**
   * Renders all submissions across all forms.
   * Shows images (served from /uploads/...) and allows saving notes and deleting submissions.
   */
  async function renderDashboard() {
    const container = document.getElementById('dashboard');
    if (!container) return;
  
    try {
      const res = await fetch('/api/submissions');
      const subs = await res.json();
  
      if (!Array.isArray(subs) || subs.length === 0) {
        container.innerHTML = '<p>No submissions yet.</p>';
        return;
      }
  
      container.innerHTML = '';
      subs.forEach((sub, idx) => {
        const card = document.createElement('div');
        card.className = 'submission-card';
  
        let html = `<h3>Submission • ${new Date(sub.submittedAt).toLocaleString()}</h3>`;
  
        // answers
        const answers = sub.answers || {};
        Object.keys(answers).forEach(key => {
          const val = answers[key];
          const display = (val === true) ? 'Yes' : (val === false) ? 'No' : (val || '<em>Not provided</em>');
          html += `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(display))}</p>`;
        });
  
        // photos
        if (Array.isArray(sub.photos) && sub.photos.length) {
          html += `<p><strong>Photos:</strong><br>`;
          sub.photos.forEach(p => {
            // photo path is like "uploads/..." so use base + /uploads/...
            const imgUrl = '/' + p.replace(/^\/+/, '');
            html += `<img src="${imgUrl}" alt="photo" style="max-width:200px; margin:6px;">`;
          });
          html += `</p>`;
        }
  
        const safeNotes = escapeHtml(sub.notes || '');
        html += `
          <div class="notes-section">
            <strong>Internal Notes:</strong>
            <div class="notes-display" id="note-display-${sub._id}">${safeNotes || '<em>No notes yet.</em>'}</div>
            <textarea id="note-input-${sub._id}" style="width:100%; margin-top:10px;" placeholder="Add notes...">${safeNotes}</textarea><br>
            <button class="btn btn-primary btn-small" onclick="saveNote('${sub._id}')">Save Note</button>
            <button class="btn btn-danger btn-small" onclick="deleteSubmission('${sub._id}')">Delete Submission</button>
          </div>
        `;
  
        card.innerHTML = html;
        container.appendChild(card);
      });
  
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p style="color:red">Failed to load submissions.</p>';
    }
  }
  
  async function saveNote(subId) {
    const input = document.getElementById(`note-input-${subId}`);
    if (!input) return;
    const notes = input.value || '';
    try {
      const res = await fetch(`/api/submissions/${subId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (!res.ok) throw new Error('Save failed');
      showAlert('Note saved!');
      renderDashboard();
    } catch (err) {
      console.error(err);
      showAlert('Failed to save note');
    }
  }
  
  async function deleteSubmission(subId) {
    if (!confirm('Permanently delete this submission?')) return;
    try {
      const res = await fetch(`/api/submissions/${subId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showAlert('Submission deleted');
      renderDashboard();
    } catch (err) {
      console.error(err);
      showAlert('Failed to delete submission');
    }
  }
  
  // -------------------- MAIN: decide which page we're on --------------------
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('index.html') || path.endsWith('/') || path.endsWith('/public') ) {
      renderFormCards();
    } else if (path.includes('edit.html')) {
      loadEditPage();
      // expose functions used in edit.html buttons
      window.addField = addField;
      window.saveFormAndReturn = saveFormAndReturn;
      window.deleteField = deleteField;
      window.renderPreview = renderPreview;
    } else if (path.includes('form.html')) {
      loadClientForm();
    } else if (path.includes('dashboard.html')) {
      renderDashboard();
      window.saveNote = saveNote;
      window.deleteSubmission = deleteSubmission;
    }
  });
  