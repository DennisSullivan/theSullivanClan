// ============================================================
// FILE: rotateButton.js
// PURPOSE: Handles click-based rotation for dominos.
// NOTES:
//   - Pure UI: reads engine state, calls engine rotation.
//   - Never mutates domino state directly.
//   - No orientation flags, no A/B model.
// ============================================================

import { rotateDomino } from "../engine/rotation.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";


// ------------------------------------------------------------
// enableRotateButtons(dominos, grid, regionMap, blocked, boardEl, trayEl)
// Attaches click handlers to all rotate buttons.
// INPUTS:
//   dominos, grid, regionMap, blocked - engine state
//   boardEl, trayEl - DOM containers
// NOTES:
//   - Assumes each domino element contains a .rotate-btn child.
// ------------------------------------------------------------
export function enableRotateButtons(dominos, grid, regionMap, blocked, boardEl, trayEl) {
  document.addEventListener("click", e => {
    const btn = e.target.closest(".rotate-btn");
    if (!btn) return;

    const dominoEl = btn.closest(".domino");
    if (!dominoEl) return;

    const id = dominoEl.id.replace("domino-", "");
    const domino = dominos.get(id);
    if (!domino) return;

    handleRotate(domino, dominos, grid, regionMap, blocked, boardEl, trayEl);
  });
}


// ------------------------------------------------------------
// handleRotate(domino, ...)
// Attempts to rotate a domino and re-renders UI.
// NOTES:
//   - Calls engine.rotateDomino().
//   - If rotation fails, nothing changes.
// ------------------------------------------------------------
function handleRotate(domino, dominos, grid, regionMap, blocked, boardEl, trayEl) {
  const ok = rotateDomino(domino, grid);

  // Even if rotation fails, we re-render to keep UI in sync
  rerender(dominos, grid, regionMap, blocked, boardEl, trayEl);
}


// ------------------------------------------------------------
// rerender(...)
// Convenience helper to redraw board + tray.
// ------------------------------------------------------------
function rerender(dominos, grid, regionMap, blocked, boardEl, trayEl) {
  renderBoard(dominos, grid, regionMap, blocked, boardEl);
  renderTray(dominos, trayEl);
}

