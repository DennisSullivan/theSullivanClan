// ============================================================
// FILE: createDominoElement.js
// PURPOSE: Create the canonical two‑element DOM for a domino.
// NOTES:
//   - Pure DOM construction: no model mutation.
//   - Does NOT set pip values (renderDomino handles that).
//   - Does NOT set orientation (wrapper dataset controls that).
//   - Produces the exact structure expected by dominoRenderer.
// ============================================================

export function createDominoElement() {
  // Outer wrapper is created by board/tray renderers.
  // This function returns ONLY the inner canonical structure.

  const inner = document.createElement("div");
  inner.className = "domino";

  const half0 = document.createElement("div");
  half0.className = "half half0";
  half0.dataset.pip = "0";

  const half1 = document.createElement("div");
  half1.className = "half half1";
  half1.dataset.pip = "0";

  inner.appendChild(half0);
  inner.appendChild(half1);

  return inner;
}
