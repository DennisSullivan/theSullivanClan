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
//   - DOM order is normalized to match (row0,col0) and (row1,col1).
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
  // DOM ORDER NORMALIZATION (contract‑clean)
  //
  // The renderer must visually place half0 at (row0,col0)
  // and half1 at (row1,col1). If the coordinate pair for half1
  // is "less" than half0, swap the DOM children.
  //
  // This uses only coordinate comparison — no directional meaning.
  // ------------------------------------------------------------
  const r0 = Number(wrapper.dataset.row0);
  const c0 = Number(wrapper.dataset.col0);
  const r1 = Number(wrapper.dataset.row1);
  const c1 = Number(wrapper.dataset.col1);

  if (
    Number.isFinite(r0) &&
    Number.isFinite(c0) &&
    Number.isFinite(r1) &&
    Number.isFinite(c1)
  ) {
    const half1ShouldComeFirst =
      r1 < r0 || (r1 === r0 && c1 < c0);

    if (half1ShouldComeFirst) {
      if (half1.nextSibling !== half0) {
        half0.before(half1);
      }
    } else {
      if (half0.nextSibling !== half1) {
        half1.before(half0);
      }
    }
  }

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
