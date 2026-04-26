import { downloadRtf } from "./features/workspace/export.js";
import { loadTemplates, loadPatients, loadUser } from "./shared/storage.js";
import { getUserName } from "./shared/state.js";
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
import { initEditorView } from "./features/editor/templateEditor.js";

document.addEventListener("DOMContentLoaded", () => {
  loadTemplates(() => {
    populateTemplateDropdown();

    // Load patients and user name in parallel; proceed when both complete.
    let remaining = 2;
    const onBothLoaded = () => {
      if (--remaining > 0) return;

      // Pre-fill the burger input with the saved user name
      const savedName = getUserName();
      if (savedName) {
        const input = document.getElementById("user-name-input");
        if (input) input.value = savedName;
      }

      renderHub();
      bindTopBarEvents();
      bindHubEvents();
      bindFolderEvents();
      bindFooterEvents();
      bindWorkspaceBack();
      initEditorView();
      showView("hub");
    };

    loadPatients(onBothLoaded);
    loadUser(onBothLoaded);
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
