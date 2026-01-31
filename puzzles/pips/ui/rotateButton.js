// ============================================================
// FILE: rotateButton.js
// PURPOSE: Handles click-based rotation for dominos.
// NOTES:
//   - Pure UI: reads engine state, calls engine rotation.
//   - Never mutates domino state directly.
// ============================================================

import { rotateDomino } from "../engine/rotation.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";


// ------------------------------------------------------------
// enableRotateButtons(dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
// ------------------------------------------------------------
export function enableRotateButtons(dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  document.addEventListener("click", e => {
    const btn = e.target.closest(".rotate-btn");
    if (!btn) return;

    const dominoEl = btn.closest(".domino");
    if (!dominoEl) return;

    const id = dominoEl.id.replace("domino-", "");
    const domino = dominos.get(id);
    if (!domino) return;

    handleRotate(domino, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
  });
}


// ------------------------------------------------------------
// handleRotate(domino, ...)
// ------------------------------------------------------------
function handleRotate(domino, dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  rotateDomino(domino, grid);
  rerender(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
}


// ------------------------------------------------------------
// rerender(...)
// ------------------------------------------------------------
function rerender(dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
  renderTray(dominos, trayEl);
}
