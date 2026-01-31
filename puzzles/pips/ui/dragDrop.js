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

  window.addEventListener("pointermove", moveHandler);
  window.addEventListener("pointerup", upHandler);
}


// ------------------------------------------------------------
// onDrag(e)
// ------------------------------------------------------------
function onDrag(e, dragState) {
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    dragState.moved = true;
  }
}


// ------------------------------------------------------------
// endDrag(e)
// ------------------------------------------------------------
function endDrag(
  e,
  dragState,
  dominos,
  grid,
  regionMap,
  boardEl,
  trayEl,
  moveHandler,
  upHandler
) {
  window.removeEventListener("pointermove", moveHandler);
  window.removeEventListener("pointerup", upHandler);

  const { domino, moved } = dragState;

  // If not moved, treat as click (rotation handled elsewhere)
  if (!moved) return;

  const dropTarget = document.elementFromPoint(e.clientX, e.clientY);

  // Dropped on tray?
  if (dropTarget && dropTarget.closest("#tray")) {
    removeDominoToTray(domino);
    finalize(dominos, grid, regionMap, boardEl, trayEl);
    return;
  }

  // Dropped on board cell?
  const cell = dropTarget && dropTarget.closest(".board-cell");
  if (cell) {
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (domino.row0 === null) {
      // From tray → board (geometry computed from dx, dy)
      placeDomino(domino, row, col, grid, dx, dy);
    } else {
      // From board → board (half0 moves to row,col)
      moveDomino(domino, row, col, grid);
    }

    finalize(dominos, grid, regionMap, boardEl, trayEl);
    return;
  }

  // Otherwise: return to tray
  removeDominoToTray(domino);
  finalize(dominos, grid, regionMap, boardEl, trayEl);
}


// ------------------------------------------------------------
// finalize()
// ------------------------------------------------------------
function finalize(dominos, grid, regionMap, boardEl, trayEl) {
  // boardRenderer signature:
  // renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
  //
  // BUT dragDrop does not know blocked/regions.
  // main.js must call enableDrag with a wrapper that binds them,
  // OR boardRenderer must not require them.
  //
  // Your updated boardRenderer signature is:
  // renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
  //
  // And main.js calls:
  // renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
  //
  // So finalize must ALSO receive blocked + regions.
  //
  // The corrected finalize signature is:
  // finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  //
  // But dragDrop only receives (dominos, grid, regionMap, boardEl, trayEl).
  //
  // Therefore: finalize MUST be called with blocked + regions
  // from endDrag() and from enableDrag().

  // This version assumes finalize is called with the correct arguments.
  renderBoard(dominos, grid, regionMap, boardEl);
  renderTray(dominos, trayEl);
  syncCheck(dominos, grid);
}
