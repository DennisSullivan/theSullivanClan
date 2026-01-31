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
export function enableDrag(dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  boardEl.addEventListener("pointerdown", (e) =>
    startDrag(e, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  );
  trayEl.addEventListener("pointerdown", (e) =>
    startDrag(e, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  );
}


// ------------------------------------------------------------
// startDrag(e)
// ------------------------------------------------------------
function startDrag(e, dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
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
    endDrag(ev, dragState, dominos, grid, regionMap, blocked, regions, boardEl, trayEl, moveHandler, upHandler);

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
  blocked,
  regions,
  boardEl,
  trayEl,
  moveHandler,
  upHandler
) {
  window.removeEventListener("pointermove", moveHandler);
  window.removeEventListener("pointerup", upHandler);

  const { domino, moved } = dragState;

  if (!moved) return;

  const dropTarget = document.elementFromPoint(e.clientX, e.clientY);

  // Dropped on tray
  if (dropTarget && dropTarget.closest("#tray")) {
    removeDominoToTray(domino);
    finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Dropped on board
  const cell = dropTarget && dropTarget.closest(".board-cell");
  if (cell) {
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (domino.row0 === null) {
      placeDomino(domino, row, col, grid, dx, dy);
    } else {
      moveDomino(domino, row, col, grid);
    }

    finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Otherwise return to tray
  removeDominoToTray(domino);
  finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
}


// ------------------------------------------------------------
// finalize()
// ------------------------------------------------------------
function finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
  renderTray(dominos, trayEl);
  syncCheck(dominos, grid);
}
