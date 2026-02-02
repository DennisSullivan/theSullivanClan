// ============================================================
// FILE: rotation.js
// PURPOSE: Full rotation-mode system for dominos.
// NOTES:
//   - Double-click enters rotation mode.
//   - Each double-click rotates 90° clockwise.
//   - Pivot half determined via DOM (.half / .half1).
//   - Rotation ignores constraints.
//   - Rotation commits on endDrag.
//   - Rotation cancels on outside click.
// ============================================================

import {
  rotateDominoOnBoard,
  rotateDominoInTray,
  placeDomino,
  moveDomino
} from "../engine/placement.js";


// ------------------------------------------------------------
// Internal rotation-mode state
// ------------------------------------------------------------
let rotatingDomino = null;
let originalGeometry = null;


// ------------------------------------------------------------
// initRotation(dominos, trayEl, boardEl, renderPuzzle, endDrag)
// ------------------------------------------------------------
export function initRotation(dominos, trayEl, boardEl, renderPuzzle, endDrag) {

  // ==========================================================
  // TRAY DOUBLE-CLICK → rotate tray domino (no rotation mode)
  // ==========================================================
  trayEl.addEventListener("dblclick", (event) => {
    const dominoEl = event.target.closest(".domino");
    if (!dominoEl) return;

    const id = dominoEl.dataset.id;
    const domino = dominos.get(id);
    if (!domino) return;

    if (domino.row0 !== null) return; // must be in tray

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
    const domino = dominos.get(id);
    if (!domino) return;

    if (domino.row0 === null) return; // must be on board

    // Determine pivot half via DOM
    let pivotHalf = 0;
    if (event.target.closest(".half1")) {
      pivotHalf = 1;
    }


    // --------------------------------------------------------
    // ENTER ROTATION MODE
    // --------------------------------------------------------
    if (rotatingDomino !== domino) {
      rotatingDomino = domino;

      // Save original geometry for cancel/commit
      originalGeometry = {
        row0: domino.row0,
        col0: domino.col0,
        row1: domino.row1,
        col1: domino.col1
      };
    }

    // --------------------------------------------------------
    // ROTATE 90° CLOCKWISE (geometry only)
    // --------------------------------------------------------
    rotateDominoOnBoard(domino, pivotHalf);

    // Visual update
    renderPuzzle();
  });


  // ==========================================================
  // OUTSIDE CLICK → cancel rotation mode
  // ==========================================================
  document.addEventListener("mousedown", (event) => {
    if (!rotatingDomino) return;

    // If click is inside a domino, ignore
    if (event.target.closest(".domino")) return;

    // Otherwise cancel rotation
    cancelRotation(renderPuzzle);
  });


  // ==========================================================
  // endDrag → commit rotation (validate placement)
  // ==========================================================
  endDrag.registerCallback((domino, row, col, grid) => {
    if (rotatingDomino !== domino) return;

    // Try to commit by placing/moving
    const success = moveDomino(domino, row, col, grid);

    if (!success) {
      // Revert to original geometry
      domino.row0 = originalGeometry.row0;
      domino.col0 = originalGeometry.col0;
      domino.row1 = originalGeometry.row1;
      domino.col1 = originalGeometry.col1;
    }

    // End rotation mode
    rotatingDomino = null;
    originalGeometry = null;

    renderPuzzle();
  });
}



// ------------------------------------------------------------
// cancelRotation
// ------------------------------------------------------------
function cancelRotation(renderPuzzle) {
  if (!rotatingDomino || !originalGeometry) return;

  // Restore original geometry
  rotatingDomino.row0 = originalGeometry.row0;
  rotatingDomino.col0 = originalGeometry.col0;
  rotatingDomino.row1 = originalGeometry.row1;
  rotatingDomino.col1 = originalGeometry.col1;

  rotatingDomino = null;
  originalGeometry = null;

  renderPuzzle();
}
