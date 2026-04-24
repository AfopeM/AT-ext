import { state } from "./state.js";

// ── Load Templates ──
export function loadTemplates(callback) {
  chrome.storage.local.get("templates", (data) => {
    if (chrome.runtime.lastError) {
      console.error("[Storage] Read error:", chrome.runtime.lastError);
      return;
    }
    state.templates = data.templates || {};
    if (callback) callback();
  });
}

// ── Load Patients ──
export function loadPatients(callback) {
  chrome.storage.local.get("patients", (data) => {
    state.patients = data.patients || {};
    if (callback) callback();
  });
}

// ── Load Sessions ──
export function loadSessions(callback) {
  chrome.storage.local.get("sessions", (data) => {
    state.sessions = data.sessions || {};
    if (callback) callback();
  });
}

// ── Save Session & Patient ──
// We've extracted the 'writing' logic here so it's reusable.
export function saveToStorage(updates, callback) {
  chrome.storage.local.set(updates, () => {
    if (chrome.runtime.lastError) {
      console.error("[Storage] Write failed:", chrome.runtime.lastError);
      return;
    }
    if (callback) callback();
  });
}
