import { state } from "./state.js";

// ── Canvas Parser ────────────────────────────────────────────────────────────
// Walks the canvas DOM and returns lines → segments.
// { type: 'text' | 'filled' | 'unfilled', value: string }

function parseCanvas() {
  const canvas = document.getElementById("script-canvas");
  const lines = [[]];

  canvas.childNodes.forEach((node) => {
    if (node.nodeName === "BR") {
      lines.push([]);
    } else if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        lines[lines.length - 1].push({ type: "text", value: node.textContent });
      }
    } else if (node.nodeName === "SPAN") {
      const isFilled = node.classList.contains("is-filled");
      lines[lines.length - 1].push({
        type: isFilled ? "filled" : "unfilled",
        value: node.textContent,
      });
    }
  });

  return lines;
}

// ── RTF Helpers ──────────────────────────────────────────────────────────────
// RTF reserves \ { } — escape them if they appear in real content.
// Non-ASCII characters use RTF unicode escapes: \uN? (the ? is a fallback char).

function escapeRtf(str) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/[^\x00-\x7F]/g, (char) => `\\u${char.charCodeAt(0)}?`);
}

// ── RTF Builder ──────────────────────────────────────────────────────────────
// \highlight4 = green   \b = bold   \par = paragraph break
// Each line in the canvas becomes one RTF paragraph.

function buildRtf(lines) {
  const paragraphs = lines.map((segments) => {
    return segments
      .map((seg) => {
        const text = escapeRtf(seg.value);

        if (seg.type === "filled") {
          // Bold + green highlight
          return `{\\b\\highlight4 ${text}}`;
        }

        if (seg.type === "unfilled") {
          // Bold + red highlight
          return `{\\b\\highlight6 ${text}}`;
        }

        // Plain text — no formatting
        return text;
      })
      .join("");
  });

  return (
    "{\\rtf1\\ansi\\ansicpg1252\\deff0\n" +
    "{\\fonttbl{\\f0\\froman\\fcharset0 Georgia;}}\n" +
    "\\f0\\fs26\\sl360\\slmult1\n" +
    paragraphs.join("\\par\n") +
    "\\par\n}"
  );
}

// ── Filename Builder ─────────────────────────────────────────────────────────
function buildFilename() {
  const patient = state.patients[state.activePatientId] || state.pendingPatient;
  const template = state.templates[state.activeTemplateId];
  const patientName = patient ? patient.name.replace(/\s+/g, "_") : "Patient";
  const templateName = template ? template.name.replace(/\s+/g, "_") : "Script";
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${patientName}_${templateName}_${date}.rtf`;
}

// ── Main Export Function ─────────────────────────────────────────────────────
export function downloadRtf() {
  const lines = parseCanvas();
  const rtfContent = buildRtf(lines);

  const blob = new Blob([rtfContent], { type: "application/rtf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildFilename();
  a.click();
  URL.revokeObjectURL(url);
}
