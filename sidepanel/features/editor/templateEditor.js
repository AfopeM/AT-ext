import {
  deleteTemplate as deleteTemplateFromState,
  getActiveTemplateId,
  getTemplate,
  getTemplates,
  setActiveTemplateId,
  setTemplate,
  setTemplates,
} from "../../shared/state.js";
import { saveToStorage } from "../../shared/storage.js";
import { DEFAULT_TEMPLATES } from "../../../defaults/templates.js";
import { showView } from "../../shared/views.js";
import {
  showConfirmStrip,
  showInfoStrip,
  showNameConfirmStrip,
} from "../../shared/ui.js";

// ── Working State ────────────────────────────────────────────────────────────
// workingPills is a LOCAL copy of the template's pills array.
// It lives only in this module during an active editor session.
// It is NEVER written to state.templates until saveTemplate() is called.

let workingPills = [];

// ── Init Editor View ─────────────────────────────────────────────────────────
// Call once at startup. Wires:
//   • Back arrow  → showView('hub')
//   • editor-template-select → switch which template is being edited
//   • Save / Reset / Delete footer buttons
export function initEditorView() {
  // Back arrow
  document.getElementById("btn-editor-back").addEventListener("click", () => {
    showView("hub");
  });

  // Template selector in the editor header
  document
    .getElementById("editor-template-select")
    .addEventListener("change", (e) => {
      loadEditorTemplate(e.target.value);
    });

  // Footer controls
  document
    .getElementById("btn-save-template")
    .addEventListener("click", saveTemplate);

  document
    .getElementById("btn-reset-default")
    .addEventListener("click", resetToDefault);

  document
    .getElementById("btn-delete-template")
    .addEventListener("click", deleteTemplate);
}

// ── Populate Editor Template Selector ───────────────────────────────────────
// Call this after templates have loaded (or after a template is created/deleted)
// to keep the in-editor dropdown in sync with state.
export function populateEditorTemplateSelect() {
  const select = document.getElementById("editor-template-select");
  const currentId = getActiveTemplateId();
  select.innerHTML = "";

  Object.values(getTemplates()).forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    if (t.id === currentId) opt.selected = true;
    select.appendChild(opt);
  });
}

// ── Load a Template into the Editor ─────────────────────────────────────────
export function loadEditorTemplate(templateId) {
  const template = getTemplate(templateId);
  if (!template) return;

  setActiveTemplateId(templateId);

  // Deep-copy pills so edits don't bleed into state until Save is clicked
  workingPills = template.pills.map((p) => ({ ...p }));

  renderPillManager(workingPills);

  // Show raw bracket text — no rendered tokens
  document.getElementById("editor-canvas").textContent = template.script_text;

  // Show / hide Reset button depending on whether it's a default template
  const btnReset = document.getElementById("btn-reset-default");
  if (btnReset)
    btnReset.style.display = template.isDefault ? "inline-block" : "none";

  // Keep the header selector in sync
  const select = document.getElementById("editor-template-select");
  if (select) select.value = templateId;
}

// ── Enter Editor View ────────────────────────────────────────────────────────
// Public entry-point: populates the dropdown, loads the active template,
// then calls showView('editor').
export function enterEditorView() {
  populateEditorTemplateSelect();
  loadEditorTemplate(getActiveTemplateId());
  showView("editor");
}

// ── Render Pill Manager ──────────────────────────────────────────────────────
function renderPillManager(pills) {
  const grid = document.getElementById("editor-pill-grid");
  grid.innerHTML = "";

  pills.forEach((pill) => {
    const row = document.createElement("div");
    row.className = "pill-manager-row";
    row.dataset.key = pill.key;

    row.innerHTML = `
      <span class="pill-manager-label">${pill.label}</span>
      <span class="pill-manager-key">[${pill.key}]</span>
      <button class="btn btn--danger pill-manager-remove" data-key="${pill.key}">✕</button>
    `;

    row.querySelector(".pill-manager-remove").addEventListener("click", () => {
      removePill(pill.key);
    });

    grid.appendChild(row);
  });

  const addRow = document.createElement("div");
  addRow.className = "pill-manager-add-row";
  addRow.innerHTML = `<button id="btn-add-pill" class="btn btn--secondary">+ Add Pill</button>`;
  grid.appendChild(addRow);

  document
    .getElementById("btn-add-pill")
    .addEventListener("click", showAddPillForm);
}

// ── Remove Pill ──────────────────────────────────────────────────────────────
function removePill(key) {
  const pill = workingPills.find((p) => p.key === key);
  if (!pill) return;

  workingPills = workingPills.filter((p) => p.key !== key);

  const canvas = document.getElementById("editor-canvas");
  const escapedLabel = pill.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  canvas.textContent = canvas.textContent.replace(
    new RegExp(`\\[${escapedLabel}\\]`, "g"),
    "",
  );

  renderPillManager(workingPills);
}

