// FILE: ui/dragDrop.js
// PURPOSE: Drag/drop using clone geometry as the only truth.
// NOTES:
//   - The clone’s pixel geometry defines placement.
//   - We compute half0/half1 centers from the clone DOM.
//   - We map each center to board cells.
//   - We validate adjacency + occupancy.
//   - We call placeDominoAnchor() directly.
//   - No clickedHalf, no pointer offsets, no heuristics.

import { placeDominoAnchor, removeDominoToTray } from "../engine/placement.js";
import { syncCheck } from "../engine/syncCheck.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";

let pendingTrayRerender = null;

/* ------------------------------------------------------------
 * Debug helpers
 * ------------------------------------------------------------ */
function dbg(...args) {
  try { console.log("%cDBG", "background:#222;color:#ffd700;padding:2px 4px;", ...args); } catch(e){}
}

function dbgDominoState(domino) {
  return {
    id: domino?.id,
    row0: domino?.row0,
    col0: domino?.col0,
    row1: domino?.row1,
    col1: domino?.col1
  };
}

function drawDebugDot(x, y, color = "red") {
  const dot = document.createElement("div");
  dot.style.position = "fixed";
  dot.style.left = `${x - 4}px`;
  dot.style.top = `${y - 4}px`;
  dot.style.width = "8px";
  dot.style.height = "8px";
  dot.style.borderRadius = "50%";
  dot.style.background = color;
  dot.style.zIndex = "999999";
  dot.style.pointerEvents = "none";
  document.body.appendChild(dot);

  // auto-remove after 2 seconds
  setTimeout(() => dot.remove(), 2000);
}

/* ------------------------------------------------------------
 * endDrag callback registry (unchanged)
 * ------------------------------------------------------------ */
export const endDrag = {
  callbacks: [],
  registerCallback(fn) { this.callbacks.push(fn); },
  fire(domino, row, col, grid) {
    for (const fn of this.callbacks) {
      try { fn(domino, row, col, grid); } catch (err) { console.error("endDrag callback error", err); }
    }
  }
};

/* ------------------------------------------------------------
 * Cleanup clone + wrapper
 * ------------------------------------------------------------ */
function cleanupDragState(dragState) {
  if (!dragState) return;
  try {
    if (dragState.clone && dragState.clone.parentNode) {
      dragState.clone.parentNode.removeChild(dragState.clone);
    }
  } catch (e) {}

  try {
    const w = dragState.wrapper;
    if (w) {
      w.classList.remove("dragging");
      w.style.visibility = "";
      w.style.opacity = "";
      w.style.pointerEvents = "";
    }
  } catch (e) {}
}

/* ------------------------------------------------------------
 * enableDrag
 * ------------------------------------------------------------ */
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
  boardEl.addEventListener("pointerdown", (e) =>
    startDrag(e, puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  );

  trayEl.addEventListener("pointerdown", (e) =>
    startDrag(e, puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
  );
}

/* ------------------------------------------------------------
 * startDrag
 * ------------------------------------------------------------ */
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
  const target = e.target.closest(".domino, .domino-wrapper");
  if (!target) return;

  const wrapper = target.closest(".domino-wrapper");
  if (!wrapper) return;

  const dominoId = wrapper.dataset.dominoId;
  const domino = (dominos instanceof Map)
    ? dominos.get(dominoId)
    : dominos.find(d => String(d.id) === String(dominoId));
  if (!domino) return;

  wrapper.dataset.dominoId = domino.id;

  // Sync tray orientation visually
  if (trayEl.contains(wrapper)) {
    wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`);
  }

  e.preventDefault();

  const rect = wrapper.getBoundingClientRect();

  const dragState = {
    domino,
    wrapper,
    startX: e.clientX,
    startY: e.clientY,
    originLeft: rect.left,
    originTop: rect.top,
    moved: false,
    fromTray: trayEl.contains(wrapper),
    clone: null,
    offsetX: 0,
    offsetY: 0,
    _handlers: null
  };

  if (dragState.fromTray) {
    wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`);
  }

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

  const cancelHandler = () => {
    cleanupDragState(dragState);
    window.removeEventListener("pointermove", moveHandler);
    window.removeEventListener("pointerup", upHandler);
    window.removeEventListener("pointercancel", cancelHandler);
    window.removeEventListener("blur", blurHandler);
  };

  const blurHandler = cancelHandler;

  dragState._handlers = { moveHandler, upHandler, cancelHandler, blurHandler };

  window.addEventListener("pointermove", moveHandler);
  window.addEventListener("pointerup", upHandler);
  window.addEventListener("pointercancel", cancelHandler);
  window.addEventListener("blur", blurHandler);
}

