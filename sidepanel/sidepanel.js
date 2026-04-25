import { downloadRtf } from "./features/workspace/export.js";
import { loadTemplates, loadPatients } from "./shared/storage.js";
import { showView, bindBreadcrumbEvents } from "./shared/views.js";
import { renderHub, bindHubEvents } from "./features/hub/hub.js";
import { renderFolder, bindFolderEvents } from "./features/folder/folder.js";
import { saveSession, bindDeleteSessionEvent } from "./features/workspace/canvas.js";
import {
  populateTemplateDropdown,
  bindTopBarEvents,
} from "./features/workspace/workspace.js";
import {
  saveTemplate,
  resetToDefault,
  deleteTemplate,
} from "./features/editor/templateEditor.js";

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
