// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Visual-only pivot preview for board rotation.
// MODEL:
//  - Board rotation is a pivot around the clicked half
//  - No logical mutation during session
//  - No engine interaction
//  - Preview survives renderPuzzle()
// ============================================================

import { findDominoCells } from "../engine/grid.js";

let rotatingDomino = null;
let rotatingPrev = null;
let rotatingPivot = 0;

// NOTE: reused as render-state, NOT a DOM node
let rotationGhost = null;

export function initRotation(dominos, grid, trayEl, boardEl, renderPuzzle) {
  // ----------------------------------------------------------
  // TRAY click rotates tray domino visually (allowed)
  // ----------------------------------------------------------
  trayEl.addEventListener("click", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;

    // Tray membership should not depend on domino.row0 in your architecture.
    // Keep your existing behavior, but do not block rotation based on row0.
    if (domino.row0 !== null) return;

    domino.trayOrientation = ((domino.trayOrientation || 0) + 90) % 360;
    renderPuzzle();
  });

  // ----------------------------------------------------------
  // BOARD double-click → pivot preview (GRID TRUTH)
  // ----------------------------------------------------------
  document.addEventListener("dblclick", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!boardEl.contains(wrapper)) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;

    // Authoritative placement comes from the grid
    const cells = findDominoCells(grid, String(id));
    console.log("ROTATE: grid cells", id, JSON.stringify(cells));
    if (cells.length !== 2) return;

    const cell0 = cells.find(c => c.half === 0);
    const cell1 = cells.find(c => c.half === 1);
    if (!cell0 || !cell1) return;

    const halfEl = event.target.closest(".half");
    const pivotHalf = halfEl?.classList.contains("half1") ? 1 : 0;

    console.log("ROTATE: pivotHalf", pivotHalf);
    const pivot =
      pivotHalf === 0
        ? { r: cell0.row, c: cell0.col }
        : { r: cell1.row, c: cell1.col };
    
    const other =
      pivotHalf === 0
        ? { r: cell1.row, c: cell1.col }
        : { r: cell0.row, c: cell0.col };
    
    console.log("ROTATE: pivot", pivot, "other", other);

    rotatingDomino = domino;
    rotatingPrev = { r0: cell0.row, c0: cell0.col, r1: cell1.row, c1: cell1.col };
    rotatingPivot = pivotHalf;

    const preview = computePivotPreview(rotatingPrev, pivotHalf);
    if (!preview) return;

    console.log("ROTATE: preview", preview);

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
// Compute pivoted placement (visual only)
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

  console.log("ROTATE: dr/dc", dr, dc);

  // vertical → horizontal
  if (Math.abs(dr) === 1 && dc === 0) {
    return pivotHalf === 0
      ? { row0: pivot.r, col0: pivot.c, row1: pivot.r, col1: pivot.c + dr }
      : { row0: pivot.r, col0: pivot.c + dr, row1: pivot.r, col1: pivot.c };
  }

  // horizontal → vertical
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
  rotatingPivot = 0;
  renderPuzzle();
}

// ------------------------------------------------------------
// EXPORT: Rotating domino hook
// ------------------------------------------------------------
export function getRotatingDominoId() {
  return rotatingDomino?.id ?? null;
}

// ------------------------------------------------------------
// EXPORT: renderer hook
// ------------------------------------------------------------
export function getRotationGhost() {
  return rotationGhost;
}
