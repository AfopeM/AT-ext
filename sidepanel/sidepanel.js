// ── State ──────────────────────────────────────────────────────────────────
// Single source of truth for what's loaded in memory right now.
// Never read from chrome.storage inside event listeners — always read state.
const state = {
  templates: {},
  activeTemplateId: null,
  pillValues: {},
  patients: {},
  activePatiendId: null,
  pendingPatient: null,
  sessions: {},
};

// ── Boot ───────────────────────────────────────────────────────────────────
// Everything starts here. DOMContentLoaded fires once the HTML is parsed.
document.addEventListener("DOMContentLoaded", () => {
  loadTemplates();
  loadPatients(() => renderHub());
  bindTopBarEvents();
  bindHubEvents();
  bindFolderEvents();
  bindBreadcrumbEvents();
  bindFooterEvents();
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

  updateBreadcrumb(name);
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

      loadSessions(() => {
        renderFolder();
        showView("folder");
      });
    });
  });
}

// ── Format Date ─────────────────────────────────────────────────────────────
// Turns ISO string into "Jul 14" for display in patient cards.
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Generate Session ID ─────────────────────────────────────────────────────
// Format: patientId_templateId_unixTimestamp
// Unique by construction — same patient + same template + same second is
// astronomically unlikely, and the timestamp rules out cross-day collisions.
function generateSessionId(patientId, templateId) {
  const timestamp = Math.floor(Date.now() / 1000);
  return `${patientId}_${templateId}_${timestamp}`;
}

// ── Save Session ────────────────────────────────────────────────────────────
// Writes patient (if pending) and session to chrome.storage.local.
// Shows inline feedback, then routes to Folder View.
function saveSession() {
  const patientId = state.activePatientId;
  const templateId = state.activeTemplateId;

  // Guard: both must be set before saving.
  if (!patientId || !templateId) {
    console.error("[Save] Missing patientId or templateId — cannot save.");
    return;
  }

  const sessionId = generateSessionId(patientId, templateId);
  const canvasHtml = document.getElementById("script-canvas").innerHTML;
  const now = new Date().toISOString();

  // Build the session record.
  const session = {
    id: sessionId,
    patient_id: patientId,
    template_id: templateId,
    pill_values: { ...state.pillValues },
    canvas_html: canvasHtml,
    last_saved: now,
  };

  // If this patient has never been saved, promote them now.
  const isNewPatient = !!state.pendingPatient;
  if (isNewPatient) {
    state.patients[patientId] = state.pendingPatient;
    state.pendingPatient = null;
  }

  // Add session to state.
  state.sessions[sessionId] = session;

  // Write both to storage in one atomic call.
  // Only include patients in the write if a new one was just promoted.
  const updates = { sessions: state.sessions };
  if (isNewPatient) updates.patients = state.patients;

  chrome.storage.local.set(updates, () => {
    if (chrome.runtime.lastError) {
      console.error("[Save] Storage write failed:", chrome.runtime.lastError);
      return;
    }

    console.log("[Save] Session saved:", sessionId);
    showSavedFeedback();

    // Route back to Folder View after a short delay
    // so the user sees the "Saved ✓" confirmation before navigating.
    setTimeout(() => {
      renderFolder();
      showView("folder");
    }, 800);
  });
}

// ── Show Saved Feedback ─────────────────────────────────────────────────────
// Temporarily changes the Save button label to "Saved ✓".
// Resets automatically — no action needed from the user.
function showSavedFeedback() {
  const btn = document.getElementById("btn-save");
  const original = btn.textContent;
  btn.textContent = "Saved ✓";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 800);
}

// ── Load Sessions from Storage ──────────────────────────────────────────────
// Reads once per folder open. Keeps state.sessions in sync.
function loadSessions(callback) {
  chrome.storage.local.get("sessions", (data) => {
    state.sessions = data.sessions || {};
    if (callback) callback();
  });
}

// ── Render Folder ───────────────────────────────────────────────────────────
// Shows all sessions belonging to the active patient, newest first.
function renderFolder() {
  const patientId = state.activePatientId;
  const patient = state.patients[patientId] || state.pendingPatient;

  // Update the folder title to the patient's name.
  document.getElementById("folder-patient-name").textContent = patient
    ? patient.name
    : "Unknown Patient";

  // Filter sessions to just this patient's.
  const patientSessions = Object.values(state.sessions).filter(
    (s) => s.patient_id === patientId,
  );

  const list = document.getElementById("session-list");

  if (patientSessions.length === 0) {
    list.innerHTML = `<div class="session-list__empty">No scripts yet. Hit "+ New Script" to start.</div>`;
    return;
  }

  // Most recently saved first.
  patientSessions.sort((a, b) => b.last_saved.localeCompare(a.last_saved));

  list.innerHTML = patientSessions
    .map((s) => {
      const template = state.templates[s.template_id];
      const templateName = template ? template.name : s.template_id;
      return `
      <div class="session-card" data-session-id="${s.id}">
        <div class="session-card__left">
          <span class="session-card__template">${templateName}</span>
          <span class="session-card__date">Saved ${formatDate(s.last_saved)}</span>
        </div>
        <span style="color: var(--text-muted); font-size: 14px;">→</span>
      </div>
    `;
    })
    .join("");

  // Wire click handlers — Session 11 will load the session.
  // For now, just log so we can verify the card renders.
  list.querySelectorAll(".session-card").forEach((card) => {
    card.addEventListener("click", () => {
      const sessionId = card.dataset.sessionId;
      loadSession(sessionId);
    });
  });
}

