// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Visual-only pivot preview for board rotation.
// MODEL:
//  - Board rotation is a pivot around the initially clicked cell
//  - Pivot cell is frozen for the session
//  - No logical mutation during session
//  - Preview survives renderPuzzle()
// ============================================================

import { findDominoCells } from "../engine/grid.js";

let rotatingDomino = null;
let rotatingPrev = null;
let rotatingPivotCell = null;
let rotationGhost = null;

export function initRotation(dominos, grid, trayEl, boardEl, renderPuzzle) {

  // ----------------------------------------------------------
  // TRAY click rotates tray domino visually (unchanged)
  // ----------------------------------------------------------
  trayEl.addEventListener("click", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;
    if (domino.row0 !== null) return;

    domino.trayOrientation = ((domino.trayOrientation || 0) + 90) % 360;
    renderPuzzle();
  });

  // ----------------------------------------------------------
  // BOARD double-click → pivot preview (ADVANCING)
  // ----------------------------------------------------------
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
    // Derive clicked grid cell from wrapper anchor + geometry
    // --------------------------------------------------------
    const baseRow = Number(wrapper.style.getPropertyValue("--row"));
    const baseCol = Number(wrapper.style.getPropertyValue("--col"));
    const half0Side = wrapper.dataset.half0Side;

    let clickRow = baseRow;
    let clickCol = baseCol;

    if (halfEl.classList.contains("half1")) {
      switch (half0Side) {
        case "left":   clickCol = baseCol + 1; break;
        case "right":  clickCol = baseCol - 1; break;
        case "top":    clickRow = baseRow + 1; break;
        case "bottom": clickRow = baseRow - 1; break;
      }
    }

    // --------------------------------------------------------
    // Start or continue rotation session
    // --------------------------------------------------------
    if (rotatingDomino !== domino) {
      rotatingDomino = domino;
      rotatingPivotCell = { row: clickRow, col: clickCol };

      const cells = findDominoCells(grid, String(id));
      if (cells.length !== 2) return;

      const cell0 = cells.find(c => c.half === 0);
      const cell1 = cells.find(c => c.half === 1);
      if (!cell0 || !cell1) return;

      rotatingPrev = {
        r0: cell0.row,
        c0: cell0.col,
        r1: cell1.row,
        c1: cell1.col
      };
    } else {
      rotatingPrev = {
        r0: rotationGhost.row0,
        c0: rotationGhost.col0,
        r1: rotationGhost.row1,
        c1: rotationGhost.col1
      };
    }

    // --------------------------------------------------------
    // Determine pivotHalf from frozen pivot cell
    // --------------------------------------------------------
    const pivotHalf =
      (rotatingPrev.r1 === rotatingPivotCell.row &&
       rotatingPrev.c1 === rotatingPivotCell.col) ? 1 : 0;

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

  // ----------------------------------------------------------
  // End session on pointerdown outside
  // ----------------------------------------------------------
  document.addEventListener("pointerdown", (event) => {
    if (!rotatingDomino) return;

    const inside =
      event.target.closest(".domino-wrapper")?.dataset.dominoId ===
      String(rotatingDomino.id);

    if (!inside) clearRotationPreview(renderPuzzle);
  });
}

// ------------------------------------------------------------
// Compute pivoted placement (CLOCKWISE)
// ------------------------------------------------------------
function computePivotPreview(prev, pivotHalf) {
  const pivot =
    pivotHalf === 0
      ? { r: prev.r0, c: prev.c0 }
      : { r: prev.r1, c: prev.c1 };

  const other =
    pivotHalf === 0
      ? { r: prev.r1, c: prev.c1 }
      : { r: prev.r0, c: prev.c0 };

  const dr = other.r - pivot.r;
  const dc = other.c - pivot.c;

  // vertical → horizontal (clockwise)
  if (Math.abs(dr) === 1 && dc === 0) {
    return pivotHalf === 0
      ? { row0: pivot.r, col0: pivot.c, row1: pivot.r, col1: pivot.c - dr }
      : { row0: pivot.r, col0: pivot.c - dr, row1: pivot.r, col1: pivot.c };
  }

  // horizontal → vertical (clockwise)
  if (Math.abs(dc) === 1 && dr === 0) {
    return pivotHalf === 0
      ? { row0: pivot.r, col0: pivot.c, row1: pivot.r + dc, col1: pivot.c }
      : { row0: pivot.r + dc, col0: pivot.c, row1: pivot.r, col1: pivot.c };
  }

  return null;
}

// ------------------------------------------------------------
// Clear preview state
// ------------------------------------------------------------
function clearRotationPreview(renderPuzzle) {
  rotationGhost = null;
  rotatingDomino = null;
  rotatingPrev = null;
  rotatingPivotCell = null;
  renderPuzzle();
}

// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------
export function getRotatingDominoId() {
  return rotatingDomino?.id ?? null;
}

export function getRotationGhost() {
  return rotationGhost;
}