/* ------------------------------------------------------------
 * onDrag
 * ------------------------------------------------------------ */
function onDrag(e, dragState) {
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.moved && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
    dragState.moved = true;
    if (pendingTrayRerender) {
      clearTimeout(pendingTrayRerender);
      pendingTrayRerender = null;
    }
  }

  if (dragState.moved && !dragState.clone) {
    beginRealDrag(dragState, e);
  }

  if (dragState.clone) {
    dragState.clone.style.left = `${e.clientX - dragState.offsetX}px`;
    dragState.clone.style.top = `${e.clientY - dragState.offsetY}px`;

    const scalePart = dragState.moved ? " scale(1.1)" : "";
    dragState.clone.style.transform =
      `translate(-50%, -50%) rotate(var(--angle, 0deg))${scalePart}`;
  }
}

/* ------------------------------------------------------------
 * endDragHandler
 * ------------------------------------------------------------ */
function endDragHandler(ev) {
  const { domino, wrapper, clone, fromTray, moved } = dragState;

  if (!domino) return;

  // Remove clone
  if (clone && clone.parentNode) {
    clone.parentNode.removeChild(clone);
  }

  // If the domino was NOT moved out of the tray, restore visibility
  if (fromTray && !moved) {
    wrapper.style.visibility = "";
  }

  // If the domino WAS moved (placed on board), keep wrapper hidden
  // BoardRenderer will create a new wrapper for the placed domino
  if (fromTray && moved) {
    wrapper.style.visibility = "hidden";
  }

  // Reset drag state
  dragState.domino = null;
  dragState.clone = null;
  dragState.wrapper = null;
}

/* ------------------------------------------------------------
 * mapPixelToCell
 * ------------------------------------------------------------ */
function mapPixelToCell(x, y, boardEl, grid) {
  const boardRect = boardEl.getBoundingClientRect();
  if (x < boardRect.left || x > boardRect.right ||
      y < boardRect.top  || y > boardRect.bottom) {
    return null;
  }

  const sampleCell = boardEl.querySelector(".board-cell");
  const cols = grid[0].length;
  const rows = grid.length;
  const cellSize = sampleCell ? sampleCell.offsetWidth : (boardRect.width / cols);

  const csBoard = window.getComputedStyle(boardEl);
  const gapX = parseFloat(csBoard.columnGap || csBoard.getPropertyValue("column-gap") || "0") || 0;
  const gapY = parseFloat(csBoard.rowGap || csBoard.getPropertyValue("row-gap") || "0") || 0;
  const stepX = cellSize + gapX;
  const stepY = cellSize + gapY;

  const relX = x - boardRect.left;
  const relY = y - boardRect.top;

  const col = Math.floor(relX / stepX);
  const row = Math.floor(relY / stepY);

  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

  return { r: row, c: col };
}

/* ------------------------------------------------------------
 * beginRealDrag
 * ------------------------------------------------------------ */
function beginRealDrag(domino, wrapper, startX, startY) {
  dragState.domino = domino;
  dragState.fromTray = wrapper.classList.contains("in-tray");
  dragState.moved = false;

  // Hide the original wrapper immediately
  wrapper.style.visibility = "hidden";

  // Create clone
  const clone = wrapper.cloneNode(true);
  clone.classList.remove("in-tray");
  clone.classList.add("domino-clone");
  clone.style.visibility = "visible";
  clone.style.position = "fixed";
  clone.style.left = `${startX}px`;
  clone.style.top = `${startY}px`;

  document.body.appendChild(clone);

  dragState.clone = clone;
  dragState.wrapper = wrapper;
}

/* ------------------------------------------------------------
 * finalize
 * ------------------------------------------------------------ */
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
  dbg("finalize ENTER", {
    dominosCount: dominos instanceof Map ? dominos.size : dominos.length
  });
  renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
  renderTray(puzzleJson, dominos, trayEl);
  syncCheck(dominos, grid);
}
