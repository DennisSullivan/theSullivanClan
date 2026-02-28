// ============================================================
// FILE: createDominoElement.js
// PURPOSE: Create the canonical two‑element DOM for a domino,
//          including the 3×3 pip grid required by domino.css.
// ============================================================

export function createDominoElement() {
  const inner = document.createElement("div");
  inner.className = "domino";

  const half0 = document.createElement("div");
  half0.className = "half half0";
  half0.dataset.pip = "0";

  const half1 = document.createElement("div");
  half1.className = "half half1";
  half1.dataset.pip = "0";

  // Add 7 pip nodes to each half
  for (let i = 1; i <= 7; i++) {
    const p0 = document.createElement("div");
    p0.className = `pip p${i}`;
    half0.appendChild(p0);

    const p1 = document.createElement("div");
    p1.className = `pip p${i}`;
    half1.appendChild(p1);
  }

  inner.appendChild(half0);
  inner.appendChild(half1);

  return inner;
}
