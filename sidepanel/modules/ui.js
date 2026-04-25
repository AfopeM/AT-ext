// ── Inline Confirm Strip ─────────────────────────────────────────────────────
// window.confirm() is blocked in Chrome extension side panels.
// This shows an in-page confirmation bar instead.
//
// stripId   — the ID of the hidden <div> that becomes the confirm strip
// message   — the warning text shown to the user
// onConfirm — the function to run if the user clicks "Yes, Delete"

export function showConfirmStrip(stripId, message, onConfirm) {
  const strip = document.getElementById(stripId);

  strip.innerHTML = `
    <span class="confirm-strip__message">${message}</span>
    <div class="confirm-strip__actions">
      <button class="btn btn--danger confirm-yes">Yes, Delete</button>
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
