import {
  getPatients,
  getPatient,
  getSessions,
  setActivePatientId,
  setActiveSessionId,
  setPatient,
  setPatients,
  setPendingPatient,
  setSessions,
  setUserName,
} from "../../shared/state.js";
import { showView } from "../../shared/views.js";
import { updateTokens } from "../workspace/canvas.js";
import { loadSessions, saveToStorage } from "../../shared/storage.js";
import { renderFolder } from "../folder/folder.js";
import { enterEditorView } from "../editor/templateEditor.js";
import { showConfirmStrip } from "../../shared/ui.js";

// ── Avatar helpers ──────────────────────────────────────────────────────────
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

function formatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Render Hub ──────────────────────────────────────────────────────────────
export function renderHub() {
  const list = document.getElementById("patient-list");
  const searchVal =
    document.getElementById("patient-search")?.value.trim().toLowerCase() ?? "";
  const sortVal = document.getElementById("patient-sort")?.value ?? "recent";

  let patients = Object.values(getPatients());

  if (searchVal) {
    patients = patients.filter((p) => p.name.toLowerCase().includes(searchVal));
  }

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
      return `
    <div class="patient-card" data-patient-id="${p.id}">
      <div class="patient-avatar" style="background:${AVATAR_BG[idx]}; color:${AVATAR_TEXT[idx]}">${getInitials(p.name)}</div>
      <div class="patient-card__info">
        <span class="patient-card__name">${escapeHtml(p.name)}</span>
        <span class="patient-card__date">Created ${formatDateTime(p.created_at)}</span>
      </div>
      <button class="patient-menu-btn" type="button" data-role="menu-btn">⋮</button>
      <div class="patient-menu" data-role="menu">
        <button class="patient-menu__item" type="button" data-role="rename">Rename</button>
        <div class="patient-menu__divider"></div>
        <button class="patient-menu__item patient-menu__item--danger" type="button" data-role="delete">Delete Patient</button>
      </div>
    </div>`;
    })
    .join("");

  list.querySelectorAll(".patient-card").forEach((card) => {
    const menuBtn = card.querySelector('[data-role="menu-btn"]');
    const menu = card.querySelector('[data-role="menu"]');

    // Navigate to folder — blocked while rename input is open or menu is clicked
    card.addEventListener("click", (e) => {
      if (e.target.closest('[data-role="menu-btn"]')) return;
      if (e.target.closest('[data-role="menu"]')) return;
      if (card.dataset.renaming === "true") return;
      setActivePatientId(card.dataset.patientId);
      loadSessions(() => {
        renderFolder();
        showView("folder");
      });
    });

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      list
        .querySelectorAll(".patient-menu.is-open")
        .forEach((m) => m.classList.remove("is-open"));
      menu.classList.toggle("is-open");
    });

    card
      .querySelector('[data-role="rename"]')
      .addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.remove("is-open");
        beginInlineRenamePatient(card.dataset.patientId, card);
      });

    card
      .querySelector('[data-role="delete"]')
      .addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.remove("is-open");
        confirmDeletePatientFromHub(card.dataset.patientId);
      });
  });

  // Click outside → close all open menus
  document.addEventListener(
    "click",
    () => {
      list
        .querySelectorAll(".patient-menu.is-open")
        .forEach((m) => m.classList.remove("is-open"));
    },
    { once: true },
  );
}

// ── Inline Patient Rename ────────────────────────────────────────────────────
function beginInlineRenamePatient(patientId, card) {
  const patient = getPatient(patientId);
  if (!patient) return;

  const nameEl = card.querySelector(".patient-card__name");
  if (!nameEl) return;

  card.dataset.renaming = "true";
  const original = patient.name;

  const input = document.createElement("input");
  input.className = "patient-input patient-card__rename-input";
  input.type = "text";
  input.value = original;
  input.autocomplete = "off";

  // Stop clicks on the input from reaching the card's nav handler
  input.addEventListener("click", (e) => e.stopPropagation());

  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const next = input.value.trim();
    if (!next || next === original) {
      card.dataset.renaming = "false";
      renderHub();
      return;
    }

    const isDuplicate = Object.values(getPatients()).some(
      (p) => p.id !== patientId && p.name.toLowerCase() === next.toLowerCase(),
    );
    if (isDuplicate) {
      input.style.borderColor = "#dc2626";
      input.value = "";
      input.placeholder = `"${next}" already exists`;
      return;
    }

    setPatient(patientId, { ...patient, name: next });
    saveToStorage({ patients: getPatients() }, () => {
      card.dataset.renaming = "false";
      renderHub();
    });
  };

  const cancel = () => {
    card.dataset.renaming = "false";
    renderHub();
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    }
    if (e.key === "Escape") {
      input.removeEventListener("blur", commit);
      cancel();
    }
  });
}

// ── Delete Patient from Hub ──────────────────────────────────────────────────
function confirmDeletePatientFromHub(patientId) {
  const patient = getPatient(patientId);
  if (!patient) return;

  showConfirmStrip(
    "hub-confirm-strip",
    `Delete "${patient.name}" and all their scripts? This cannot be undone.`,
    () => {
      const cleanedSessions = { ...getSessions() };
      Object.keys(cleanedSessions).forEach((id) => {
        if (cleanedSessions[id]?.patient_id === patientId)
          delete cleanedSessions[id];
      });
      const cleanedPatients = { ...getPatients() };
      delete cleanedPatients[patientId];

      setSessions(cleanedSessions);
      setPatients(cleanedPatients);

      saveToStorage(
        { patients: cleanedPatients, sessions: cleanedSessions },
        () => {
          setActivePatientId(null);
          setActiveSessionId(null);
          renderHub();
        },
      );
    },
    "Yes, Delete",
  );
}

// ── Confirm New Patient ─────────────────────────────────────────────────────
export function confirmNewPatient() {
  const nameInput = document.getElementById("new-patient-name");
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  const isDuplicate = Object.values(getPatients()).some(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
  if (isDuplicate) {
    nameInput.style.borderColor = "#dc2626";
    nameInput.value = "";
    nameInput.placeholder = `"${name}" already exists`;
    nameInput.focus();
    setTimeout(() => {
      nameInput.style.borderColor = "";
      nameInput.placeholder = "Full name — e.g. John Smith";
    }, 2500);
    return;
  }

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const patientId = `${slug}_${Math.floor(Date.now() / 1000)}`;

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

  document
    .getElementById("patient-search")
    .addEventListener("input", renderHub);
  document.getElementById("patient-sort").addEventListener("change", renderHub);

  document.getElementById("btn-burger").addEventListener("click", () => {
    document.getElementById("burger-overlay").style.display = "flex";
  });

  document.getElementById("btn-burger-close").addEventListener("click", () => {
    document.getElementById("burger-overlay").style.display = "none";
  });

  document
    .getElementById("btn-save-user-name")
    .addEventListener("click", () => {
      const name = document.getElementById("user-name-input").value.trim();
      if (!name) return;
      setUserName(name);
      saveToStorage({ user: { name } }, () => {
        const btn = document.getElementById("btn-save-user-name");
        btn.textContent = "Saved ✓";
        setTimeout(() => (btn.textContent = "Save"), 1000);
      });
    });

  document.getElementById("btn-open-editor").addEventListener("click", () => {
    document.getElementById("burger-overlay").style.display = "none";
    enterEditorView();
  });
}
