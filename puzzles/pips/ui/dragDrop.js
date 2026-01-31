// ============================================================
// FILE: dragDrop.js
// PURPOSE: Enables drag-and-drop interactions for dominos.
// NOTES:
//   - Pure UI event handling.
//   - Calls engine placement/move functions.
//   - Re-renders board + tray after each action.
//   - Runs SyncCheck.
//   - Includes full diagnostic logging.
// ============================================================

import { placeDomino, moveDomino, removeDominoToTray } from "../engine/placement.js";
import { syncCheck } from "../engine/syncCheck.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";


// ------------------------------------------------------------
// enableDrag
// ------------------------------------------------------------
export function enableDrag(dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  console.log("enableDrag: wiring pointerdown on board + tray");

  boardEl.addEventListener("pointerdown", (e) =>
    startDrag(e, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  );

  trayEl.addEventListener("pointerdown", (e) =>
    startDrag(e, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  );
}


// ------------------------------------------------------------
// startDrag
// ------------------------------------------------------------
function startDrag(e, dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  const target = e.target.closest(".domino");
  if (!target) return;

  const dominoId = target.dataset.id;
  const domino = dominos.get(dominoId);
  if (!domino) return;

  console.log(`startDrag: grabbed domino ${dominoId} at (${e.clientX},${e.clientY})`);

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
// onDrag
// ------------------------------------------------------------
function onDrag(e, dragState) {
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    console.log(`onDrag: movement threshold passed dx=${dx} dy=${dy}`);
    dragState.moved = true;
  }
}


// ------------------------------------------------------------
// endDrag
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

  if (!moved) {
    console.log(`endDrag: click-only, no movement for domino ${domino.id}`);
    return;
  }

  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  console.log(`endDrag: drop dx=${dx} dy=${dy}`);

  const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
  console.log("endDrag: dropTarget =", dropTarget);

  // Dropped on tray
  if (dropTarget && dropTarget.closest("#tray")) {
    console.log(`endDrag: dropping domino ${domino.id} onto tray`);
    removeDominoToTray(domino);
    finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Dropped on board cell
  const cell = dropTarget && dropTarget.closest(".board-cell");
  if (cell) {
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

    console.log(`endDrag: dropping on board cell (${row},${col})`);

    if (domino.row0 === null) {
      console.log(`endDrag: placing from tray → placeDomino(${domino.id})`);
      const ok = placeDomino(domino, row, col, grid, dx, dy);
      console.log(`placeDomino result: ${ok}`);
    } else {
      console.log(`endDrag: moving on board → moveDomino(${domino.id})`);
      const ok = moveDomino(domino, row, col, grid);
      console.log(`moveDomino result: ${ok}`);
    }

    finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Otherwise return to tray
  console.log(`endDrag: no valid drop target → returning ${domino.id} to tray`);
  removeDominoToTray(domino);
  finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
}


// ------------------------------------------------------------
// finalize
// ------------------------------------------------------------
function finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  console.log("finalize: re-rendering board + tray + syncCheck");
  renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
  renderTray(dominos, trayEl);
  syncCheck(dominos, grid);
}
