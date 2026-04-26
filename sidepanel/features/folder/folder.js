import {
  getActivePatientId,
  getActiveTemplateId,
  getPatients,
  getPendingPatient,
  getSessions,
  getTemplates,
  setActivePatientId,
  setActiveSessionId,
  setPatient,
  setPatients,
  setPendingPatient,
  setSessions,
} from "../../shared/state.js";
import { showView } from "../../shared/views.js";
import { saveToStorage, loadPatients } from "../../shared/storage.js";
import { renderHub } from "../hub/hub.js";
import { showConfirmStrip } from "../../shared/ui.js";
import { loadSession, updateTokens } from "../workspace/canvas.js";
import { activateTemplate } from "../workspace/workspace.js";

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
      const scriptName =
        (typeof s.name === "string" && s.name.trim()) ||
        `${patient?.name || "Patient"} Call Script`.trim();
      const badgeClass = templateBadgeClass(templateName);
      return `
      <div class="session-card" data-session-id="${s.id}">
        <div class="session-card__row">
          <div class="session-card__meta">
            <span class="session-card__template" data-role="script-name">${escapeHtml(
              scriptName,
            )}</span>
            <span class="template-badge ${badgeClass}">${escapeHtml(
              templateName,
            )}</span>
            <span class="session-card__date">${formatDateTime(s.last_saved)}</span>
          </div>
          <button class="session-menu-btn" type="button" title="Menu" data-role="menu-btn">⋮</button>
        </div>
        <div class="session-menu" data-role="menu">
          <button class="session-menu__item" type="button" data-role="rename">Rename</button>
          <div class="session-menu__divider"></div>
          <button class="session-menu__item session-menu__item--danger" type="button" data-role="delete">Delete Script</button>
        </div>
      </div>
    `;
    })
    .join("");

  list.querySelectorAll(".session-card").forEach((card) => {
    const menuBtn = card.querySelector('[data-role="menu-btn"]');
    const menu = card.querySelector('[data-role="menu"]');

    card.addEventListener("click", (e) => {
      if (e.target.closest('[data-role="menu-btn"]')) return;
      if (e.target.closest('[data-role="menu"]')) return;
      if (card.dataset.renaming === "true") return;
      loadSession(card.dataset.sessionId);
    });

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      list
        .querySelectorAll(".session-menu.is-open")
        .forEach((m) => m.classList.remove("is-open"));
      menu.classList.toggle("is-open");
    });

    card
      .querySelector('[data-role="rename"]')
      .addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.remove("is-open");
        beginInlineRename(card.dataset.sessionId, card);
      });

    card
      .querySelector('[data-role="delete"]')
      .addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.remove("is-open");
        confirmDeleteScript(card.dataset.sessionId);
      });
  });

  document.addEventListener(
    "click",
    () => {
      list
        .querySelectorAll(".session-menu.is-open")
        .forEach((m) => m.classList.remove("is-open"));
    },
    { once: true },
  );
}

// ── Folder Event Bindings ──
export function bindFolderEvents() {
  document.getElementById("btn-folder-back").addEventListener("click", () => {
    isEditingPatientInfo = false;
    // Clear any unsaved new patient — if they never saved a session, the
    // pending patient should not persist into the hub or the next flow.
    setPendingPatient(null);
    loadPatients(() => {
      renderHub();
      showView("hub");
    });
  });

  document.getElementById("btn-new-script").addEventListener("click", () => {
    const patient = getPatients()[getActivePatientId()] || getPendingPatient();
    activateTemplate(getActiveTemplateId());
    if (patient) {
      document.getElementById("patient-name-input").value = patient.name;
      updateTokens("patient_name", patient.name);
      updateTokens("patient_first_name", patient.name.trim().split(" ")[0]);
    }
    showView("workspace");
  });
}

// ── Helper ──
function formatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function templateBadgeClass(templateName) {
  const n = String(templateName || "").toLowerCase();
  if (n.includes("device")) return "template-badge--device";
  if (n.includes("wc")) return "template-badge--wc";
  if (n.includes("sx")) return "template-badge--sx";
  return "template-badge--device";
}

