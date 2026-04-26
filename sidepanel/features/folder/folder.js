import {
  getActivePatientId,
  getPatients,
  getPendingPatient,
  getSessions,
  getTemplates,
  setActivePatientId,
  setActiveSessionId,
  setPatient,
  setPatients,
  setSessions,
} from "../../shared/state.js";
import { showView } from "../../shared/views.js";
import { saveToStorage, loadPatients } from "../../shared/storage.js";
import { renderHub } from "../hub/hub.js";
import { showConfirmStrip } from "../../shared/ui.js";
import { loadSession, updateTokens } from "../workspace/canvas.js";

let isEditingPatientInfo = false;

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

  renderPatientInfoCard(patientId, patient, patientSessions, templates);

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
  document.getElementById("btn-folder-back").addEventListener("click", () => {
    // Close out any edit state and return to hub without mutating anything.
    isEditingPatientInfo = false;
    loadPatients(() => {
      renderHub();
      showView("hub");
    });
  });

  document.getElementById("btn-new-script").addEventListener("click", () => {
    const patient =
      getPatients()[getActivePatientId()] || getPendingPatient();
    if (patient) {
      document.getElementById("patient-name-input").value = patient.name;
      updateTokens("patient_name", patient.name);
    }
    showView("workspace");
  });
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

function renderPatientInfoCard(patientId, patient, patientSessions, templates) {
  const card = document.getElementById("patient-info-card");
  if (!card) return;

  if (!patientId || !patient) {
    card.innerHTML = "";
    return;
  }

  const pillLabelByKey = buildPillLabelByKey(templates);
  const aggregated = aggregateFilledPills(patientSessions);

  const fields = [
    { key: "__full_name__", label: "Full Name", value: patient.name ?? "" },
    ...Object.keys(aggregated)
      .sort((a, b) => (pillLabelByKey[a] || a).localeCompare(pillLabelByKey[b] || b))
      .map((key) => ({
        key,
        label: pillLabelByKey[key] || key,
        value: aggregated[key],
      })),
  ];

  if (!isEditingPatientInfo) {
    card.innerHTML = `
      <div class="patient-info-head">
        <span class="patient-info-title">Patient Info</span>
        <button id="btn-edit-patient-info" class="btn btn--secondary" type="button">Edit</button>
      </div>
      <div class="patient-info-grid">
        ${fields
          .map(
            (f) => `
          <div class="patient-info-field">
            <label>${escapeHtml(f.label)}</label>
            <div class="patient-info-value">${escapeHtml(f.value || "—")}</div>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="patient-info-actions">
        <button id="btn-delete-patient" class="btn btn--danger" type="button">🗑 Delete Patient</button>
        <div></div>
      </div>
    `;

    card
      .querySelector("#btn-edit-patient-info")
      .addEventListener("click", () => {
        isEditingPatientInfo = true;
        renderPatientInfoCard(patientId, patient, patientSessions, templates);
      });
    card.querySelector("#btn-delete-patient").addEventListener("click", deletePatient);
    return;
  }

  card.innerHTML = `
    <div class="patient-info-head">
      <span class="patient-info-title">Patient Info</span>
      <div class="patient-info-edit-row">
        <button id="btn-save-patient-info" class="btn btn--primary" type="button">Save</button>
        <button id="btn-cancel-patient-info" class="btn btn--secondary" type="button">Cancel</button>
      </div>
    </div>
    <div class="patient-info-grid">
      ${fields
        .map(
          (f) => `
        <div class="patient-info-field">
          <label>${escapeHtml(f.label)}</label>
          <input class="patient-input" data-key="${escapeHtml(f.key)}" type="text" value="${escapeAttr(
            f.value ?? "",
          )}" autocomplete="off" />
        </div>
      `,
        )
        .join("")}
    </div>
    <div class="patient-info-actions">
      <button id="btn-delete-patient" class="btn btn--danger" type="button">🗑 Delete Patient</button>
      <div></div>
    </div>
  `;

  card.querySelector("#btn-delete-patient").addEventListener("click", deletePatient);

  card
    .querySelector("#btn-cancel-patient-info")
    .addEventListener("click", () => {
      isEditingPatientInfo = false;
      renderPatientInfoCard(patientId, patient, patientSessions, templates);
    });

  card
    .querySelector("#btn-save-patient-info")
    .addEventListener("click", () => {
      const inputs = Array.from(card.querySelectorAll("input[data-key]"));
      const nextByKey = {};
      inputs.forEach((inp) => {
        nextByKey[inp.dataset.key] = inp.value.trim();
      });

      const nextName = nextByKey["__full_name__"] ?? patient.name ?? "";
      delete nextByKey["__full_name__"];

      // Update patient name in patients map (and header immediately).
      if (nextName && nextName !== patient.name) {
        setPatient(patientId, { ...patient, name: nextName });
        document.getElementById("folder-patient-name").textContent = nextName;
      }

      // Propagate pill changes across all sessions for this patient.
      const updatedSessions = { ...getSessions() };
      Object.values(updatedSessions).forEach((s) => {
        if (s?.patient_id !== patientId) return;
        const pillValues = { ...(s.pill_values || {}) };
        Object.entries(nextByKey).forEach(([key, value]) => {
          pillValues[key] = value;
        });
        updatedSessions[s.id] = { ...s, pill_values: pillValues };
      });

      setSessions(updatedSessions);

      // Persist updates.
      saveToStorage({ patients: getPatients(), sessions: updatedSessions }, () => {
        isEditingPatientInfo = false;
        renderFolder();
      });
    });
}

function aggregateFilledPills(patientSessions) {
  const out = {};
  patientSessions.forEach((s) => {
    const pv = s?.pill_values || {};
    Object.entries(pv).forEach(([k, v]) => {
      if (typeof v !== "string") return;
      const trimmed = v.trim();
      if (!trimmed) return;
      if (!out[k]) out[k] = trimmed;
    });
  });
  return out;
}

function buildPillLabelByKey(templates) {
  const map = {};
  Object.values(templates || {}).forEach((t) => {
    (t.pills || []).forEach((p) => {
      if (p?.key && p?.label) map[p.key] = p.label;
    });
  });
  // Human-friendly labels for patient identifiers
  map.patient_name = map.patient_name || "Patient Name";
  map.patient_first_name = map.patient_first_name || "Patient First Name";
  return map;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}
