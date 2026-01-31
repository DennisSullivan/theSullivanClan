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
// enableDrag(dominos, grid, regionMap, blocked, boardEl, trayEl)
// Wires up drag events for all dominos.
// ------------------------------------------------------------
export function enableDrag(dominos, grid, regionMap, blocked, boardEl, trayEl) {
  boardEl.addEventListener("pointerdown", (e) => startDrag(e, dominos, grid, regionMap, blocked, boardEl, trayEl));
  trayEl.addEventListener("pointerdown", (e) => startDrag(e, dominos, grid, regionMap, blocked, boardEl, trayEl));
}


// ------------------------------------------------------------
// startDrag(e)
// Determines which domino was grabbed and begins tracking.
// ------------------------------------------------------------
function startDrag(e, dominos, grid, regionMap, blocked, boardEl, trayEl) {
  const target = e.target.closest(".domino");
console.log("POINTERDOWN fired on:", e.target);
console.log("closest('.domino') =", e.target.closest(".domino"));
  if (!target) return;

  const dominoId = target.dataset.id;
  const domino = dominos.get(dominoId);
console.log("Domino is", domino);
  if (!domino) return;

  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;

  const dragState = {
    domino,
    startX,
    startY,
    moved: false
  };

  const moveHandler = (ev) => onDrag(ev, dragState);
  const upHandler = (ev) => endDrag(ev, dragState, dominos, grid, regionMap, blocked, boardEl, trayEl, moveHandler, upHandler);

  window.addEventListener("pointermove", moveHandler);
  window.addEventListener("pointerup", upHandler);
}


// ------------------------------------------------------------
// onDrag(e)
// Tracks movement; sets moved=true once threshold exceeded.
// ------------------------------------------------------------
function onDrag(e, dragState) {
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
console.log("DRAG MOVE:", e.clientX, e.clientY);

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    dragState.moved = true;
  }
}


// ------------------------------------------------------------
// endDrag(e)
// Determines drop target and applies engine action.
// ------------------------------------------------------------
function endDrag(e, dragState, dominos, grid, regionMap, blocked, boardEl, trayEl, moveHandler, upHandler) {
  window.removeEventListener("pointermove", moveHandler);
  window.removeEventListener("pointerup", upHandler);
console.log("END DRAG fired. moved =", dragState.moved);

  const { domino, moved } = dragState;

  // If not moved, treat as click (rotation handled elsewhere)
  if (!moved) return;

  const dropTarget = document.elementFromPoint(e.clientX, e.clientY);

  // Dropped on tray?
  if (dropTarget && dropTarget.closest("#tray")) {
    removeDominoToTray(domino, grid);
    finalize(dominos, grid, regionMap, blocked, boardEl, trayEl);
    return;
  }

  // Dropped on board cell?
  const cell = dropTarget && dropTarget.closest(".board-cell");
  if (cell) {
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

    if (domino.row0 === null) {
      // From tray → board
      placeDomino(domino, row, col, grid, blocked);
    } else {
      // From board → board
      moveDomino(domino, row, col, grid, blocked);
    }

    finalize(dominos, grid, regionMap, blocked, boardEl, trayEl);
    return;
  }

  // Otherwise: return to tray
  removeDominoToTray(domino, grid);
  finalize(dominos, grid, regionMap, blocked, boardEl, trayEl);
}


// ------------------------------------------------------------
// finalize()
// Re-render + sync check after any drag action.
// ------------------------------------------------------------
function finalize(dominos, grid, regionMap, blocked, boardEl, trayEl) {
  renderBoard(dominos, grid, regionMap, blocked, boardEl);
  renderTray(dominos, trayEl);
  syncCheck(dominos, grid);
}
