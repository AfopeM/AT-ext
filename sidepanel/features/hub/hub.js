import {
  getPatients,
  getPendingPatient,
  setActivePatientId,
  setPendingPatient,
} from "../../shared/state.js";
import { showView } from "../../shared/views.js";
import { updateTokens } from "../workspace/canvas.js";
import { loadSessions } from "../../shared/storage.js";
import { renderFolder } from "../folder/folder.js";
import { saveToStorage } from "../../shared/storage.js";

// ── Avatar helpers ──────────────────────────────────────────────────────────
// These give each patient a consistent color based on their name.
// The same name always maps to the same color — no randomness.

const AVATAR_BG = [
  "#DBEAFE",
  "#D1FAE5",
  "#FEF3C7",
  "#FCE7F3",
  "#EDE9FE",
  "#ECFDF5",
];
const AVATAR_TEXT = [
  "#1D4ED8",
  "#065F46",
  "#92400E",
  "#9D174D",
  "#5B21B6",
  "#064E3B",
];

function avatarIndex(name) {
  let hash = 0;
  for (const c of name) hash += c.charCodeAt(0);
  return hash % AVATAR_BG.length;
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Render Hub ──────────────────────────────────────────────────────────────
export function renderHub() {
  const list = document.getElementById("patient-list");
  const searchVal =
    document.getElementById("patient-search")?.value.trim().toLowerCase() ?? "";
  const sortVal = document.getElementById("patient-sort")?.value ?? "recent";

  let patients = Object.values(getPatients());

  // Filter by search
  if (searchVal) {
    patients = patients.filter((p) => p.name.toLowerCase().includes(searchVal));
  }

  // Sort
  if (sortVal === "alpha") {
    patients.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    patients.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  if (patients.length === 0) {
    list.innerHTML = `<div class="patient-list__empty">No patients yet. Hit "+ New Patient" to start.</div>`;
    return;
  }

  list.innerHTML = patients
    .map((p) => {
      const idx = avatarIndex(p.name);
      const bg = AVATAR_BG[idx];
      const fg = AVATAR_TEXT[idx];
      const init = getInitials(p.name);
      return `
      <div class="patient-card" data-patient-id="${p.id}">
        <div class="patient-avatar" style="background:${bg}; color:${fg}">${init}</div>
        <span class="patient-card__name">${p.name}</span>
        <span class="patient-card__date">${formatDate(p.created_at)}</span>
        <span class="patient-card__chevron">›</span>
      </div>
    `;
    })
    .join("");

  list.querySelectorAll(".patient-card").forEach((card) => {
    card.addEventListener("click", () => {
      setActivePatientId(card.dataset.patientId);
      loadSessions(() => {
        renderFolder();
        showView("folder");
      });
    });
  });
}

// ── Confirm New Patient ─────────────────────────────────────────────────────
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

  setPendingPatient({
    id: patientId,
    name,
    created_at: new Date().toISOString(),
  });
  setActivePatientId(patientId);

  nameInput.value = "";
  document.getElementById("new-patient-form").style.display = "none";

  document.getElementById("patient-name-input").value = name;
  updateTokens("patient_name", name);
  updateTokens("patient_first_name", name.trim().split(" ")[0]);

  showView("workspace");
}

// ── Hub Event Bindings ──────────────────────────────────────────────────────
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

  // Search and sort — both re-render the list in real time
  document
    .getElementById("patient-search")
    .addEventListener("input", renderHub);
  document.getElementById("patient-sort").addEventListener("change", renderHub);

  // Burger menu
  document.getElementById("btn-burger").addEventListener("click", () => {
    document.getElementById("burger-overlay").style.display = "flex";
  });

  document.getElementById("btn-burger-close").addEventListener("click", () => {
    document.getElementById("burger-overlay").style.display = "none";
  });

  // Save user name from burger overlay
  document
    .getElementById("btn-save-user-name")
    .addEventListener("click", () => {
      const name = document.getElementById("user-name-input").value.trim();
      if (!name) return;
      saveToStorage({ user: { name } }, () => {
        const btn = document.getElementById("btn-save-user-name");
        btn.textContent = "Saved ✓";
        setTimeout(() => (btn.textContent = "Save"), 1000);
      });
    });
}

// ── Helper ──────────────────────────────────────────────────────────────────
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
