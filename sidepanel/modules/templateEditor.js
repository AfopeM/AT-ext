import { state } from "./state.js";
import { renderCanvas } from "./canvas.js";
import { renderPillGrid } from "./workspace.js";

// ── Enter Editor Mode ────────────────────────────────────────────────────────
// Replaces the pill grid with a pill manager panel.
// Replaces the canvas with the raw script_text (bracket syntax visible).

export function enterEditorMode() {
  const template = state.templates[state.activeTemplateId];
  if (!template) return;

  // 1. Swap pill grid → pill manager
  renderPillManager(template.pills);

  // 2. Swap canvas → raw text editor
  const canvas = document.getElementById("script-canvas");
  canvas.textContent = template.script_text; // plain text, no HTML tokens

  // 3. Swap footer buttons
  document.getElementById("btn-save").style.display = "none";
  document.getElementById("btn-download").style.display = "none";
  document.getElementById("btn-save-template").style.display = "inline-block";

  // 4. Lock the template dropdown (can't switch templates mid-edit)
  document.getElementById("template-select").disabled = true;
}

// ── Exit Editor Mode (back to Usage) ────────────────────────────────────────
// Re-renders the canvas with tokens and restores the pill input grid.

export function exitEditorMode() {
  const template = state.templates[state.activeTemplateId];
  if (!template) return;

  // 1. Restore pill input grid
  renderPillGrid(template.pills);

  // 2. Re-render canvas with tokens (reads from template, not canvas text)
  renderCanvas(template);

  // 3. Restore footer buttons
  document.getElementById("btn-save").style.display = "inline-block";
  document.getElementById("btn-download").style.display = "inline-block";
  document.getElementById("btn-save-template").style.display = "none";

  // 4. Unlock the template dropdown
  document.getElementById("template-select").disabled = false;
}

// ── Render Pill Manager ──────────────────────────────────────────────────────
// Shows each pill as a labeled row with a ✕ remove button.
// "Add Pill" button placeholder — wired up in Session 15.

export function renderPillManager(pills) {
  const grid = document.getElementById("pill-grid");
  grid.innerHTML = "";

  pills.forEach((pill) => {
    const row = document.createElement("div");
    row.className = "pill-manager-row";
    row.dataset.key = pill.key;

    row.innerHTML = `
      <span class="pill-manager-label">${pill.label}</span>
      <span class="pill-manager-key">[${pill.key}]</span>
      <button class="btn btn--danger pill-manager-remove" data-key="${pill.key}">✕</button>
    `;

    grid.appendChild(row);
  });

  // Add Pill button — action wired in Session 15, present now so layout is visible
  const addRow = document.createElement("div");
  addRow.className = "pill-manager-add-row";
  addRow.innerHTML = `<button id="btn-add-pill" class="btn btn--secondary">+ Add Pill</button>`;
  grid.appendChild(addRow);
}