// ── Show Add Pill Form ───────────────────────────────────────────────────────
function showAddPillForm() {
  const grid = document.getElementById("editor-pill-grid");
  const addRow = grid.querySelector(".pill-manager-add-row");

  addRow.innerHTML = `
    <div class="add-pill-form">
      <input id="add-pill-label" class="pill-input" type="text"
        placeholder="Display label — e.g. Doctor's Name" autocomplete="off" />
      <input id="add-pill-key" class="pill-input pill-key-preview" type="text"
        placeholder="key (auto-generated)" readonly />
      <div style="display:flex; gap:6px; margin-top:4px;">
        <button id="btn-confirm-add-pill" class="btn btn--primary">Add</button>
        <button id="btn-cancel-add-pill" class="btn btn--secondary">Cancel</button>
      </div>
    </div>
  `;

  const labelInput = document.getElementById("add-pill-label");
  const keyInput = document.getElementById("add-pill-key");

  labelInput.addEventListener("input", () => {
    keyInput.value = labelInput.value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  });

  document
    .getElementById("btn-confirm-add-pill")
    .addEventListener("click", () => {
      confirmAddPill(labelInput.value.trim(), keyInput.value.trim());
    });

  document
    .getElementById("btn-cancel-add-pill")
    .addEventListener("click", () => {
      renderPillManager(workingPills);
    });

  labelInput.focus();
}

// ── Confirm Add Pill ─────────────────────────────────────────────────────────
function confirmAddPill(label, key) {
  if (!label || !key) return;

  if (workingPills.some((p) => p.key === key)) {
    const input = document.getElementById("add-pill-label");
    input.style.borderColor = "red";
    input.placeholder = "A pill with that key already exists";
    input.value = "";
    return;
  }

  workingPills.push({ key, label });

  const canvas = document.getElementById("editor-canvas");
  canvas.textContent = canvas.textContent.trimEnd() + `\n[${label}]`;

  renderPillManager(workingPills);
}

// ── Save Template ─────────────────────────────────────────────────────────────
export function saveTemplate() {
  const templateId = getActiveTemplateId();
  const template = getTemplate(templateId);
  if (!template) return;

  const newScriptText = document.getElementById("editor-canvas").textContent;

  const doSave = () => {
    setTemplate(templateId, {
      ...template,
      pills: workingPills,
      script_text: newScriptText,
    });

    saveToStorage({ templates: getTemplates() }, () => {
      showSaveTemplateFeedback();
    });
  };

  if (template.isDefault) {
    showConfirmStrip(
      "template-confirm-strip",
      `"${template.name}" is a default template. Saving will overwrite it — you can restore it later with Reset to Default.`,
      doSave,
    );
  } else {
    doSave();
  }
}

// ── Save Feedback ─────────────────────────────────────────────────────────────
function showSaveTemplateFeedback() {
  const btn = document.getElementById("btn-save-template");
  const original = btn.textContent;
  btn.textContent = "Saved ✓";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1000);
}

// ── Reset to Default ──────────────────────────────────────────────────────────
export function resetToDefault() {
  const templateId = getActiveTemplateId();
  const template = getTemplate(templateId);
  if (!template || !template.isDefault) return;

  const defaultTemplate = DEFAULT_TEMPLATES[templateId];
  if (!defaultTemplate) return;

  showConfirmStrip(
    "template-confirm-strip",
    `Reset "${template.name}" to its original content? All custom edits will be lost.`,
    () => {
      setTemplate(templateId, {
        ...defaultTemplate,
        pills: defaultTemplate.pills.map((p) => ({ ...p })),
      });

      workingPills = defaultTemplate.pills.map((p) => ({ ...p }));
      document.getElementById("editor-canvas").textContent =
        defaultTemplate.script_text;

      renderPillManager(workingPills);

      saveToStorage({ templates: getTemplates() }, () => {
        const btn = document.getElementById("btn-reset-default");
        const original = btn.textContent;
        btn.textContent = "Reset ✓";
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = original;
          btn.disabled = false;
        }, 1000);
      });
    },
    "Yes, Reset",
  );
}

// ── Delete Template ────────────────────────────────────────────────────────────
export function deleteTemplate() {
  const templateId = getActiveTemplateId();
  const templates = getTemplates();
  const template = templates[templateId];
  if (!template) return;

  if (Object.keys(templates).length <= 1) {
    showInfoStrip(
      "template-confirm-strip",
      "Can't delete the last template. Create another one first.",
    );
    return;
  }

  const doDelete = () => {
    delete templates[templateId];
    deleteTemplateFromState(templateId);

    saveToStorage({ templates }, () => {
      // Rebuild the editor dropdown and load the first remaining template
      populateEditorTemplateSelect();
      const remaining = Object.values(getTemplates());
      if (remaining.length > 0) {
        loadEditorTemplate(remaining[0].id);
      }
    });
  };

  if (template.isDefault) {
    showNameConfirmStrip(
      "template-confirm-strip",
      `"${template.name}" is a default template. Type its name to confirm deletion.`,
      template.name,
      doDelete,
    );
  } else {
    showConfirmStrip(
      "template-confirm-strip",
      `Delete "${template.name}"? This cannot be undone.`,
      doDelete,
    );
  }
}
