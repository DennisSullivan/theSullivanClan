// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Populate an existing two‑element domino DOM.
// NOTES:
//   - Pure UI: never mutates the domino model.
//   - Assumes wrapper was created by createDominoElement().
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

  // The wrapper must already contain:
  // <div class="domino"> <div class="half">…pips…</div> <div class="half">…</div> </div>
  const inner = wrapper.querySelector(".domino");
  if (!inner) {
    console.error("renderDomino: wrapper missing .domino child", wrapper);
    return;
  }

  // ------------------------------------------------------------
  // Canonical pip extraction
  // ------------------------------------------------------------
  const pip0 = normalizePipValue(domino?.pip0);
  const pip1 = normalizePipValue(domino?.pip1);

  const half0 = inner.querySelector(".half0") || inner.querySelector(".half:first-child");
  const half1 = inner.querySelector(".half1") || inner.querySelector(".half:last-child");

  if (!half0 || !half1) {
    console.error("renderDomino: missing half0/half1 elements", wrapper);
    return;
  }

  half0.dataset.pip = String(pip0);
  half1.dataset.pip = String(pip1);

  // ------------------------------------------------------------
  // Orientation (board + tray)
  // ------------------------------------------------------------
  const half0Side = wrapper.dataset.half0Side;

  const isHorizontal =
    half0Side === "left" ||
    half0Side === "right";

  inner.classList.toggle("vertical", !isHorizontal);
  inner.classList.toggle("horizontal", isHorizontal);

  // ------------------------------------------------------------
  // Accessibility label
  // ------------------------------------------------------------
  wrapper.setAttribute(
    "aria-label",
    `Domino ${domino?.id ?? ""} ${String(pip0)}-${String(pip1)}`
  );
}
