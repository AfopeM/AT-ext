// import { state } from "./modules/state.js";
import { loadTemplates, loadPatients } from "./modules/storage.js";
import { showView, bindBreadcrumbEvents } from "./modules/views.js";
import { renderHub, bindHubEvents } from "./modules/hub.js";
import { renderFolder, bindFolderEvents } from "./modules/folder.js";
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
      bindFooterEvents();
      showView("hub");
    });
  });
});

function bindFooterEvents() {
  const saveBtn = document.getElementById("btn-save");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveSession);
  }
}