function beginInlineRename(sessionId, card) {
  const sessions = getSessions();
  const session = sessions[sessionId];
  if (!session) return;

  const nameEl = card.querySelector('[data-role="script-name"]');
  if (!nameEl) return;

  // Flag the card so the click-to-open-session handler ignores clicks
  card.dataset.renaming = "true";

  const current = (session.name || nameEl.textContent || "").trim();
  const input = document.createElement("input");
  input.className = "patient-input";
  input.type = "text";
  input.value = current;
  input.autocomplete = "off";

  // Stop click propagation so the card nav handler never fires
  input.addEventListener("click", (e) => e.stopPropagation());

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "6px";
  actions.style.marginTop = "6px";

  const btnSave = document.createElement("button");
  btnSave.className = "btn btn--primary";
  btnSave.type = "button";
  btnSave.textContent = "Save";

  const btnCancel = document.createElement("button");
  btnCancel.className = "btn btn--secondary";
  btnCancel.type = "button";
  btnCancel.textContent = "Cancel";

  actions.appendChild(btnSave);
  actions.appendChild(btnCancel);

  const meta = card.querySelector(".session-card__meta");
  const originalHtml = meta.innerHTML;

  nameEl.replaceWith(input);
  meta.insertBefore(actions, meta.children[1] || null);
  input.focus();
  input.select();

  const cancel = () => {
    meta.innerHTML = originalHtml;
    renderFolder();
  };

  btnCancel.addEventListener("click", (e) => {
    e.stopPropagation();
    cancel();
  });

  btnSave.addEventListener("click", (e) => {
    e.stopPropagation();
    const next = input.value.trim();
    if (!next) return;
    const updated = { ...getSessions() };
    updated[sessionId] = { ...session, name: next };
    setSessions(updated);
    saveToStorage({ sessions: updated }, () => {
      renderFolder();
    });
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnSave.click();
    if (e.key === "Escape") cancel();
  });
}

function confirmDeleteScript(sessionId) {
  const sessions = getSessions();
  const session = sessions[sessionId];
  if (!session) return;

  const name = session.name || "this script";

  showConfirmStrip(
    "patient-confirm-strip",
    `Delete "${name}"? This cannot be undone.`,
    () => {
      const updated = { ...getSessions() };
      delete updated[sessionId];
      setSessions(updated);
      saveToStorage({ sessions: updated }, () => {
        setActiveSessionId(null);
        renderFolder();
      });
    },
    "Yes, Delete",
  );
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
      // Filter out pill keys that are already represented by the patient record
      .filter((key) => key !== "patient_name" && key !== "patient_first_name")
      .sort((a, b) =>
        (pillLabelByKey[a] || a).localeCompare(pillLabelByKey[b] || b),
      )
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
    `;

    card
      .querySelector("#btn-edit-patient-info")
      .addEventListener("click", () => {
        isEditingPatientInfo = true;
        renderPatientInfoCard(patientId, patient, patientSessions, templates);
      });
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
  `;

  card
    .querySelector("#btn-cancel-patient-info")
    .addEventListener("click", () => {
      isEditingPatientInfo = false;
      renderPatientInfoCard(patientId, patient, patientSessions, templates);
    });

  card.querySelector("#btn-save-patient-info").addEventListener("click", () => {
    const inputs = Array.from(card.querySelectorAll("input[data-key]"));
    const nextByKey = {};
    inputs.forEach((inp) => {
      nextByKey[inp.dataset.key] = inp.value.trim();
    });

    const nextName = nextByKey["__full_name__"] ?? patient.name ?? "";
    delete nextByKey["__full_name__"];

    if (nextName && nextName !== patient.name) {
      setPatient(patientId, { ...patient, name: nextName });
      document.getElementById("folder-patient-name").textContent = nextName;
    }

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

    saveToStorage(
      { patients: getPatients(), sessions: updatedSessions },
      () => {
        isEditingPatientInfo = false;
        renderFolder();
      },
    );
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
