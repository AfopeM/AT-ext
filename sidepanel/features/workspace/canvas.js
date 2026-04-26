import {
  getActivePatientId,
  getActiveSessionId,
  getActiveTemplateId,
  getPatient,
  getPillValues,
  getSession,
  getSessions,
  getTemplate,
  getTemplates,
  getPendingPatient,
  getPatients,
  setActivePatientId,
  setActiveSessionId,
  setActiveTemplateId,
  setPatients,
  setPendingPatient,
  setPillValue,
  setPillValues,
  setSession,
  setSessions,
} from "../../shared/state.js";
import { saveToStorage } from "../../shared/storage.js";
import { showView } from "../../shared/views.js";
import { renderFolder } from "../folder/folder.js";
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
  setPillValue(key, value);
  const canvas = document.getElementById("script-canvas");
  const tokens = canvas.querySelectorAll(`[data-key="${key}"]`);

  tokens.forEach((span) => {
    if (value.trim() === "") {
      const template = getTemplate(getActiveTemplateId());
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
  const session = getSession(sessionId);
  if (!session) return;

  const template = getTemplate(session.template_id);
  if (!template) return;

  setActiveTemplateId(session.template_id);
  setActiveSessionId(session.id);
  setActivePatientId(session.patient_id);
  setPillValues({ ...session.pill_values });

  document.getElementById("template-select").value = session.template_id;
  document.getElementById("template-select").disabled = true;

  const patient = getPatient(session.patient_id);
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
  const patientId = getActivePatientId();
  const templateId = getActiveTemplateId();

  if (!patientId || !templateId) return;

  const sessionId =
    getActiveSessionId() || generateSessionId(patientId, templateId);
  const canvasHtml = document.getElementById("script-canvas").innerHTML;
  const now = new Date().toISOString();

  const template = getTemplate(templateId);
  const patient = getPatient(patientId) || getPendingPatient();
  const patientName =
    patient?.name || document.getElementById("patient-name-input")?.value || "";
  const templateName = template?.name || templateId;

  const defaultName = `${patientName} ${templateName}`.trim();
  const existingName = getActiveSessionId()
    ? getSession(sessionId)?.name
    : null;

  const session = {
    id: sessionId,
    patient_id: patientId,
    template_id: templateId,
    name: existingName || defaultName,
    pill_values: { ...getPillValues() },
    canvas_html: canvasHtml,
    last_saved: now,
  };

  const isNewPatient = !!getPendingPatient();
  if (isNewPatient) {
    const patients = getPatients();
    patients[patientId] = getPendingPatient();
    setPatients(patients);
    setPendingPatient(null);
  }

  setSession(sessionId, session);

  const updates = { sessions: getSessions() };
  if (isNewPatient) updates.patients = getPatients();

  saveToStorage(updates, () => {
    setActiveSessionId(sessionId);
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
