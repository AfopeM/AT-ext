// Load the hardcoded default templates into this scope.
// importScripts works in Chrome extension service workers.
importScripts("../defaults/templates.js");

// When the extension is first installed, seed storage with defaults.
// "update" events are intentionally excluded — we never overwrite
// user-customized templates on a version bump.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    initializeStorage();
  }
});

function initializeStorage() {
  // Check what's already in storage before writing anything.
  // This guard means running initializeStorage() twice is always safe.
  chrome.storage.local.get(["templates", "sessions"], (data) => {
    const updates = {};

    if (!data.templates) {
      // Nothing in storage yet — write all 3 defaults.
      updates.templates = DEFAULT_TEMPLATES;
      console.log("[Storage] Default templates written to storage.");
    } else {
      console.log("[Storage] Templates already exist — skipping seed.");
    }

    if (!data.sessions) {
      // Initialize an empty sessions object so it always exists.
      updates.sessions = {};
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates, () => {
        console.log("[Storage] Initialization complete.", updates);
      });
    }
  });
}

// Open the side panel when the toolbar icon is clicked.
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
