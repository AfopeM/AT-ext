import { downloadRtf } from "./modules/export.js";
import { loadTemplates, loadPatients } from "./modules/storage.js";
import { showView, bindBreadcrumbEvents } from "./modules/views.js";
import { renderHub, bindHubEvents } from "./modules/hub.js";
import { renderFolder, bindFolderEvents } from "./modules/folder.js";
import { saveSession, bindDeleteSessionEvent } from "./modules/canvas.js";
import {
  populateTemplateDropdown,
  bindTopBarEvents,
} from "./modules/workspace.js";
import {
  saveTemplate,
  resetToDefault,
  deleteTemplate,
} from "./modules/templateEditor.js";

document.addEventListener("DOMContentLoaded", () => {
  loadTemplates(() => {
    populateTemplateDropdown();
    loadPatients(() => {
      renderHub();
      bindTopBarEvents();
      bindHubEvents();
      bindFolderEvents();
      bindBreadcrumbEvents(renderHub, renderFolder);
      bindDeleteSessionEvent();
      bindFooterEvents();
      showView("hub");
    });
  });
});

function bindFooterEvents() {
  const saveBtn = document.getElementById("btn-save");
  document
    .getElementById("btn-download")
    .addEventListener("click", downloadRtf);
  if (saveBtn) {
    saveBtn.addEventListener("click", saveSession);
  }
  document
    .getElementById("btn-save-template")
    .addEventListener("click", saveTemplate);
  document
    .getElementById("btn-reset-default")
    .addEventListener("click", resetToDefault);
  document
    .getElementById("btn-delete-template")
    .addEventListener("click", deleteTemplate);
}
