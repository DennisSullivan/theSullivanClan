// ============================================================
// FILE: rotation.js
// PURPOSE: Full rotation-mode system for dominos.
// NOTES:
//   - Double-click enters rotation mode on board dominos.
//   - Double-click on tray rotates tray domino visually.
//   - While in rotation mode, rotations are geometry-only.
//   - When rotation mode completes, commitRotation(domino, grid)
//     is called to validate and atomically apply the rotated geometry.
//   - Canceling restores original geometry.
// ============================================================

import {
  rotateDominoOnBoard,
  rotateDominoInTray,
  commitRotation
} from "../engine/placement.js";

// ------------------------------------------------------------
// Internal rotation-mode state
// ------------------------------------------------------------
let rotatingDomino = null;

// ------------------------------------------------------------
// initRotation(dominos, trayEl, boardEl, renderPuzzle, endDrag)
// - dominos: Map or collection of domino objects
// - trayEl, boardEl: DOM elements
// - renderPuzzle: function that re-renders board + tray
// - endDrag: rotation-mode uses endDrag.fire to commit on drop
// ------------------------------------------------------------
export function initRotation(dominos, trayEl, boardEl, renderPuzzle, endDrag) {
  if (!trayEl || !boardEl || !renderPuzzle || !endDrag) {
    console.warn("initRotation: missing required args");
    return;
  }

  // ==========================================================
  // TRAY DOUBLE-CLICK → rotate tray domino (no rotation mode)
  // ==========================================================
  trayEl.addEventListener("dblclick", (event) => {
    const dominoEl = event.target.closest(".domino");
    if (!dominoEl) return;

    const id = dominoEl.dataset.id;
    const domino = (dominos instanceof Map) ? dominos.get(id) : dominos.find(d => String(d.id) === String(id));
    if (!domino || domino.row0 !== null) return;

    rotateDominoInTray(domino);
    renderPuzzle();
  });

  // ==========================================================
  // BOARD DOUBLE-CLICK → enter rotation mode or rotate again
  // ==========================================================
  boardEl.addEventListener("dblclick", (event) => {
    const dominoEl = event.target.closest(".domino");
    if (!dominoEl) return;

    const id = dominoEl.dataset.id;
    const domino = (dominos instanceof Map) ? dominos.get(id) : dominos.find(d => String(d.id) === String(id));
    if (!domino || domino.row0 === null) return;

    // Determine pivot half robustly
    const halfEl = event.target.closest(".half");
    let pivotHalf = 0;
    if (halfEl) {
      if (halfEl.classList.contains("half1")) pivotHalf = 1;
      else if (halfEl.classList.contains("half0")) pivotHalf = 0;
      else {
        const halves = Array.from(halfEl.parentElement.querySelectorAll('.half'));
        pivotHalf = halves.indexOf(halfEl) === 1 ? 1 : 0;
      }
    }

    // Enter rotation mode if not already rotating this domino
    if (rotatingDomino !== domino) {
      rotatingDomino = domino;

      // Snapshot previous geometry on the domino so commitRotation can restore if needed
      domino._prevRow0 = domino.row0;
      domino._prevCol0 = domino.col0;
      domino._prevRow1 = domino.row1;
      domino._prevCol1 = domino.col1;
    }

    // Geometry-only rotate (user can rotate past bounds/obstructions)
    rotateDominoOnBoard(domino, pivotHalf);

    // Re-render to show geometry-only rotation
    renderPuzzle();
  });

  // ==========================================================
  // OUTSIDE CLICK → cancel rotation mode
  // ==========================================================
  document.addEventListener("mousedown", (event) => {
    if (!rotatingDomino) return;
    if (event.target.closest(".domino")) return;

    // Cancel rotation and restore snapshot
    cancelRotation(renderPuzzle);
  });

  // ==========================================================
  // endDrag → commit rotation (validate placement)
  // The endDrag callback receives (domino, row, col, grid)
  // ==========================================================
  endDrag.registerCallback((domino, row, col, grid) => {
    if (!rotatingDomino) return;
    if (rotatingDomino !== domino) return;

    // Attempt to commit the rotated geometry atomically.
    // commitRotation will validate bounds/occupancy and restore previous geometry
    // if the commit fails. It returns true on success, false on failure.
    const ok = commitRotation(domino, grid);

    // Clear rotation-mode state regardless of success
    rotatingDomino = null;

    // Re-render to reflect final state
    renderPuzzle();

    if (!ok) {
      // Optional: brief console hint for debugging; UI can show a toast instead.
      console.warn(`rotation: commit failed for domino ${domino.id}; geometry restored`);
    }
  });
}

// ------------------------------------------------------------
// cancelRotation
// Restores the domino geometry snapshot and clears rotation state.
// ------------------------------------------------------------
function cancelRotation(renderPuzzle) {
  if (!rotatingDomino) return;

  const d = rotatingDomino;

  if (typeof d._prevRow0 !== 'undefined') {
    d.row0 = d._prevRow0;
    d.col0 = d._prevCol0;
    d.row1 = d._prevRow1;
    d.col1 = d._prevCol1;
  }

  // Cleanup snapshot metadata
  delete d._prevRow0;
  delete d._prevCol0;
  delete d._prevRow1;
  delete d._prevCol1;

  rotatingDomino = null;

  renderPuzzle();
}
