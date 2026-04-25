import { downloadRtf } from "./modules/export.js";
import { loadTemplates, loadPatients } from "./modules/storage.js";
import { showView, bindBreadcrumbEvents } from "./modules/views.js";
import { renderHub, bindHubEvents } from "./modules/hub.js";
import { renderFolder, bindFolderEvents } from "./modules/folder.js";
import { bindDeleteSessionEvent } from "./modules/canvas.js";
import {
  populateTemplateDropdown,
  bindTopBarEvents,
} from "./modules/workspace.js";
import { saveSession } from "./modules/canvas.js";

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
}
