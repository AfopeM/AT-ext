import {
  getTemplate,
  getTemplates,
  setActiveSessionId,
  setActiveTemplateId,
  setPillValues,
} from "../../shared/state.js";
import { updateBreadcrumb } from "../../shared/views.js";
import { renderCanvas, updateTokens } from "./canvas.js";
import { enterEditorMode, exitEditorMode } from "../editor/templateEditor.js";

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
  document.getElementById("template-select").disabled = false;
  setPillValues({});
  document.getElementById("patient-name-input").value = "";
  document.getElementById("btn-delete-session").style.display = "none";

  renderPillGrid(template.pills);
  renderCanvas(template);
  updateBreadcrumb("workspace");
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
}

// ── Top Bar Event Bindings ──
export function bindTopBarEvents() {
  document.getElementById("template-select").addEventListener("change", (e) => {
    activateTemplate(e.target.value);
  });

  // Inside bindTopBarEvents():
  document.getElementById("mode-select").addEventListener("change", (e) => {
    if (e.target.value === "editor") {
      enterEditorMode();
    } else {
      exitEditorMode();
    }
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

// ── Helper ──
function getPlaceholderHint(key) {
  const hints = {
    doctors_name: "Dr. Rivera",
    body_part: "lower back",
    device: "TENS Unit",
    delivered_date: "June 12",
    insurance_type: "Medicare",
    sx_date: "July 22",
    ps_name: "Maria",
    address: "123 Main St",
  };
  return hints[key] || "…";
}
