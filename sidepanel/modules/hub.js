import { state } from "./state.js";
import { showView } from "./views.js";
import { updateTokens } from "./canvas.js"; // We'll need this for the auto-fill logic
import { loadSessions } from "./storage.js";
import { renderFolder } from "./folder.js";

// ── Render Hub ──
export function renderHub() {
  const list = document.getElementById("patient-list");
  const patients = Object.values(state.patients);

  if (patients.length === 0) {
    list.innerHTML = `<div class="patient-list__empty">No patients yet. Hit "+ New Patient" to start.</div>`;
    return;
  }

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

  list.querySelectorAll(".patient-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.activePatientId = card.dataset.patientId;
      loadSessions(() => {
        renderFolder();
        showView("folder");
      });
    });
  });
}

// ── Confirm New Patient ──
export function confirmNewPatient() {
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

  state.pendingPatient = {
    id: patientId,
    name: name,
    created_at: new Date().toISOString(),
  };
  state.activePatientId = patientId;

  nameInput.value = "";
  document.getElementById("new-patient-form").style.display = "none";

  // Pre-fill workspace logic
  document.getElementById("patient-name-input").value = name;
  updateTokens("patient_name", name);
  updateTokens("patient_first_name", name.trim().split(" ")[0]);

  showView("workspace");
}

// ── Hub Event Bindings ──
export function bindHubEvents() {
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
    .addEventListener("click", confirmNewPatient);

  document
    .getElementById("new-patient-name")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmNewPatient();
    });
}

// ── Helper ──
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
