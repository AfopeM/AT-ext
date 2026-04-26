import { getActivePatientId, getPatients, getPendingPatient } from "./state.js";

export function showView(name) {
  const views = ["hub", "folder", "workspace", "editor"];
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === name ? "flex" : "none";
  });

  if (name === "workspace") {
    const patientId = getActivePatientId();
    const patient = getPatients()[patientId] ||
      getPendingPatient() || { name: "Patient" };
    const el = document.getElementById("workspace-patient-name");
    if (el) el.textContent = patient?.name || "Patient";

    // Keep legacy input in sync so existing token logic works.
    const input = document.getElementById("patient-name-input");
    if (input) input.value = patient?.name || "";
  }
}
