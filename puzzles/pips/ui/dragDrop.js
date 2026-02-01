// ============================================================
// FILE: dragDrop.js
// PURPOSE: Enables drag-and-drop interactions for dominos.
// NOTES:
//   - Visual dragging with translate + scale(1.1)
//   - Wrapper stays in tray slot (no collapse)
//   - Engine placement unchanged
//   - Full diagnostics preserved
//   - Rotation-mode callbacks supported via endDrag.fire()
//   - Correct half-detection using DOM
//   - FIXED: origin detection BEFORE placement
//   - FIXED: correct placeDomino signature
// ============================================================

import { placeDomino, moveDomino, removeDominoToTray } from "../engine/placement.js";
import { syncCheck } from "../engine/syncCheck.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";


// ============================================================
// Rotation-mode callback registry
// ============================================================
export const endDrag = {
  callbacks: [],
  registerCallback(fn) {
    this.callbacks.push(fn);
  },
  fire(domino, row, col, grid) {
    for (const fn of this.callbacks) {
      fn(domino, row, col, grid);
    }
  }
};


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

  const wrapper = target.closest(".domino-wrapper");
  if (!wrapper) return;

  const dominoId = target.dataset.id;
  const domino = dominos.get(dominoId);
  if (!domino) return;

  console.log(`startDrag: grabbed domino ${dominoId} at (${e.clientX},${e.clientY})`);

  e.preventDefault();

  // Determine clicked half
  const halfEl = e.target.closest(".half");
  let clickedHalf = 0;
  if (halfEl && halfEl.classList.contains("half1")) {
    clickedHalf = 1;
  }
  console.log(`startDrag: clickedHalf = ${clickedHalf}`);

  const rect = wrapper.getBoundingClientRect();

  const dragState = {
    domino,
    wrapper,
    clickedHalf,
    startX: e.clientX,
    startY: e.clientY,
    originLeft: rect.left,
    originTop: rect.top,
    moved: false
  };

  wrapper.classList.add("dragging");

  const moveHandler = (ev) => onDrag(ev, dragState);
  const upHandler = (ev) =>
    endDragHandler(ev, dragState, dominos, grid, regionMap, blocked, regions, boardEl, trayEl, moveHandler, upHandler);

  window.addEventListener("pointermove", moveHandler);
  window.addEventListener("pointerup", upHandler);
}


// ------------------------------------------------------------
// onDrag — visual dragging
// ------------------------------------------------------------
function onDrag(e, dragState) {
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    console.log(`onDrag: movement threshold passed dx=${dx} dy=${dy}`);
    dragState.moved = true;
  }

  dragState.wrapper.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
}


// ------------------------------------------------------------
// endDragHandler — FIXED VERSION
// ------------------------------------------------------------
function endDragHandler(
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

  const { domino, moved, wrapper, clickedHalf } = dragState;

  wrapper.style.transform = "";
  wrapper.classList.remove("dragging");

  if (!moved) {
    console.log(`endDrag: click-only, no movement for domino ${domino.id}`);
    return;
  }

  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  console.log(`endDrag: drop dx=${dx} dy=${dy}`);

  const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
  console.log("endDrag: dropTarget =", dropTarget);

  // ----------------------------------------------------------
  // FIX: Capture origin BEFORE any placement logic
  // ----------------------------------------------------------
  const cameFromBoard = (domino.row0 !== null);

  // ----------------------------------------------------------
  // Dropped on tray
  // ----------------------------------------------------------
  if (dropTarget && dropTarget.closest("#tray")) {
    console.log(`endDrag: dropping domino ${domino.id} onto tray`);

    endDrag.fire(domino, null, null, grid);

    removeDominoToTray(domino, grid);
    finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // ----------------------------------------------------------
  // Dropped on board cell
  // ----------------------------------------------------------
  const cell = dropTarget && dropTarget.closest(".board-cell");
  if (cell) {
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

    console.log(`endDrag: dropping on board cell (${row},${col})`);

    endDrag.fire(domino, row, col, grid);

    let ok = false;

    if (!cameFromBoard) {
      console.log(`endDrag: placing from tray → placeDomino(${domino.id})`);
      ok = placeDomino(domino, row, col, grid, clickedHalf);
      console.log(`placeDomino result: ${ok}`);
    } else {
      console.log(`endDrag: moving on board → moveDomino(${domino.id})`);
      ok = moveDomino(domino, row, col, grid);
      console.log(`moveDomino result: ${ok}`);
    }

    finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // ----------------------------------------------------------
  // Otherwise return to tray
  // ----------------------------------------------------------
  console.log(`endDrag: no valid drop target → returning ${domino.id} to tray`);

  endDrag.fire(domino, null, null, grid);

  removeDominoToTray(domino, grid);
  finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
}


// ------------------------------------------------------------
// finalize
// ------------------------------------------------------------
function finalize(dominos, grid, regionMap, blocked, regions, boardEl, trayEl) {
  console.log("finalize: re-rendering board + tray + syncCheck");
  console.log("trayEl before renderTray =", trayEl, trayEl.innerHTML);
  renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
  renderTray(dominos, trayEl);
  syncCheck(dominos, grid);
}
