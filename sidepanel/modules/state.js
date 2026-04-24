/**
 * Single source of truth for what's loaded in memory right now.
 * This object is exported once and imported by all other modules.
 */
export const state = {
  templates: {},
  activeTemplateId: null,
  pillValues: {},
  patients: {},
  activePatientId: null,
  pendingPatient: null,
  sessions: {},
  activeSessionId: null,
};
