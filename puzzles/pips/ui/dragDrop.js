// ============================================================
// FILE: dragDrop.js
// PURPOSE: Enables drag-and-drop interactions for dominos.
// NOTES:
//   - Pure UI event handling.
//   - Calls engine placement/move functions.
//   - Re-renders board + tray after each action.
//   - Runs SyncCheck.
// ============================================================

import { placeDomino, moveDomino, removeDominoToTray } from "../engine/placement.js";
import { syncCheck } from "../engine/syncCheck.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";


// ------------------------------------------------------------
// enableDrag(dominos, grid, regionMap, boardEl, trayEl)
// Wires up drag events for all dominos.
// ------------------------------------------------------------
export function enableDrag(dominos, grid, regionMap, boardEl, trayEl) {
  boardEl.addEventListener("pointerdown", (e) =>
    startDrag(e, dominos, grid, regionMap, boardEl, trayEl)
  );
  trayEl.addEventListener("pointerdown", (e) =>
    startDrag(e, dominos, grid, regionMap, boardEl, trayEl)
  );
}


// ------------------------------------------------------------
// startDrag(e)
// Determines which domino was grabbed and begins tracking.
// ------------------------------------------------------------
function startDrag(e, dominos, grid, regionMap, boardEl, trayEl) {
  const target = e.target.closest(".domino");
  if (!target) return;

  const dominoId = target.dataset.id;
  const domino = dominos.get(dominoId);
  if (!domino) return;

  e.preventDefault();

  const dragState = {
    domino,
    startX: e.clientX,
    startY: e.clientY,
    moved: false
  };

  const moveHandler = (ev) => onDrag(ev, dragState);
  const upHandler = (ev) =>
    endDrag(ev, dragState, dominos, grid, regionMap, boardEl, trayEl, moveHandler, upHandler);

  window.addEventListener
