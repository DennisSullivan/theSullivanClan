// ============================================================
// FILE: rotation.js
// PURPOSE: Wire up double-click rotation for dominos.
// NOTES:
//   - Double-click on tray domino → rotate in tray (trayOrientation).
//   - Double-click on board domino → rotate on board (geometry).
//   - Pivot half is determined via DOM (.half0 / .half1).
//   - Always rotates 90° clockwise.
//   - Constraints are enforced later on placement/move.
// ============================================================

import {
  rotateDominoOnBoard,
  rotateDominoInTray
} from "./placement.js";


// ------------------------------------------------------------
// initRotation(dominos, trayEl, boardEl, renderPuzzle)
// dominos: Map<string, domino>
// trayEl:  tray container element
// boardEl: board container element
// renderPuzzle: function that re-renders tray + board
// ------------------------------------------------------------
export function initRotation(dominos, trayEl, boardEl, renderPuzzle) {

  // Tray: double-click rotates tray domino (visual only)
  trayEl.addEventListener("dblclick", (event) => {
    const dominoEl = event.target.closest(".domino");
    if (!dominoEl) return;

    const id = dominoEl.dataset.id;
    if (!id) return;

    const domino = dominos.get(id);
    if (!domino) return;

    // Only rotate if it's actually in the tray
    if (domino.row0 !== null) return;

    rotateDominoInTray(domino);
    renderPuzzle();
  });

  // Board: double-click rotates board domino around clicked half
  boardEl.addEventListener("dblclick", (event) => {
    const dominoEl = event.target.closest(".domino");
    if (!dominoEl) return;

    const id = dominoEl.dataset.id;
    if (!id) return;

    const domino = dominos.get(id);
    if (!domino) return;

    // Only rotate if it's actually on the board
    if (domino.row0 === null) return;

    // Determine pivot half via DOM
    let pivotHalf = 0;
    const half0 = event.target.closest(".half0");
    const half1 = event.target.closest(".half1");

    if (half1 && !half0) {
      pivotHalf = 1;
    } else if (half0 && !half1) {
      pivotHalf = 0;
    } else {
      // Fallback: default to half0
      pivotHalf = 0;
    }

    rotateDominoOnBoard(domino, pivotHalf);
    renderPuzzle();
  });
}
