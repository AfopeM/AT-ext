import { downloadRtf } from "./features/workspace/export.js";
import { loadTemplates, loadPatients } from "./shared/storage.js";
import { showView } from "./shared/views.js";
import { renderHub, bindHubEvents } from "./features/hub/hub.js";
import { bindFolderEvents } from "./features/folder/folder.js";
import {
  saveSession,
} from "./features/workspace/canvas.js";
import {
  populateTemplateDropdown,
  bindTopBarEvents,
} from "./features/workspace/workspace.js";

document.addEventListener("DOMContentLoaded", () => {
  loadTemplates(() => {
    populateTemplateDropdown();
    loadPatients(() => {
      renderHub();
      bindTopBarEvents();
      bindHubEvents();
      bindFolderEvents();
      bindFooterEvents();
      bindWorkspaceBack();
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

function bindWorkspaceBack() {
  const btn = document.getElementById("btn-workspace-back");
  if (!btn) return;
  btn.addEventListener("click", () => showView("folder"));
}
