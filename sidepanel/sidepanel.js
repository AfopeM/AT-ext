// ── State ──────────────────────────────────────────────────────────────────
// Single source of truth for what's loaded in memory right now.
// Never read from chrome.storage inside event listeners — always read state.
const state = {
  templates: {},
  activeTemplateId: null,
  pillValues: {}, // will hold { key: "typed value" } as user fills inputs
  patients: {}, //
  activePatiendId: null, //
  pendingPatient: null, // (holds patient data before first session saves it)
};

// ── Boot ───────────────────────────────────────────────────────────────────
// Everything starts here. DOMContentLoaded fires once the HTML is parsed.
document.addEventListener("DOMContentLoaded", () => {
  loadTemplates();
  loadPatients(() => renderHub());
  bindTopBarEvents();
  bindHubEvents();
  showView("hub");
});

// ── View Switcher ───────────────────────────────────────────────────────────
// Shows one view, hides the others. Pass "hub", "folder", or "workspace".
function showView(name) {
  const views = ["hub", "folder", "workspace"];
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === name ? "flex" : "none";
  });

  // Top bar only belongs to workspace view.
  const topBar = document.getElementById("top-bar");
  if (topBar) topBar.style.display = name === "workspace" ? "flex" : "none";
}

// ── Load Patients from Storage ──────────────────────────────────────────────
function loadPatients(callback) {
  chrome.storage.local.get("patients", (data) => {
    state.patients = data.patients || {};
    if (callback) callback();
  });
}

// ── Render Hub ──────────────────────────────────────────────────────────────
function renderHub() {
  const list = document.getElementById("patient-list");
  const patients = Object.values(state.patients);

  if (patients.length === 0) {
    list.innerHTML = `<div class="patient-list__empty">No patients yet. Hit "+ New Patient" to start.</div>`;
    return;
  }

  // Most recently created first.
  patients.sort((a, b) => b.created_at.localeCompare(a.created_at));

  list.innerHTML = patients
    .map(
      (p) => `
    <div class="patient-card" data-patient-id="${p.id}">
      <span class="patient-card__name">${p.name}</span>
      <span class="patient-card__date">${formatDate(p.created_at)}</span>
    </div>
  `,
    )
    .join("");

  // Wire click handlers after rendering.
  list.querySelectorAll(".patient-card").forEach((card) => {
    card.addEventListener("click", () => {
      const patientId = card.dataset.patientId;
      state.activePatientId = patientId;
      // Session 8 will route to Folder View here.
      console.log("[Hub] Patient selected:", state.patients[patientId].name);
    });
  });
}

// ── Format Date ─────────────────────────────────────────────────────────────
// Turns ISO string into "Jul 14" for display in patient cards.
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
  document.getElementById("patient-name-input").value = "";

  console.log("[Template] Activated:", template.name);
  console.log(
    "[Template] Pills:",
    template.pills.map((p) => p.label),
  );

  // Rebuild the pill grid for this template.
  renderPillGrid(template.pills);
  renderCanvas(template);
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

    input.addEventListener("input", (e) => {
      updateTokens(pill.key, e.target.value);
    });

    cell.appendChild(label);
    cell.appendChild(input);
    grid.appendChild(cell);
  });
}

// ── Render Canvas ───────────────────────────────────────────────────────────
// Converts the active template's plain-text script into HTML with pill token
// spans. Called every time a template is activated. Wipes previous content.
function renderCanvas(template) {
  const canvas = document.getElementById("script-canvas");

  // Build a lookup: lowercase label → pill key.
  // e.g. "doctor's name" → "doctors_name"
  const labelToKey = {};
  template.pills.forEach((pill) => {
    labelToKey[pill.label.toLowerCase()] = pill.key;
  });

  // Escape HTML special characters so the raw script text
  // can't accidentally inject HTML tags.
  const escaped = template.script_text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Replace every [Label] with a pill token span.
  // Unknown labels (like [Company Name]) stay as plain text.
  const withTokens = escaped.replace(/\[([^\]]+)\]/g, (match, label) => {
    const key = labelToKey[label.toLowerCase()];
    if (key) {
      return `<span class="pill-token" contenteditable="false" data-key="${key}">[${label}]</span>`;
    }
    return match; // not a known pill — leave it alone
  });

  // Convert newline characters to <br> so the script's line
  // breaks survive the jump into innerHTML.
  canvas.innerHTML = withTokens.replace(/\n/g, "<br>");
}

// ── Update Tokens ───────────────────────────────────────────────────────────
// Called on every keystroke. Finds all canvas spans matching the key,
// updates their text, and toggles the filled style.
function updateTokens(key, value) {
  // Save to state so Save Session can read it later.
  state.pillValues[key] = value;

  const canvas = document.getElementById("script-canvas");
  const tokens = canvas.querySelectorAll(`[data-key="${key}"]`);

  tokens.forEach((span) => {
    if (value.trim() === "") {
      // Input was cleared — restore the bracket label.
      // Find the matching pill to get the original label text.
      const template = state.templates[state.activeTemplateId];
      const pill = template.pills.find((p) => p.key === key);
      span.textContent = pill ? `[${pill.label}]` : `[${key}]`;
      span.classList.remove("is-filled");
    } else {
      // Has a value — show it and go green.
      span.textContent = value;
      span.classList.add("is-filled");
    }
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

  // Patient name input → drives patient_name token live.
  document
    .getElementById("patient-name-input")
    .addEventListener("input", (e) => {
      updateTokens("patient_name", e.target.value);
    });
}

// ── Hub Event Bindings ──────────────────────────────────────────────────────
function bindHubEvents() {
  document.getElementById("btn-new-patient").addEventListener("click", () => {
    document.getElementById("new-patient-form").style.display = "flex";
    document.getElementById("new-patient-name").focus();
  });

  document
    .getElementById("btn-cancel-patient")
    .addEventListener("click", () => {
      document.getElementById("new-patient-form").style.display = "none";
      document.getElementById("new-patient-name").value = "";
    });

  document
    .getElementById("btn-confirm-patient")
    .addEventListener("click", () => {
      confirmNewPatient();
    });

  // Also confirm on Enter key.
  document
    .getElementById("new-patient-name")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmNewPatient();
    });
}

// ── Confirm New Patient ─────────────────────────────────────────────────────
// Generates a patient ID, holds the record in state.pendingPatient,
// and routes to the Workspace so the user picks a template.
// The patient is NOT written to storage yet — that happens in Session 10 on Save.
function confirmNewPatient() {
  const nameInput = document.getElementById("new-patient-name");
  const name = nameInput.value.trim();

  if (!name) {
    nameInput.focus();
    return;
  }

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const timestamp = Math.floor(Date.now() / 1000);
  const patientId = `${slug}_${timestamp}`;

  // Hold in state — not saved to storage yet.
  state.pendingPatient = {
    id: patientId,
    name: name,
    created_at: new Date().toISOString(),
  };
  state.activePatientId = patientId;

  // Reset the form.
  nameInput.value = "";
  document.getElementById("new-patient-form").style.display = "none";

  // Pre-fill patient name pill and go to workspace.
  document.getElementById("patient-name-input").value = name;
  updateTokens("patient_name", name);

  console.log("[Hub] Pending patient created:", state.pendingPatient);
  showView("workspace");
}
