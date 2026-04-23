// ── State ──────────────────────────────────────────────────────────────────
// Single source of truth for what's loaded in memory right now.
// Never read from chrome.storage inside event listeners — always read state.
const state = {
  templates: {},
  activeTemplateId: null,
  pillValues: {}, // will hold { key: "typed value" } as user fills inputs
};

// ── Boot ───────────────────────────────────────────────────────────────────
// Everything starts here. DOMContentLoaded fires once the HTML is parsed.
document.addEventListener("DOMContentLoaded", () => {
  loadTemplates();
  bindTopBarEvents();
});

// ── Load Templates from Storage ────────────────────────────────────────────
// Reads once on boot. All subsequent reads come from state.templates.
function loadTemplates() {
  chrome.storage.local.get("templates", (data) => {
    if (chrome.runtime.lastError) {
      console.error("[Storage] Read error:", chrome.runtime.lastError);
      return;
    }

    if (!data.templates) {
      console.warn(
        "[Storage] No templates found. Try removing and re-adding the extension.",
      );
      return;
    }

    state.templates = data.templates;
    console.log("[Boot] Templates loaded:", Object.keys(state.templates));

    populateTemplateDropdown();
  });
}

// ── Populate Template Dropdown ──────────────────────────────────────────────
// Builds <option> elements from state.templates, then activates the first one.
function populateTemplateDropdown() {
  const select = document.getElementById("template-select");
  select.innerHTML = "";

  Object.values(state.templates).forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    select.appendChild(option);
  });

  // Activate the first template automatically.
  if (select.options.length > 0) {
    activateTemplate(select.options[0].value);
  }
}

// ── Activate a Template ─────────────────────────────────────────────────────
// Central function — everything that needs to change when a template is
// selected flows through here. Add more steps to this function in later
// sessions (canvas render, session reset, etc.).
function activateTemplate(templateId) {
  const template = state.templates[templateId];

  if (!template) {
    console.error("[Template] Not found in state:", templateId);
    return;
  }

  // Update state.
  state.activeTemplateId = templateId;
  state.pillValues = {}; // clear any previously typed pill values

  console.log("[Template] Activated:", template.name);
  console.log(
    "[Template] Pills:",
    template.pills.map((p) => p.label),
  );

  // Rebuild the pill grid for this template.
  renderPillGrid(template.pills);
}

// ── Render Pill Grid ────────────────────────────────────────────────────────
// Wipes the pill grid and rebuilds it from the template's pill definitions.
// In Session 6, each input here will drive live token substitution.
function renderPillGrid(pills) {
  const grid = document.getElementById("pill-grid");
  grid.innerHTML = ""; // clear previous template's pills

  pills.forEach((pill) => {
    // Skip Patient Name — it lives in the dedicated patient-name-input above.
    // It still counts as a pill for substitution; it just has its own UI row.
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
    input.dataset.key = pill.key; // data-key used by substitution logic later
    input.placeholder = `e.g. ${getPlaceholderHint(pill.key)}`;
    input.autocomplete = "off";

    cell.appendChild(label);
    cell.appendChild(input);
    grid.appendChild(cell);
  });
}

// ── Placeholder Hints ───────────────────────────────────────────────────────
// Returns a contextual example for each known pill key.
// Keeps inputs from looking identical and helps staff know the expected format.
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

// ── Top Bar Event Bindings ──────────────────────────────────────────────────
// All top-bar interactions wired in one place.
function bindTopBarEvents() {
  // Template dropdown change → activate new template.
  document.getElementById("template-select").addEventListener("change", (e) => {
    activateTemplate(e.target.value);
  });

  // Mode selector — placeholder for now, fully wired in Session 14.
  document.getElementById("mode-select").addEventListener("change", (e) => {
    console.log("[Mode] Switched to:", e.target.value);
    // TODO Session 14: implement mode switching logic
  });
}
