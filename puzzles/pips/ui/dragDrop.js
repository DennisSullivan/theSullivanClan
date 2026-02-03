// ============================================================
// FILE: dragDrop.js
// PURPOSE: Enables drag-and-drop interactions for dominos.
// NOTES:
//   - Visual dragging composes rotation via rotate(var(--angle))
//   - Wrapper stays in tray slot (no collapse)
//   - Engine placement unchanged
//   - Rotation-mode callbacks supported via endDrag.fire()
//   - Correct half-detection using DOM
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
      try { fn(domino, row, col, grid); } catch (err) { console.error("endDrag callback error", err); }
    }
  }
};

// ------------------------------------------------------------
// enableDrag — NOW ACCEPTS puzzleJson
// ------------------------------------------------------------
export function enableDrag(
  puzzleJson,
  dominos,
  grid,
  regionMap,
  blocked,
  regions,
  boardEl,
  trayEl
) {
  if (!boardEl) {
    console.error("enableDrag: boardEl is null or undefined. Ensure renderBoard ran before enableDrag.");
    return;
  }
  if (!trayEl) {
    console.error("enableDrag: trayEl is null or undefined. Ensure renderTray ran before enableDrag.");
    return;
  }
  if (!puzzleJson || !Array.isArray(puzzleJson.dominos)) {
    console.error("enableDrag: invalid puzzleJson passed", puzzleJson);
    return;
  }

  console.log("enableDrag: wiring pointerdown on board + tray");
  console.log("enableDrag: puzzleJson id =", puzzleJson.id ?? "<no id>", "dominos.length =", puzzleJson.dominos.length);

  boardEl.addEventListener("pointerdown", (e) =>
    startDrag(e, puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  );

  trayEl.addEventListener("pointerdown", (e) =>
    startDrag(e, puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  );
}

// ------------------------------------------------------------
// startDrag
// ------------------------------------------------------------
function startDrag(
  e,
  puzzleJson,
  dominos,
  grid,
  regionMap,
  blocked,
  regions,
  boardEl,
  trayEl
) {
  const target = e.target.closest(".domino");
  if (!target) return;

  const wrapper = target.closest(".domino-wrapper");
  if (!wrapper) return;

  const dominoId = target.dataset.id;
  const domino = (dominos instanceof Map) ? dominos.get(dominoId) : dominos.find(d => String(d.id) === String(dominoId));
  if (!domino) return;

  console.log(`startDrag: grabbed domino ${dominoId} at (${e.clientX},${e.clientY})`);

  e.preventDefault();

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
    endDragHandler(
      ev,
      dragState,
      puzzleJson,
      dominos,
      grid,
      regionMap,
      blocked,
      regions,
      boardEl,
      trayEl,
      moveHandler,
      upHandler
    );

  window.addEventListener("pointermove", moveHandler);
  window.addEventListener("pointerup", upHandler);
}

// ------------------------------------------------------------
// onDrag — visual dragging (composes rotation)
// - Inline transform composes rotate(var(--angle)) so rotation is preserved.
// - Do not reintroduce the static nudge here; CSS handles nudge removal while dragging.
// ------------------------------------------------------------
function onDrag(e, dragState) {
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    console.log(`onDrag: movement threshold passed dx=${dx} dy=${dy}`);
    dragState.moved = true;
  }

  // Compose inline transform so rotation (var(--angle)) is preserved.
  // Use rotate(var(--angle, 0deg)) so the wrapper's CSS variable is respected.
  dragState.wrapper.style.transform = `rotate(var(--angle, 0deg)) translate(${dx}px, ${dy}px) scale(1.1)`;
}

// ------------------------------------------------------------
// endDragHandler — robust hit detection and finalize
// ------------------------------------------------------------
function endDragHandler(
  e,
  dragState,
  puzzleJson,
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

  // Let CSS own the composed transform again
  wrapper.style.removeProperty('transform');
  wrapper.classList.remove("dragging");

  if (!moved) {
    console.log(`endDrag: click-only, no movement for domino ${domino.id}`);
    return;
  }

  const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
  console.log("endDrag: dropTarget =", dropTarget);

  const cameFromBoard = (domino.row0 !== null);

  // Dropped on tray
  if (dropTarget && trayEl.contains(dropTarget)) {
    console.log(`endDrag: dropping domino ${domino.id} onto tray`);

    endDrag.fire(domino, null, null, grid);

    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Dropped on board cell
  let cell = null;
  if (dropTarget && boardEl.contains(dropTarget)) {
    cell = dropTarget.closest(".board-cell");
  }

  if (cell) {
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

    console.log(`endDrag: dropping on board cell (${row},${col})`);

    endDrag.fire(domino, row, col, grid);

    let ok = false;

    if (!cameFromBoard) {
      ok = placeDomino(domino, row, col, grid, clickedHalf);
    } else {
      ok = moveDomino(domino, row, col, grid);
    }

    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Otherwise return to tray
  console.log(`endDrag: no valid drop target → returning ${domino.id} to tray`);

  endDrag.fire(domino, null, null, grid);

  removeDominoToTray(domino, grid);
  finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
}

// ------------------------------------------------------------
// finalize — re-render board + tray + syncCheck
// ------------------------------------------------------------
function finalize(
  puzzleJson,
  dominos,
  grid,
  regionMap,
  blocked,
  regions,
  boardEl,
  trayEl
) {
  console.log("finalize: re-rendering board + tray + syncCheck");

  renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
  renderTray(puzzleJson, dominos, trayEl);
  syncCheck(dominos, grid);
}