// ── Load Session ─────────────────────────────────────────────────────────────
// Restores a saved session into the Workspace.
// Called when a user clicks a session card in the Folder View.
function loadSession(sessionId) {
  const session = state.sessions[sessionId];

  if (!session) {
    console.error("[Session] Not found in state:", sessionId);
    return;
  }

  const template = state.templates[session.template_id];

  if (!template) {
    console.error("[Session] Template missing for session:", sessionId);
    return;
  }

  // 1. Update state — everything else reads from here.
  state.activeTemplateId = session.template_id;
  state.pillValues = { ...session.pill_values };

  // 2. Sync the template dropdown to show the right template name.
  document.getElementById("template-select").value = session.template_id;

  // 3. Restore the patient name field.
  const patient = state.patients[session.patient_id];
  const patientName = patient
    ? patient.name
    : session.pill_values.patient_name || "";
  document.getElementById("patient-name-input").value = patientName;

  // 4. Rebuild the pill grid from the template's pill definitions.
  //    This creates the correct inputs for this template.
  renderPillGrid(template.pills);

  // 5. Restore saved values into each pill input.
  //    patient_name and patient_first_name have no grid input (handled above
  //    and via canvas_html respectively), so the null check skips them safely.
  Object.entries(session.pill_values).forEach(([key, value]) => {
    const input = document.getElementById(`pill-${key}`);
    if (input) input.value = value;
  });

  // 6. Restore the canvas from saved HTML.
  //    This preserves any manual text edits the user made during the call.
  document.getElementById("script-canvas").innerHTML = session.canvas_html;

  // 7. Navigate to workspace and update the breadcrumb.
  showView("workspace");

  console.log("[Session] Loaded:", sessionId);
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
  updateBreadcrumb("workspace");
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

// ── Footer Event Bindings ───────────────────────────────────────────────────
function bindFooterEvents() {
  document.getElementById("btn-save").addEventListener("click", saveSession);
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

// ── Folder Event Bindings ───────────────────────────────────────────────────
function bindFolderEvents() {
  document.getElementById("btn-new-script").addEventListener("click", () => {
    // Routes to Workspace so user picks a template and starts a fresh session.
    // Patient name is already in state.activePatientId from when they clicked
    // their card in the Hub.
    const patient =
      state.patients[state.activePatientId] || state.pendingPatient;
    if (patient) {
      document.getElementById("patient-name-input").value = patient.name;
      updateTokens("patient_name", patient.name);
    }
    showView("workspace");
  });
}

// ── Breadcrumb Event Bindings ───────────────────────────────────────────────
function bindBreadcrumbEvents() {
  // Home crumb → always goes back to Hub.
  document.getElementById("crumb-home").addEventListener("click", () => {
    if (!document.getElementById("crumb-home").classList.contains("is-link"))
      return;
    loadPatients(() => {
      renderHub();
      showView("hub");
    });
  });

  // Patient crumb → goes back to that patient's Folder.
  document.getElementById("crumb-patient").addEventListener("click", () => {
    if (!document.getElementById("crumb-patient").classList.contains("is-link"))
      return;
    loadSessions(() => {
      renderFolder();
      showView("folder");
    });
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

// ── Update Breadcrumb ───────────────────────────────────────────────────────
// Rebuilds the breadcrumb to match the current view depth.
// "home" → just Home
// "folder" → Home (link) › Patient Name
// "workspace" → Home (link) › Patient Name (link) › Template Name
function updateBreadcrumb(view) {
  const crumbHome = document.getElementById("crumb-home");
  const crumbPatient = document.getElementById("crumb-patient");
  const crumbTemplate = document.getElementById("crumb-template");
  const sepPatient = document.getElementById("sep-patient");
  const sepTemplate = document.getElementById("sep-template");

  // Resolve patient name from state — covers both saved and pending patients.
  const patient = state.patients[state.activePatientId] || state.pendingPatient;
  const patientName = patient ? patient.name : "";

  // Resolve template name from state.
  const template = state.templates[state.activeTemplateId];
  const templateName = template ? template.name : "";

  // Reset all crumbs to baseline before rebuilding.
  [crumbHome, crumbPatient, crumbTemplate].forEach((el) => {
    el.className = "breadcrumb__crumb";
  });

  if (view === "hub") {
    crumbHome.classList.add("is-current");
    sepPatient.style.display = "none";
    crumbPatient.style.display = "none";
    sepTemplate.style.display = "none";
    crumbTemplate.style.display = "none";
  }

  if (view === "folder") {
    crumbHome.classList.add("is-link");
    sepPatient.style.display = "inline";
    crumbPatient.style.display = "inline";
    crumbPatient.textContent = patientName;
    crumbPatient.classList.add("is-current");
    sepTemplate.style.display = "none";
    crumbTemplate.style.display = "none";
  }

  if (view === "workspace") {
    crumbHome.classList.add("is-link");
    sepPatient.style.display = "inline";
    crumbPatient.style.display = "inline";
    crumbPatient.textContent = patientName;
    crumbPatient.classList.add("is-link");
    sepTemplate.style.display = "inline";
    crumbTemplate.style.display = "inline";
    crumbTemplate.textContent = templateName;
    crumbTemplate.classList.add("is-current");
  }
}
