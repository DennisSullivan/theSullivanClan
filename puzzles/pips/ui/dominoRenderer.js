// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Populate an existing two‑element domino DOM.
// NOTES:
//   - Pure UI: never mutates the domino model.
//   - Assumes wrapper already contains the canonical structure:
//       <div class="domino">
//         <div class="half half0">…7 pips…</div>
//         <div class="half half1">…7 pips…</div>
//       </div>
//   - Only updates pip values + orientation class.
// ============================================================

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

  // ------------------------------------------------------------
  // Locate canonical inner DOM
  // ------------------------------------------------------------
  const inner = wrapper.querySelector(".domino");
  if (!inner) {
    console.error("renderDomino: wrapper missing .domino child", wrapper);
    return;
  }

  const half0 =
    inner.querySelector(".half0") ||
    inner.querySelector(".half:first-child");

  const half1 =
    inner.querySelector(".half1") ||
    inner.querySelector(".half:last-child");

  if (!half0 || !half1) {
    console.error("renderDomino: missing half0/half1 elements", wrapper);
    return;
  }

  // ------------------------------------------------------------
  // Canonical pip extraction
  // ------------------------------------------------------------
  const pip0 = normalizePipValue(domino?.pip0);
  const pip1 = normalizePipValue(domino?.pip1);

  half0.dataset.pip = String(pip0);
  half1.dataset.pip = String(pip1);

  // ------------------------------------------------------------
  // Orientation (board + tray)
  // ------------------------------------------------------------
  const half0Side = wrapper.dataset.half0Side;

  const isHorizontal =
    half0Side === "left" ||
    half0Side === "right";

  inner.classList.toggle("horizontal", isHorizontal);
  inner.classList.toggle("vertical", !isHorizontal);

  // ------------------------------------------------------------
  // Accessibility label
  // ------------------------------------------------------------
  wrapper.setAttribute(
    "aria-label",
    `Domino ${domino?.id ?? ""} ${String(pip0)}-${String(pip1)}`
  );
}
