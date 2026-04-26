import { setPatients, setSessions, setTemplates, setUserName } from "./state.js";

// ── Load Templates ──
export function loadTemplates(callback) {
  chrome.storage.local.get("templates", (data) => {
    if (chrome.runtime.lastError) {
      console.error("[Storage] Read error:", chrome.runtime.lastError);
      return;
    }
    setTemplates(data.templates || {});
    if (callback) callback();
  });
}

// ── Load Patients ──
export function loadPatients(callback) {
  chrome.storage.local.get("patients", (data) => {
    setPatients(data.patients || {});
    if (callback) callback();
  });
}

// ── Load Sessions ──
export function loadSessions(callback) {
  chrome.storage.local.get("sessions", (data) => {
    setSessions(data.sessions || {});
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

// ── Load User ──
export function loadUser(callback) {
  chrome.storage.local.get("user", (data) => {
    if (chrome.runtime.lastError) {
      console.error("[Storage] Read error:", chrome.runtime.lastError);
    }
    setUserName(data.user?.name || null);
    if (callback) callback();
  });
}
