// ── Inline Confirm Strip ─────────────────────────────────────────────────────
export function showConfirmStrip(
  stripId,
  message,
  onConfirm,
  confirmLabel = "Yes, Delete",
) {
  const strip = document.getElementById(stripId);

  strip.innerHTML = `
    <span class="confirm-strip__message">${message}</span>
    <div class="confirm-strip__actions">
      <button class="btn btn--danger confirm-yes">${confirmLabel}</button>
      <button class="btn btn--secondary confirm-no">Cancel</button>
    </div>
  `;
  strip.style.display = "flex";

  strip.querySelector(".confirm-yes").addEventListener("click", () => {
    strip.style.display = "none";
    strip.innerHTML = "";
    onConfirm();
  });

  strip.querySelector(".confirm-no").addEventListener("click", () => {
    strip.style.display = "none";
    strip.innerHTML = "";
  });
}

// ── Name Confirm Strip ───────────────────────────────────────────────────────
// Used for default template deletion. The confirm button stays disabled
// until the user types the exact template name — prevents accidents.
export function showNameConfirmStrip(
  stripId,
  message,
  expectedName,
  onConfirm,
) {
  const strip = document.getElementById(stripId);

  strip.innerHTML = `
    <span class="confirm-strip__message">${message}</span>
    <div class="confirm-strip__actions" style="flex-direction: column; gap: 6px; width: 100%">
      <input id="name-confirm-input" class="pill-input" type="text"
        placeholder='Type "${expectedName}" to confirm' autocomplete="off" />
      <div style="display:flex; gap:6px;">
        <button class="btn btn--danger confirm-yes" disabled>Yes, Delete</button>
        <button class="btn btn--secondary confirm-no">Cancel</button>
      </div>
    </div>
  `;
  strip.style.display = "flex";
  strip.style.flexDirection = "column";
  strip.style.gap = "6px";

  const input = strip.querySelector("#name-confirm-input");
  const yesBtn = strip.querySelector(".confirm-yes");

  input.addEventListener("input", () => {
    yesBtn.disabled = input.value.trim() !== expectedName;
  });

  yesBtn.addEventListener("click", () => {
    strip.style.display = "none";
    strip.innerHTML = "";
    onConfirm();
  });

  strip.querySelector(".confirm-no").addEventListener("click", () => {
    strip.style.display = "none";
    strip.innerHTML = "";
  });

  input.focus();
}

// ── Info Strip ───────────────────────────────────────────────────────────────
// Non-destructive notice — used when an action is blocked (e.g. deleting last template).
export function showInfoStrip(stripId, message) {
  const strip = document.getElementById(stripId);

  strip.innerHTML = `
    <span class="confirm-strip__message">${message}</span>
    <div class="confirm-strip__actions">
      <button class="btn btn--secondary confirm-no">OK</button>
    </div>
  `;
  strip.style.display = "flex";

  strip.querySelector(".confirm-no").addEventListener("click", () => {
    strip.style.display = "none";
    strip.innerHTML = "";
  });
}
