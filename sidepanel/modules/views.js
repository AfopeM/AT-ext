import { state } from "./state.js";
import { loadPatients, loadSessions } from "./storage.js";
import { renderHub } from "./hub.js";
import { renderFolder } from "./folder.js";

export function showView(name) {
  const views = ["hub", "folder", "workspace"];
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === name ? "flex" : "none";
  });

  const topBar = document.getElementById("top-bar");
  if (topBar) topBar.style.display = name === "workspace" ? "flex" : "none";

  updateBreadcrumb(name);
}

export function updateBreadcrumb(view) {
  const crumbHome = document.getElementById("crumb-home");
  const crumbPatient = document.getElementById("crumb-patient");
  const crumbTemplate = document.getElementById("crumb-template");
  const sepPatient = document.getElementById("sep-patient");
  const sepTemplate = document.getElementById("sep-template");

  const patient = state.patients[state.activePatientId] || state.pendingPatient;
  const patientName = patient ? patient.name : "";

  const template = state.templates[state.activeTemplateId];
  const templateName = template ? template.name : "";

  [crumbHome, crumbPatient, crumbTemplate].forEach((el) => {
    el.className = "breadcrumb__crumb";
  });

  if (view === "hub") {
    crumbHome.classList.add("is-current");
    sepPatient.style.display = "none";
    crumbPatient.style.display = "none";
    sepTemplate.style.display = "none";
    crumbTemplate.style.display = "none";
  } else if (view === "folder") {
    crumbHome.classList.add("is-link");
    sepPatient.style.display = "inline";
    crumbPatient.style.display = "inline";
    crumbPatient.textContent = patientName;
    crumbPatient.classList.add("is-current");
    sepTemplate.style.display = "none";
    crumbTemplate.style.display = "none";
  } else if (view === "workspace") {
    crumbHome.classList.add("is-link");
    sepPatient.style.display = "inline";
    crumbPatient.style.display = "inline";
    crumbPatient.textContent = patientName;
    crumbPatient.classList.add("is-link");
    sepTemplate.style.display = "inline";
    crumbTemplate.style.display = "inline";
    crumbTemplate.textContent = templateName;
    crumbTemplate.classList.add("is-current");
  }
}

export function bindBreadcrumbEvents(renderHub, renderFolder) {
  document.getElementById("crumb-home").addEventListener("click", () => {
    if (!document.getElementById("crumb-home").classList.contains("is-link"))
      return;
    loadPatients(() => {
      renderHub();
      showView("hub");
    });
  });

  document.getElementById("crumb-patient").addEventListener("click", () => {
    if (!document.getElementById("crumb-patient").classList.contains("is-link"))
      return;
    loadSessions(() => {
      renderFolder();
      showView("folder");
    });
  });
}
