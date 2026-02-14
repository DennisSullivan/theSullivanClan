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
  dbg("endDragHandler ENTER", { clientX: e.clientX, clientY: e.clientY });
  dbg("dragState summary", {
    domino: dbgDominoState(dragState.domino),
    moved: dragState.moved,
    fromTray: dragState.fromTray
  });

  window.removeEventListener("pointermove", moveHandler);
  window.removeEventListener("pointerup", upHandler);

  cleanupDragState(dragState);

  const { domino, moved, wrapper, fromTray } = dragState;

  dbg("post-cleanup wrapper", {
    wrapperExists: !!wrapper,
    wrapperVisibility: wrapper ? wrapper.style.visibility : undefined,
    cloneExists: !!dragState.clone
  });

  // CLICK (no move)
  if (!moved) {
    // Tray click = rotate tray orientation
    if (fromTray) {
      const oldAngle = domino.trayOrientation;
      domino.trayOrientation = (oldAngle || 0) + 90;
      if (wrapper) wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`);

      let waitMs = 160;
      try {
        const cs = window.getComputedStyle(wrapper);
        const dur = cs.transitionDuration || "";
        const delay = cs.transitionDelay || "";
        const toMs = (s) =>
          s.endsWith("ms") ? parseFloat(s) :
          s.endsWith("s") ? parseFloat(s) * 1000 : 0;
        const durations = dur.split(",").map(s => s.trim());
        const delays = delay.split(",").map(s => s.trim());
        let max = 0;
        for (let i = 0; i < durations.length; i++) {
          const d = toMs(durations[i] || "0s");
          const dl = toMs(delays[i] || "0s");
          max = Math.max(max, d + dl);
        }
        if (max > 0) waitMs = Math.ceil(max) + 20;
      } catch (e) {}

      pendingTrayRerender = setTimeout(() => {
        renderTray(puzzleJson, dominos, trayEl);
        pendingTrayRerender = null;
      }, waitMs);

      return;
    }

    // Board click = rotation session handled elsewhere
    return;
  }

  // DRAG handling
  const clone = dragState.clone;
  if (!clone) {
    dbg("No clone at drag end — returning to tray");
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Compute half centers from clone
  const half0 = clone.querySelector(".half0");
  const half1 = clone.querySelector(".half1");

  if (!half0 || !half1) {
    dbg("Clone missing halves — returning to tray");
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // ⭐ Force layout so halves have real size
  clone.offsetWidth;
  
  const h0r = half0.getBoundingClientRect();
  const h1r = half1.getBoundingClientRect();

  const half0Center = { x: h0r.left + h0r.width / 2, y: h0r.top + h0r.height / 2 };
  const half1Center = { x: h1r.left + h1r.width / 2, y: h1r.top + h1r.height / 2 };

  dbg("clone half centers", { half0Center, half1Center });

  // Map centers to board cells
  const mapped0 = mapPixelToCell(half0Center.x, half0Center.y, boardEl, grid);
  const mapped1 = mapPixelToCell(half1Center.x, half1Center.y, boardEl, grid);

  dbg("mapped cells", { mapped0, mapped1 });

  if (!mapped0 || !mapped1) {
    dbg("One or both halves outside board — returning to tray");
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Validate adjacency
  const dr = Math.abs(mapped0.r - mapped1.r);
  const dc = Math.abs(mapped0.c - mapped1.c);
  const adjacent = (dr + dc === 1);

  if (!adjacent) {
    dbg("Halves not adjacent — returning to tray");
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Validate occupancy
  const cell0 = grid[mapped0.r][mapped0.c];
  const cell1 = grid[mapped1.r][mapped1.c];
  const idStr = String(domino.id);

  const ok0 = !cell0 || String(cell0.dominoId) === idStr;
  const ok1 = !cell1 || String(cell1.dominoId) === idStr;

  if (!ok0 || !ok1) {
    dbg("Occupied target — returning to tray");
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Commit placement
  const ok = placeDominoAnchor(domino, mapped0.r, mapped0.c, mapped1.r, mapped1.c, grid);

  dbg("placement result", { id: domino.id, ok, dominoAfter: dbgDominoState(domino) });

  if (!ok) {
    dbg("placement failed — returning to tray");
    removeDominoToTray(domino, grid);
  }

  finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
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
function beginRealDrag(dragState, e) {
  const wrapper = dragState.wrapper;
  const rect = wrapper.getBoundingClientRect();

  try {
    const clone = wrapper.cloneNode(true);

    // ⭐ CRITICAL: copy ALL classes from wrapper so CSS layout applies
    clone.className = wrapper.className;

    // Add clone marker (does not affect layout)
    clone.classList.add("domino-clone");

    // Explicit size (clone is no longer in the grid)
    clone.style.width = `${wrapper.offsetWidth}px`;
    clone.style.height = `${wrapper.offsetHeight}px`;

    const comp = window.getComputedStyle(wrapper);

    // Preserve visual styling
    clone.style.background = comp.backgroundColor;
    clone.style.border = comp.border;
    clone.style.borderRadius = comp.borderRadius;
    clone.style.boxShadow = comp.boxShadow;
    clone.style.padding = comp.padding;
    clone.style.color = comp.color;
    clone.style.boxSizing = comp.boxSizing;
    clone.style.transformOrigin = comp.transformOrigin;

    // Preserve angle variable
    const angleVarRaw = comp.getPropertyValue("--angle")?.trim();
    const angleVar = angleVarRaw || "0deg";
    clone.style.setProperty("--angle", angleVar);

    // Compute wrapper center
    const wrapperCenterX = rect.left + rect.width / 2;
    const wrapperCenterY = rect.top + rect.height / 2;

    dragState.offsetX = e.clientX - wrapperCenterX;
    dragState.offsetY = e.clientY - wrapperCenterY;

    // Preserve inner .domino transform
    const inner = wrapper.querySelector(".domino");
    const cloneInner = clone.querySelector(".domino");
    if (inner && cloneInner) {
      const compInner = window.getComputedStyle(inner);
      const innerTransform = compInner.transform !== "none" ? compInner.transform : "";
      cloneInner.style.transform = innerTransform;
    }

    // Position clone in viewport
    clone.style.left = `${wrapperCenterX}px`;
    clone.style.top = `${wrapperCenterY}px`;
    clone.style.position = "fixed";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "9999";

    document.body.appendChild(clone);

    // Hide original wrapper while dragging
    wrapper.classList.add("dragging");
    wrapper.style.visibility = "hidden";
    wrapper.style.pointerEvents = "none";

    dragState.clone = clone;

    dbg("beginRealDrag clone appended", {
      id: dragState.domino.id,
      wrapperRect: rect,
      cloneRect: clone.getBoundingClientRect(),
      angleVar
    });
  } catch (err) {
    console.warn("beginRealDrag: clone creation failed", err);
    dragState.clone = null;
  }
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
