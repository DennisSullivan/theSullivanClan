// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Populate an existing two‑element domino DOM.
// NOTES:
//   - Pure UI: never mutates the domino model.
//   - Assumes wrapper already contains the canonical structure:
//       <div class="domino">
//         <div class="half half0">…pips…</div>
//         <div class="half half1">…pips…</div>
//       </div>
//   - Only updates pip values + orientation class on the inner .domino.
//   - DOM order is fixed: half0 then half1. No reordering based on geometry.
//   - Orientation is derived from adjacency and used only for visual classes.
//   - Added diagnostics:
//       (1) Warn if no placement attempted due to missing/out‑of‑bounds coords.
//       (2) Warn if coords are non‑adjacent.
//       (3) Log placement data if placement is attempted.
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

  const half0 = inner.querySelector(".half.half0");
  const half1 = inner.querySelector(".half.half1");

  if (!half0 || !half1) {
    console.error("renderDomino: missing .half0/.half1 elements", wrapper);
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
  // Orientation derivation (visual only) + diagnostics
  // Geometry is defined in Domino Geometry Contract.
  // This renderer derives orientation from adjacency solely
  // to select visual classes. No model state is mutated.
  // ------------------------------------------------------------
  const r0 = Number(wrapper.dataset.row0);
  const c0 = Number(wrapper.dataset.col0);
  const r1 = Number(wrapper.dataset.row1);
  const c1 = Number(wrapper.dataset.col1);

  const coordsAreValid =
    Number.isFinite(r0) &&
    Number.isFinite(c0) &&
    Number.isFinite(r1) &&
    Number.isFinite(c1);

  // Clear any previous orientation classes
  inner.classList.remove("domino-horizontal", "domino-vertical");

  if (!coordsAreValid) {
    console.warn(
      "renderDomino: no placement attempted (missing or non‑numeric coords)",
      {
        row0: wrapper.dataset.row0,
        col0: wrapper.dataset.col0,
        row1: wrapper.dataset.row1,
        col1: wrapper.dataset.col1
      }
    );
  } else {
    const sameRow = r0 === r1;
    const sameCol = c0 === c1;
    const colDelta = Math.abs(c0 - c1);
    const rowDelta = Math.abs(r0 - r1);

    const isHorizontal = sameRow && colDelta === 1;
    const isVertical = sameCol && rowDelta === 1;
    const isAdjacent = isHorizontal || isVertical;

    if (!isAdjacent) {
      console.warn("renderDomino: coords are not orthogonally adjacent", {
        id: domino?.id,
        row0: r0,
        col0: c0,
        row1: r1,
        col1: c1
      });
    } else {
      console.log("renderDomino: placement attempted", {
        id: domino?.id,
        pip0,
        pip1,
        row0: r0,
        col0: c0,
        row1: r1,
        col1: c1,
        orientation: isHorizontal ? "horizontal" : "vertical"
      });

      inner.classList.remove(
        "domino-horizontal",
        "domino-vertical",
        "half0-right",
        "half0-bottom"
      );
      
      if (isHorizontal) {
        inner.classList.add("domino-horizontal");
        if (c0 > c1) inner.classList.add("half0-right");
      } else if (isVertical) {
        inner.classList.add("domino-vertical");
        if (r0 > r1) inner.classList.add("half0-bottom");
      }
    }
  }

  // ------------------------------------------------------------
  // Accessibility label
  // ------------------------------------------------------------
  wrapper.setAttribute(
    "aria-label",
    `Domino ${domino?.id ?? ""} ${String(pip0)}-${String(pip1)}`
  );
}
