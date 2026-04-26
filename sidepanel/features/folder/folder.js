import {
  getActivePatientId,
  getPatients,
  getPendingPatient,
  getSessions,
  getTemplates,
  setActivePatientId,
  setActiveSessionId,
  setPatients,
  setSessions,
} from "../../shared/state.js";
import { showView } from "../../shared/views.js";
import { saveToStorage, loadPatients } from "../../shared/storage.js";
import { renderHub } from "../hub/hub.js";
import { showConfirmStrip } from "../../shared/ui.js";
import { loadSession, updateTokens } from "../workspace/canvas.js";

// ── Render Folder ──
export function renderFolder() {
  const patientId = getActivePatientId();
  const patients = getPatients();
  const patient = patients[patientId] || getPendingPatient();

  document.getElementById("folder-patient-name").textContent = patient
    ? patient.name
    : "Unknown Patient";

  const sessions = getSessions();
  const templates = getTemplates();
  const patientSessions = Object.values(sessions).filter(
    (s) => s.patient_id === patientId,
  );

  const list = document.getElementById("session-list");

  if (patientSessions.length === 0) {
    list.innerHTML = `<div class="session-list__empty">No scripts yet. Hit "+ New Script" to start.</div>`;
    return;
  }

  patientSessions.sort((a, b) => b.last_saved.localeCompare(a.last_saved));

  list.innerHTML = patientSessions
    .map((s) => {
      const template = templates[s.template_id];
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

  list.querySelectorAll(".session-card").forEach((card) => {
    card.addEventListener("click", () => {
      loadSession(card.dataset.sessionId);
    });
  });
}

// ── Folder Event Bindings ──
export function bindFolderEvents() {
  document.getElementById("btn-new-script").addEventListener("click", () => {
    const patient =
      getPatients()[getActivePatientId()] || getPendingPatient();
    if (patient) {
      document.getElementById("patient-name-input").value = patient.name;
      updateTokens("patient_name", patient.name);
    }
    showView("workspace");
  });

  document
    .getElementById("btn-delete-patient")
    .addEventListener("click", deletePatient);
}

// ── Helper ──
// You can also import this from hub.js if you want to be DRY,
// but often these small formatters are kept in a 'utils.js'
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Delete Patient ───────────────────────────────────────────────────────────
function deletePatient() {
  const patientId = getActivePatientId();
  if (!patientId) return;

  const patients = getPatients();
  const sessions = getSessions();
  const patient = patients[patientId];
  const name = patient ? patient.name : "this patient";

  showConfirmStrip(
    "patient-confirm-strip",
    `Delete ${name} and all their scripts? This cannot be undone.`,
    () => {
      // Build cleaned copies; don't mutate getter-returned references.
      const cleanedSessions = { ...sessions };
      Object.keys(cleanedSessions).forEach((id) => {
        if (cleanedSessions[id]?.patient_id === patientId) {
          delete cleanedSessions[id];
        }
      });

      const cleanedPatients = { ...patients };
      delete cleanedPatients[patientId];

      setSessions(cleanedSessions);
      setPatients(cleanedPatients);

      // Write both to storage, then navigate to hub
      saveToStorage(
        { sessions: cleanedSessions, patients: cleanedPatients },
        () => {
          setActivePatientId(null);
          setActiveSessionId(null);
          loadPatients(() => {
            renderHub();
            showView("hub");
          });
        },
      );
    },
  );
}
