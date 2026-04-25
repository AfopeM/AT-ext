/**
 * shared/state.js
 *
 * Single source of truth. Nothing outside this file touches _state directly.
 * All reads go through getters. All writes go through setters.
 * This makes every state change traceable — add a console.log inside any
 * setter and you'll immediately see who called it and with what value.
 */

const _state = {
  templates: {},
  activeTemplateId: null,
  pillValues: {},
  patients: {},
  activePatientId: null,
  pendingPatient: null,
  sessions: {},
  activeSessionId: null,
};

// ── Templates ────────────────────────────────────────────────────────────────

export function getTemplates() {
  return _state.templates;
}
export function setTemplates(val) {
  _state.templates = val;
}

export function getActiveTemplateId() {
  return _state.activeTemplateId;
}
export function setActiveTemplateId(id) {
  _state.activeTemplateId = id;
}

export function getTemplate(id) {
  return _state.templates[id] ?? null;
}
export function setTemplate(id, val) {
  _state.templates[id] = val;
}
export function deleteTemplate(id) {
  delete _state.templates[id];
}

// ── Pill Values ──────────────────────────────────────────────────────────────

export function getPillValues() {
  return _state.pillValues;
}
export function setPillValues(val) {
  _state.pillValues = val;
}
export function setPillValue(key, val) {
  _state.pillValues[key] = val;
}

// ── Patients ─────────────────────────────────────────────────────────────────

export function getPatients() {
  return _state.patients;
}
export function setPatients(val) {
  _state.patients = val;
}

export function getActivePatientId() {
  return _state.activePatientId;
}
export function setActivePatientId(id) {
  _state.activePatientId = id;
}

export function getPatient(id) {
  return _state.patients[id] ?? null;
}
export function setPatient(id, val) {
  _state.patients[id] = val;
}
export function deletePatient(id) {
  delete _state.patients[id];
}

export function getPendingPatient() {
  return _state.pendingPatient;
}
export function setPendingPatient(val) {
  _state.pendingPatient = val;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export function getSessions() {
  return _state.sessions;
}
export function setSessions(val) {
  _state.sessions = val;
}

export function getActiveSessionId() {
  return _state.activeSessionId;
}
export function setActiveSessionId(id) {
  _state.activeSessionId = id;
}

export function getSession(id) {
  return _state.sessions[id] ?? null;
}
export function setSession(id, val) {
  _state.sessions[id] = val;
}
export function deleteSession(id) {
  delete _state.sessions[id];
}
