import {
  getActiveTemplateId,
  getTemplate,
  getTemplates,
  setActiveSessionId,
  setActiveTemplateId,
  setTemplate,
  setPillValues,
} from "../../shared/state.js";
import { saveToStorage } from "../../shared/storage.js";
import { renderCanvas, updateTokens } from "./canvas.js";

// ── Populate Template Dropdown ──
export function populateTemplateDropdown() {
  const select = document.getElementById("template-select");
  select.innerHTML = "";

  Object.values(getTemplates()).forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    select.appendChild(option);
  });

  if (select.options.length > 0) {
    activateTemplate(select.options[0].value);
  }
}

// ── Activate a Template ──
export function activateTemplate(templateId) {
  const template = getTemplate(templateId);

  if (!template) {
    console.error("[Template] Not found in state:", templateId);
    return;
  }

  setActiveTemplateId(templateId);
  setActiveSessionId(null);

  // Sync the dropdown — always reflects the active template
  const select = document.getElementById("template-select");
  if (select) {
    select.value = templateId;
    select.disabled = false;
  }

  setPillValues({});
  document.getElementById("patient-name-input").value = "";

  renderPillGrid(template.pills);
  renderCanvas(template);
}

// ── Render Pill Grid ──
export function renderPillGrid(pills) {
  const grid = document.getElementById("pill-grid");
  grid.innerHTML = "";

  pills.forEach((pill) => {
    if (pill.key === "patient_name" || pill.key === "patient_first_name")
      return;

    const cell = document.createElement("div");
    cell.className = "pill-cell";

    const label = document.createElement("label");
    label.className = "pill-label";
    label.textContent = pill.label;
    label.setAttribute("for", `pill-${pill.key}`);

    const input = document.createElement("input");
    input.className = "pill-input";
    input.type = "text";
    input.id = `pill-${pill.key}`;
    input.dataset.key = pill.key;
    input.placeholder = `e.g. ${getPlaceholderHint(pill.key)}`;
    input.autocomplete = "off";

    input.addEventListener("input", (e) => {
      updateTokens(pill.key, e.target.value);
    });

    cell.appendChild(label);
    cell.appendChild(input);
    grid.appendChild(cell);
  });

  // ── Add Variable button at end of grid ──
  const addCell = document.createElement("div");
  addCell.className = "pill-cell pill-cell--add";
  addCell.innerHTML = `<button id="btn-workspace-add-pill" class="btn btn--secondary pill-add-btn">+ Add Pill</button>`;
  grid.appendChild(addCell);

  document
    .getElementById("btn-workspace-add-pill")
    .addEventListener("click", showAddPillForm);
}

// ── Show Add Variable Inline Form ──
function showAddPillForm() {
  const grid = document.getElementById("pill-grid");
  const addCell = grid.querySelector(".pill-cell--add");

  addCell.innerHTML = `
    <div class="add-pill-inline">
      <input id="ws-pill-label" class="pill-input" type="text"
        placeholder="Variable name — e.g. Insurance Type" autocomplete="off" />
      <input id="ws-pill-key" class="pill-input" type="text"
        placeholder="key (auto-generated)" readonly style="color:var(--text-muted)" />
      <div style="display:flex; gap:6px; margin-top:4px;">
        <button id="ws-btn-add-pill" class="btn btn--primary">Add</button>
        <button id="ws-btn-cancel-pill" class="btn btn--secondary">Cancel</button>
      </div>
    </div>
  `;

  const labelInput = document.getElementById("ws-pill-label");
  const keyInput = document.getElementById("ws-pill-key");

  labelInput.addEventListener("input", () => {
    keyInput.value = labelInput.value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  });

  document.getElementById("ws-btn-add-pill").addEventListener("click", () => {
    confirmAddPill(labelInput.value.trim(), keyInput.value.trim());
  });

  document
    .getElementById("ws-btn-cancel-pill")
    .addEventListener("click", () => {
      const template = getTemplate(getActiveTemplateId());
      if (template) renderPillGrid(template.pills);
    });

  labelInput.focus();
}

// ── Confirm Add Variable ──
function confirmAddPill(label, key) {
  if (!label || !key) return;

  const templateId = getActiveTemplateId();
  const template = getTemplate(templateId);
  if (!template) return;

  // Duplicate key check
  if (template.pills.some((p) => p.key === key)) {
    const input = document.getElementById("ws-pill-label");
    input.style.borderColor = "#dc2626";
    input.value = "";
    input.placeholder = "A variable with that key already exists";
    return;
  }

  const newPill = { key, label };
  const updatedPills = [...template.pills, newPill];

  // Persist new pill to the template
  setTemplate(templateId, { ...template, pills: updatedPills });
  saveToStorage({ templates: getTemplates() });

  // Re-render pill grid with the new pill included
  renderPillGrid(updatedPills);

  // Append a new highlighted token to the canvas
  const canvas = document.getElementById("script-canvas");
  const newToken = document.createElement("span");
  newToken.className = "pill-token is-new";
  newToken.setAttribute("contenteditable", "false");
  newToken.setAttribute("data-key", key);
  newToken.textContent = `[${label}]`;

  canvas.appendChild(document.createElement("br"));
  canvas.appendChild(newToken);

  // Wire the new pill input to update the token
  const input = document.getElementById(`pill-${key}`);
  if (input) {
    input.addEventListener("input", (e) => updateTokens(key, e.target.value));
  }
}

// ── Top Bar Event Bindings ──
export function bindTopBarEvents() {
  document.getElementById("template-select").addEventListener("change", (e) => {
    activateTemplate(e.target.value);
  });

  document
    .getElementById("patient-name-input")
    .addEventListener("input", (e) => {
      const fullName = e.target.value;
      const firstName = fullName.trim().split(" ")[0];
      updateTokens("patient_name", fullName);
      updateTokens("patient_first_name", firstName);
    });
}

// ── Placeholder Hints ──
function getPlaceholderHint(key) {
  const hints = {
    doctors_name: "Rivera",
    body_part: "lower back",
    device: "Ice Pack",
    delivered_date: "June 12",
    insurance_type: "Medicare",
    sx_date: "July 22",
    ps_name: "Maria",
    address: "123 Main St",
  };
  return hints[key] || "…";
}
