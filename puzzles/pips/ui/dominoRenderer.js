// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Build DOM for a single domino (used by tray and board).
// NOTES:
//   - Pure UI: never mutates the domino model.
//   - Uses canonical pip0/pip1 only.
//   - Always creates seven .pip elements per half.
// ============================================================

function createPips() {
  const container = document.createElement("div");
  container.className = "pip-grid";

  for (let i = 1; i <= 7; i++) {
    const p = document.createElement("div");
    p.className = `pip p${i}`;
    container.appendChild(p);
  }

  return container;
}

function normalizePipValue(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function renderDomino(domino, wrapper) {
  if (!wrapper) {
    console.error("renderDomino: wrapper is null/undefined.");
    return;
  }

  wrapper.innerHTML = "";

  // ------------------------------------------------------------
  // Canonical pip extraction
  // ------------------------------------------------------------
  let pip0 = normalizePipValue(domino?.pip0);
  let pip1 = normalizePipValue(domino?.pip1);

  // ------------------------------------------------------------
  // Build DOM structure
  // ------------------------------------------------------------
  const inner = document.createElement("div");
  inner.className = "domino";

  const half0 = document.createElement("div");
  half0.className = "half half0";
  half0.dataset.pip = String(pip0);
  half0.appendChild(createPips());

  const half1 = document.createElement("div");
  half1.className = "half half1";
  half1.dataset.pip = String(pip1);
  half1.appendChild(createPips());

  inner.appendChild(half0);
  inner.appendChild(half1);
  wrapper.appendChild(inner);

  // ------------------------------------------------------------
  // Accessibility label
  // ------------------------------------------------------------
  wrapper.setAttribute(
    "aria-label",
    `Domino ${domino?.id ?? ""} ${String(pip0)}-${String(pip1)}`
  );
}
