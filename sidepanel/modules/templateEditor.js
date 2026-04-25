import { state } from "./state.js";
import { renderCanvas } from "./canvas.js";
import { renderPillGrid } from "./workspace.js";
import { saveToStorage } from "./storage.js";
import { DEFAULT_TEMPLATES } from "../../defaults/templates.js";
import { showConfirmStrip, showNameConfirmStrip, showInfoStrip } from "./ui.js";

// ── Working State ────────────────────────────────────────────────────────────
// workingPills is a LOCAL copy of the template's pills array.
// It lives only in this module during an active editor session.
// It is NEVER written to state.templates until saveTemplate() is called.
// If the user switches modes without saving, it's discarded.

let workingPills = [];

// ── Enter Editor Mode ────────────────────────────────────────────────────────
export function enterEditorMode() {
  const template = state.templates[state.activeTemplateId];
  if (!template) return;

  // Deep-copy so edits don't bleed into state until Save is clicked
  workingPills = template.pills.map((p) => ({ ...p }));

  renderPillManager(workingPills);

  // Show raw bracket text — no rendered tokens
  const canvas = document.getElementById("script-canvas");
  canvas.textContent = template.script_text;

  document.getElementById("btn-save").style.display = "none";
  document.getElementById("btn-download").style.display = "none";
  document.getElementById("btn-save-template").style.display = "inline-block";
  document.getElementById("template-select").disabled = true;

  // Show editor-only buttons; Reset only appears for default templates
  document.getElementById("btn-delete-template").style.display = "inline-block";
  document.getElementById("btn-reset-default").style.display =
    template.isDefault ? "inline-block" : "none";
}

// ── Exit Editor Mode ─────────────────────────────────────────────────────────
// Discards workingPills. Re-renders canvas from the SAVED template state.
export function exitEditorMode() {
  const template = state.templates[state.activeTemplateId];
  if (!template) return;

  workingPills = [];

  renderPillGrid(template.pills);
  renderCanvas(template);

  document.getElementById("btn-save").style.display = "inline-block";
  document.getElementById("btn-download").style.display = "inline-block";
  document.getElementById("btn-save-template").style.display = "none";
  document.getElementById("template-select").disabled = false;

  document.getElementById("btn-delete-template").style.display = "none";
  document.getElementById("btn-reset-default").style.display = "none";
}

// ── Render Pill Manager ──────────────────────────────────────────────────────
// Renders the current workingPills list with ✕ buttons and the Add Pill form trigger.
function renderPillManager(pills) {
  const grid = document.getElementById("pill-grid");
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

    // Wire ✕ button directly here — no event delegation needed
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
// 1. Strips the pill from workingPills
// 2. Sweeps the canvas: removes all [Label] occurrences
// 3. Re-renders the pill manager
function removePill(key) {
  const pill = workingPills.find((p) => p.key === key);
  if (!pill) return;

  workingPills = workingPills.filter((p) => p.key !== key);

  // Sweep canvas: regex-escape the label, then remove all [Label] occurrences
  const canvas = document.getElementById("script-canvas");
  const escapedLabel = pill.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  canvas.textContent = canvas.textContent.replace(
    new RegExp(`\\[${escapedLabel}\\]`, "g"),
    "",
  );

  renderPillManager(workingPills);
}

// ── Show Add Pill Form ───────────────────────────────────────────────────────
// Replaces the "+ Add Pill" button with an inline two-field form.
function showAddPillForm() {
  const grid = document.getElementById("pill-grid");
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

  // Auto-generate the key slug as the user types the label
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

  // Guard against duplicate keys
  if (workingPills.some((p) => p.key === key)) {
    const input = document.getElementById("add-pill-label");
    input.style.borderColor = "red";
    input.placeholder = "A pill with that key already exists";
    input.value = "";
    return;
  }

  workingPills.push({ key, label });

  // Append [Label] at the end of the canvas text so it's immediately usable
  const canvas = document.getElementById("script-canvas");
  canvas.textContent = canvas.textContent.trimEnd() + `\n[${label}]`;

  renderPillManager(workingPills);
}

// ── Save Template (Session 16) ───────────────────────────────────────────────
// Reads canvas text + workingPills, updates state, writes to storage.
// Default templates show a warning strip before committing.
export function saveTemplate() {
  const templateId = state.activeTemplateId;
  const template = state.templates[templateId];
  if (!template) return;

  const newScriptText = document.getElementById("script-canvas").textContent;

  const doSave = () => {
    // Commit workingPills and new script text into state
    state.templates[templateId] = {
      ...template,
      pills: workingPills,
      script_text: newScriptText,
    };

    saveToStorage({ templates: state.templates }, () => {
      showSaveTemplateFeedback();
    });
  };

  if (template.isDefault) {
    // Show a warning — this is recoverable (Reset to Default in Session 17)
    // but the user should know they're overwriting a default
    showConfirmStrip(
      "template-confirm-strip",
      `"${template.name}" is a default template. Saving will overwrite it — you can restore it later with Reset to Default.`,
      doSave,
    );
  } else {
    doSave();
  }
}

// ── Save Feedback ────────────────────────────────────────────────────────────
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

// ── Reset to Default (Session 17) ────────────────────────────────────────────
// Reads from the hardcoded DEFAULT_TEMPLATES const — never from storage.
// This is exactly why defaults live in a JS file and not only in storage.
export function resetToDefault() {
  const templateId = state.activeTemplateId;
  const template = state.templates[templateId];
  if (!template || !template.isDefault) return;

  const defaultTemplate = DEFAULT_TEMPLATES[templateId];
  if (!defaultTemplate) return;

  showConfirmStrip(
    "template-confirm-strip",
    `Reset "${template.name}" to its original content? All custom edits will be lost.`,
    () => {
      // Restore from hardcoded source — deep copy to avoid mutating the const
      state.templates[templateId] = {
        ...defaultTemplate,
        pills: defaultTemplate.pills.map((p) => ({ ...p })),
      };

      workingPills = defaultTemplate.pills.map((p) => ({ ...p }));

      document.getElementById("script-canvas").textContent =
        defaultTemplate.script_text;

      renderPillManager(workingPills);

      saveToStorage({ templates: state.templates }, () => {
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
    "Yes, Reset", // custom label — replaces the default "Yes, Delete"
  );
}

// ── Delete Template (Session 18) ─────────────────────────────────────────────
// Non-defaults: single confirm strip.
// Defaults: name-confirmation — user must type the template name to proceed.
export function deleteTemplate() {
  const templateId = state.activeTemplateId;
  const template = state.templates[templateId];
  if (!template) return;

  // Guard: never delete the last template — there'd be nothing to show
  if (Object.keys(state.templates).length <= 1) {
    showInfoStrip(
      "template-confirm-strip",
      "Can't delete the last template. Create another one first.",
    );
    return;
  }

  const doDelete = () => {
    delete state.templates[templateId];

    saveToStorage({ templates: state.templates }, () => {
      // Rebuild the dropdown without a circular import
      const select = document.getElementById("template-select");
      select.innerHTML = "";
      Object.values(state.templates).forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name;
        select.appendChild(opt);
      });

      // Switch to the first remaining template and return to usage mode
      if (select.options.length > 0) {
        state.activeTemplateId = select.options[0].value;
        select.value = state.activeTemplateId;
        document.getElementById("mode-select").value = "usage";
        exitEditorMode();
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
