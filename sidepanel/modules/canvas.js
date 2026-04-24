import { state } from "./state.js";
import { saveToStorage } from "./storage.js";
import { showView } from "./views.js";
import { renderFolder } from "./folder.js";
import { renderPillGrid } from "./workspace.js";

// ── Render Canvas ──
export function renderCanvas(template) {
  const canvas = document.getElementById("script-canvas");
  const labelToKey = {};
  template.pills.forEach((pill) => {
    labelToKey[pill.label.toLowerCase()] = pill.key;
  });

  const escaped = template.script_text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withTokens = escaped.replace(/\[([^\]]+)\]/g, (match, label) => {
    const key = labelToKey[label.toLowerCase()];
    if (key) {
      return `<span class="pill-token" contenteditable="false" data-key="${key}">[${label}]</span>`;
    }
    return match;
  });

  canvas.innerHTML = withTokens.replace(/\n/g, "<br>");
}

// ── Update Tokens ──
export function updateTokens(key, value) {
  state.pillValues[key] = value;
  const canvas = document.getElementById("script-canvas");
  const tokens = canvas.querySelectorAll(`[data-key="${key}"]`);

  tokens.forEach((span) => {
    if (value.trim() === "") {
      const template = state.templates[state.activeTemplateId];
      const pill = template.pills.find((p) => p.key === key);
      span.textContent = pill ? `[${pill.label}]` : `[${key}]`;
      span.classList.remove("is-filled");
    } else {
      span.textContent = value;
      span.classList.add("is-filled");
    }
  });
}

// ── Load Session ──
export function loadSession(sessionId) {
  const session = state.sessions[sessionId];
  if (!session) return;

  const template = state.templates[session.template_id];
  if (!template) return;

  state.activeTemplateId = session.template_id;
  state.activeSessionId = session.id;
  state.activePatientId = session.patient_id;
  state.pillValues = { ...session.pill_values };

  document.getElementById("template-select").value = session.template_id;
  document.getElementById("template-select").disabled = true;

  const patient = state.patients[session.patient_id];
  document.getElementById("patient-name-input").value = patient
    ? patient.name
    : "";

  renderPillGrid(template.pills);

  Object.entries(session.pill_values).forEach(([key, value]) => {
    const input = document.getElementById(`pill-${key}`);
    if (input) input.value = value;
  });

  document.getElementById("script-canvas").innerHTML = session.canvas_html;
  showView("workspace");
}

// ── Save Session ──
export function saveSession() {
  const patientId = state.activePatientId;
  const templateId = state.activeTemplateId;

  if (!patientId || !templateId) return;

  const sessionId =
    state.activeSessionId || generateSessionId(patientId, templateId);
  const canvasHtml = document.getElementById("script-canvas").innerHTML;
  const now = new Date().toISOString();

  const session = {
    id: sessionId,
    patient_id: patientId,
    template_id: templateId,
    pill_values: { ...state.pillValues },
    canvas_html: canvasHtml,
    last_saved: now,
  };

  const isNewPatient = !!state.pendingPatient;
  if (isNewPatient) {
    state.patients[patientId] = state.pendingPatient;
    state.pendingPatient = null;
  }

  state.sessions[sessionId] = session;

  const updates = { sessions: state.sessions };
  if (isNewPatient) updates.patients = state.patients;

  saveToStorage(updates, () => {
    state.activeSessionId = sessionId;
    showSavedFeedback();
  });
}

function generateSessionId(patientId, templateId) {
  const timestamp = Math.floor(Date.now() / 1000);
  return `${patientId}_${templateId}_${timestamp}`;
}

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
