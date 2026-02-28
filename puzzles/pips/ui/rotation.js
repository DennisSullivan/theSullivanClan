// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Contract‑clean rotation preview instrumentation
// NOTES:
//   - Pure UI: never mutates engine state except trayOrientation.
//   - Pivot‑half detection is authoritative.
//   - Wrapper is the only geometry anchor.
//   - Pip container is never touched.
// ============================================================

import { findDominoCells } from "../engine/grid.js";

let rotatingDomino = null;
let rotatingPrev = null;
let rotatingPivotCell = null;
let rotationGhost = null;

export function initRotation(dominos, grid, trayEl, boardEl, renderPuzzle) {

  // ------------------------------------------------------------
  // 1. TRAY ROTATION (visual-only)
  // ------------------------------------------------------------
  trayEl.addEventListener("click", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;

    // Only rotate if in tray
    if (domino.row0 !== null) return;

    domino.trayOrientation = ((domino.trayOrientation || 0) + 90) % 360;
    renderPuzzle();
  });

  // ------------------------------------------------------------
  // 2. BOARD ROTATION (pivot‑half based)
  // ------------------------------------------------------------
  document.addEventListener("dblclick", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!boardEl.contains(wrapper)) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;

    const halfEl = event.target.closest(".half");
    if (!halfEl) return;

    // --------------------------------------------------------
    // FIX: authoritative pivot-half detection
    // --------------------------------------------------------
    const clickedHalf = halfEl.classList.contains("half1") ? 1 : 0;

    // Wrapper origin is always half0
    const baseRow = Number(wrapper.style.getPropertyValue("--row"));
    const baseCol = Number(wrapper.style.getPropertyValue("--col"));
    const half0Side = wrapper.dataset.half0Side;

    let clickRow = baseRow;
    let clickCol = baseCol;

    // Compute clicked cell from half0 orientation
    if (clickedHalf === 1) {
      switch (half0Side) {
        case "left":   clickCol = baseCol + 1; break;
        case "right":  clickCol = baseCol - 1; break;
        case "top":    clickRow = baseRow + 1; break;
        case "bottom": clickRow = baseRow - 1; break;
      }
    }

    // --------------------------------------------------------
    // Rotation session management
    // --------------------------------------------------------
    if (rotatingDomino !== domino) {
      // Start new rotation session
      rotatingDomino = domino;
      rotatingPivotCell = { row: clickRow, col: clickCol };

      const cells = findDominoCells(grid, String(id));
      const cell0 = cells.find(c => c.half === 0);
      const cell1 = cells.find(c => c.half === 1);

      rotatingPrev = {
        r0: cell0.row,
        c0: cell0.col,
        r1: cell1.row,
        c1: cell1.col
      };

    } else {
      // Advance rotation session
      rotatingPrev = {
        r0: rotationGhost.row0,
        c0: rotationGhost.col0,
        r1: rotationGhost.row1,
        c1: rotationGhost.col1
      };
    }

    // --------------------------------------------------------
    // FIX: pivotHalf = clickedHalf (spec invariant)
    // --------------------------------------------------------
    const pivotHalf = clickedHalf;

    const preview = computePivotPreview(rotatingPrev, pivotHalf);
    if (!preview) return;

    rotationGhost = {
      id: domino.id,
      row0: preview.row0,
      col0: preview.col0,
      row1: preview.row1,
      col1: preview.col1
    };

    renderPuzzle();
  });

  // ------------------------------------------------------------
  // 3. Cancel rotation session when clicking outside
  // ------------------------------------------------------------
  document.addEventListener("pointerdown", (event) => {
    if (!rotatingDomino) return;

    const inside =
      event.target.closest(".domino-wrapper")?.dataset.dominoId ===
      String(rotatingDomino.id);

    if (!inside) clearRotationPreview(renderPuzzle);
  });
}

// ============================================================
// computePivotPreview()
// 90° clockwise rotation around pivotHalf
// ============================================================
function computePivotPreview(prev, pivotHalf) {
  const half0 = { r: prev.r0, c: prev.c0 };
  const half1 = { r: prev.r1, c: prev.c1 };

  const pivot = pivotHalf === 0 ? half0 : half1;
  const other = pivotHalf === 0 ? half1 : half0;

  const dr = other.r - pivot.r;
  const dc = other.c - pivot.c;

  // 90° clockwise rotation
  const rotatedOther = {
    r: pivot.r + dc,
    c: pivot.c - dr
  };

  // Re‑express in half0‑anchored form
  if (pivotHalf === 0) {
    return {
      row0: pivot.r,
      col0: pivot.c,
      row1: rotatedOther.r,
      col1: rotatedOther.c
    };
  } else {
    return {
      row0: rotatedOther.r,
      col0: rotatedOther.c,
      row1: pivot.r,
      col1: pivot.c
    };
  }
}

// ============================================================
// clearRotationPreview()
// ============================================================
function clearRotationPreview(renderPuzzle) {
  rotationGhost = null;
  rotatingDomino = null;
  rotatingPrev = null;
  rotatingPivotCell = null;
  renderPuzzle();
}

export function getRotatingDominoId() {
  return rotatingDomino?.id ?? null;
}

export function getRotationGhost() {
  return rotationGhost;
}
