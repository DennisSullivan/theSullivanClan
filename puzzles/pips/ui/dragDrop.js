// FILE: ui/dragDrop.js
// PURPOSE: Enables drag-and-drop interactions for dominos.
// NOTES (conversational): This module wires pointer events to the placement engine.
// It creates a non-interactive visual clone for dragging, records where the user
// grabbed the domino (clicked-half center), and uses that same grab point on drop
// to deterministically map the drop to a board cell. Functions are documented
// above each definition in plain conversational style.

import { placeDomino, moveDomino, removeDominoToTray } from "../engine/placement.js";
import { syncCheck } from "../engine/syncCheck.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";

let pendingTrayRerender = null;

// -----------------------------
// Debug helpers (temporary)
// -----------------------------
/**
 * dbg(...args)
 * Purpose: Lightweight debug logger used throughout this file.
 * Use: Keeps console output compact and tagged so you can grep DBG lines.
 */
function dbg(...args) {
  try { console.log("%cDBG", "background:#222;color:#ffd700;padding:2px 4px;", ...args); } catch(e){}
}

/**
 * dbgDominoState(domino)
 * Purpose: Return a small, stable snapshot of a domino for debug logs.
 * Use: Called when we want to print domino geometry without dumping the whole object.
 */
function dbgDominoState(domino) {
  return {
    id: domino?.id,
    row0: domino?.row0,
    col0: domino?.col0,
    row1: domino?.row1,
    col1: domino?.col1,
    trayOrientation: domino?.trayOrientation,
    value0: domino?.value0,
    value1: domino?.value1
  };
}

/**
 * window.__debugDump(dominos, grid)
 * Purpose: Quick inspector you can call from the console to see state.
 * Use: Pass the dominos collection and grid to print a compact snapshot.
 */
window.__debugDump = function(dominos, grid) {
  try {
    const list = (dominos instanceof Map)
      ? Array.from(dominos.values()).map(d => dbgDominoState(d))
      : dominos.map(d => dbgDominoState(d));
    console.log("%c__debugDump", "background:#003366;color:#fff;padding:2px 4px;", { dominos: list, grid });
  } catch (err) {
    console.error("__debugDump error", err);
  }
};

// ============================================================
// Rotation-mode callback registry
// ============================================================
/**
 * endDrag
 * Purpose: Registry for callbacks that want to observe the end of a drag.
 * Use: registerCallback(fn) to be notified with (domino, row, col, grid).
 */
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

// ============================================================
// Double-click detection state (for tray rotation)
// ============================================================
let lastClickTime = 0;
let lastClickDominoId = null;
const DBLCLICK_THRESHOLD_MS = 250;

// ------------------------------------------------------------
// Helper: cleanup drag state (remove clone, restore wrapper)
// ------------------------------------------------------------
/**
 * cleanupDragState(dragState)
 * Purpose: Remove the visual clone and restore wrapper visibility.
 * Use: Called at the end of a drag or when cancelling.
 */
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

// ------------------------------------------------------------
// enableDrag
// ------------------------------------------------------------
/**
 * enableDrag(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
 * Purpose: Attach pointerdown handlers to board and tray to start drags.
 * Use: Call once during initialization with DOM elements and model references.
 */
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

// ------------------------------------------------------------
// startDrag
// ------------------------------------------------------------
/**
 * startDrag(e, puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
 * Purpose: Begin a drag when the user presses on a domino.
 * Use: Creates a dragState object, records where the user grabbed the domino
 *      (pointer -> clicked-half offset), and installs global pointer listeners.
 */
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

  const dominoId = target.dataset.id;
  const domino = (dominos instanceof Map)
    ? dominos.get(dominoId)
    : dominos.find(d => String(d.id) === String(dominoId));
  if (!domino) return;

  // Ensure wrapper carries the domino id
  wrapper.dataset.dominoId = domino.id;

  // Sync wrapper rotation before any drag logic (tray orientation)
  if (trayEl.contains(wrapper)) {
    wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`);
  }

  e.preventDefault();

  const halfEl = e.target.closest(".half");
  let clickedHalf = halfEl && halfEl.classList.contains("half1") ? 1 : 0;

  const rect = wrapper.getBoundingClientRect();

  const dragState = {
    domino,
    wrapper,
    clickedHalf,
    startX: e.clientX,
    startY: e.clientY,
    originLeft: rect.left,
    originTop: rect.top,
    moved: false,
    fromTray: trayEl.contains(wrapper),
    clone: null,
    offsetX: 0,
    offsetY: 0,
    pointerToHalf: null, // will be set below
    _handlers: null
  };

  // If dragging from tray, ensure wrapper reflects tray orientation
  if (dragState.fromTray) {
    wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`);
  }

  // Record the pointer -> clicked-half offset at drag start.
  // Purpose: use the same grab point on drop so hit testing matches user intent.
  try {
    const halfSelector = `.half${clickedHalf}`;
    // Prefer wrapper's half element (it exists now)
    const halfElement = wrapper.querySelector(halfSelector) || target.closest(halfSelector);
    if (halfElement) {
      const hr = halfElement.getBoundingClientRect();
      dragState.pointerToHalf = {
        dx: e.clientX - (hr.left + hr.width / 2),
        dy: e.clientY - (hr.top  + hr.height / 2)
      };
    } else {
      dragState.pointerToHalf = { dx: 0, dy: 0 };
    }
  } catch (err) {
    dragState.pointerToHalf = { dx: 0, dy: 0 };
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

// ------------------------------------------------------------
// onDrag
// ------------------------------------------------------------
/**
 * onDrag(e, dragState)
 * Purpose: Track pointer movement during a drag, create the visual clone when movement threshold is exceeded,
 * and update the clone position while dragging.
 * Use: Internal; installed by startDrag.
 */
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
    return;
  }

  // No clone yet — do nothing. Wrapper must remain untouched.
}

/**
 * endDragHandler(e, dragState, puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl, moveHandler, upHandler)
 *
 * Purpose: Finalize a drag operation for a domino.
 * Use: This function stops listeners, removes the clone, maps the clicked-half grab point
 *      into a board cell deterministically (using the pointer->half offset captured at start),
 *      and then calls the placement/move/remove logic. It logs compact diagnostics when mapping fails.
 *
 * Drop-in: This function replaces the previous endDragHandler implementation.
 */
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
    fromTray: dragState.fromTray,
    clickedHalf: dragState.clickedHalf
  });

  window.removeEventListener("pointermove", moveHandler);
  window.removeEventListener("pointerup", upHandler);

  cleanupDragState(dragState);

  const { domino, moved, wrapper, clickedHalf, fromTray } = dragState;

  try {
    dbg("post-cleanup wrapper", {
      wrapperExists: !!wrapper,
      wrapperVisibility: wrapper ? wrapper.style.visibility : undefined,
      cloneExists: !!dragState.clone
    });
  } catch (err) {
    dbg("post-cleanup inspect failed", err);
  }

  // CLICK handling (no move)
  if (!moved) {
    const now = performance.now ? performance.now() : Date.now();
    const isSameDomino = lastClickDominoId === domino.id;
    const isDblClick = isSameDomino && (now - lastClickTime <= DBLCLICK_THRESHOLD_MS);

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

      lastClickTime = 0;
      lastClickDominoId = null;
      return;
    }

    if (isDblClick && !fromTray) {
      lastClickTime = 0;
      lastClickDominoId = null;
      return;
    }

    lastClickTime = now;
    lastClickDominoId = domino.id;
    return;
  }

  // DRAG handling
  const cameFromBoard = domino.row0 !== null;

  // HIT TEST: use the original pointer->half offset captured at drag start
  let hitX = e.clientX, hitY = e.clientY;
  try {
    if (dragState && dragState.pointerToHalf) {
      // pointerToHalf.dx = pointerAtStart - halfCenterAtStart
      // So halfCenterNow = pointerNow - dx
      hitX = e.clientX - (dragState.pointerToHalf.dx || 0);
      hitY = e.clientY - (dragState.pointerToHalf.dy || 0);
    } else {
      // Fallback: compute half center from clone or wrapper
      const halfSelector = `.half${dragState.clickedHalf ?? 0}`;
      let halfEl = null;
      if (dragState && dragState.clone) halfEl = dragState.clone.querySelector(halfSelector);
      if (!halfEl && wrapper) halfEl = wrapper.querySelector(halfSelector);
      if (halfEl) {
        const hr = halfEl.getBoundingClientRect();
        hitX = hr.left + hr.width / 2;
        hitY = hr.top  + hr.height / 2;
      } else {
        hitX = e.clientX; hitY = e.clientY;
      }
    }
  } catch (err) {
    dbg("hit-test exception computing half center (endDrag)", { err: String(err) });
    hitX = e.clientX; hitY = e.clientY;
  }

  // Map clicked-half center into board coordinates deterministically
  const boardRect = boardEl.getBoundingClientRect();

  if (hitX < boardRect.left || hitX > boardRect.right || hitY < boardRect.top || hitY > boardRect.bottom) {
    dbg("clicked-half center outside board rect", {
      hitPoint: { x: Math.round(hitX), y: Math.round(hitY) },
      boardRect: {
        left: Math.round(boardRect.left),
        top: Math.round(boardRect.top),
        right: Math.round(boardRect.right),
        bottom: Math.round(boardRect.bottom)
      }
    });
    endDrag.fire(domino, null, null, grid);
    dbg("drop outside board — returning to tray", { id: domino.id });
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
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

  const relX = hitX - boardRect.left;
  const relY = hitY - boardRect.top;
  const col = Math.floor(relX / stepX);
  const row = Math.floor(relY / stepY);

  if (row < 0 || row >= rows || col < 0 || col >= cols) {
    dbg("clicked-half mapped outside grid indices", { row, col, rows, cols, hitPoint: { x: Math.round(hitX), y: Math.round(hitY) } });
    endDrag.fire(domino, null, null, grid);
    dbg("drop outside board — returning to tray", { id: domino.id });
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  const cell = boardEl.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
  if (!cell) {
    dbg("mapped cell element not found", { row, col, hitPoint: { x: Math.round(hitX), y: Math.round(hitY) } });
    endDrag.fire(domino, null, null, grid);
    dbg("drop outside board — returning to tray", { id: domino.id });
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Optional: detect tray under the clicked-half center (rare)
  let dropTarget = null;
  try {
    const hits = document.elementsFromPoint(Math.round(hitX), Math.round(hitY));
    for (const el of hits) {
      if (!el) continue;
      if (el.closest?.(".tray")) { dropTarget = el; break; }
    }
  } catch (err) {
    dropTarget = null;
  }

  if (dropTarget && trayEl.contains(dropTarget)) {
    endDrag.fire(domino, null, null, grid);
    dbg("drop onto tray target — returning to tray", { id: domino.id });
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Proceed with placement using mapped row/col
  const mappedRow = row;
  const mappedCol = col;

  endDrag.fire(domino, mappedRow, mappedCol, grid);
  dbg("attempting placement (mapped)", { domino: dbgDominoState(domino), row: mappedRow, col: mappedCol, clickedHalf, cameFromBoard });

  let ok = false;
  try {
    if (!cameFromBoard) {
      ok = placeDomino(domino, mappedRow, mappedCol, grid, clickedHalf);
    } else {
      ok = moveDomino(domino, mappedRow, mappedCol, grid);
    }
  } catch (err) {
    dbg("placement threw exception", { err });
    try { removeDominoToTray(domino, grid); } catch (e) { dbg("removeDominoToTray failed after exception", e); }
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    throw err;
  }

  dbg("placement result", { id: domino.id, ok, dominoAfter: dbgDominoState(domino) });

  if (!ok) {
    dbg("placement failed — returning to tray", { id: domino.id });
    try { removeDominoToTray(domino, grid); } catch (err) { dbg("removeDominoToTray error", err); }
  }

  try {
    dbg("before finalize dominos snapshot", {
      dominosCount: dominos instanceof Map ? dominos.size : dominos.length,
      containsDomino: dominos instanceof Map ? dominos.has(String(domino.id)) : dominos.some(d => String(d.id) === String(domino.id))
    });
  } catch (err) {
    dbg("before finalize snapshot failed", err);
  }

  finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);

  try {
    dbg("after finalize dominos snapshot", {
      dominosCount: dominos instanceof Map ? dominos.size : dominos.length,
      containsDomino: dominos instanceof Map ? dominos.has(String(domino.id)) : dominos.some(d => String(d.id) === String(domino.id)),
      dominoState: dbgDominoState(domino)
    });
  } catch (err) {
    dbg("after finalize snapshot failed", err);
  }

  return;
}

// ------------------------------------------------------------
// beginRealDrag
// ------------------------------------------------------------
/**
 * beginRealDrag(dragState, e)
 * Purpose: Create a non-interactive visual clone of the wrapper and position it under the pointer.
 * Use: Called once when the pointer has moved enough to be considered a drag.
 */
function beginRealDrag(dragState, e) {
  const wrapper = dragState.wrapper;
  const rect = wrapper.getBoundingClientRect();

  try {
    const clone = wrapper.cloneNode(true);
    clone.classList.add("domino-clone");

    // Use the wrapper’s actual rendered size (post-rotation)
    clone.style.width = `${wrapper.offsetWidth}px`;
    clone.style.height = `${wrapper.offsetHeight}px`;
    
    const comp = window.getComputedStyle(wrapper);

    clone.style.background = comp.backgroundColor;
    clone.style.border = comp.border;
    clone.style.borderRadius = comp.borderRadius;
    clone.style.boxShadow = comp.boxShadow;
    clone.style.padding = comp.padding;
    clone.style.color = comp.color;
    clone.style.boxSizing = comp.boxSizing;
    clone.style.transformOrigin = comp.transformOrigin;

    const angleVarRaw = comp.getPropertyValue("--angle")?.trim();
    const angleVar = angleVarRaw || "0deg";
    clone.style.setProperty("--angle", angleVar);

    const wrapperCenterX = rect.left + rect.width / 2;
    const wrapperCenterY = rect.top + rect.height / 2;

    // offsetX/Y are used to keep the clone centered under the pointer in the same way
    // the wrapper was when the drag started.
    dragState.offsetX = e.clientX - wrapperCenterX;
    dragState.offsetY = e.clientY - wrapperCenterY;

    const inner = wrapper.querySelector(".domino");
    const cloneInner = clone.querySelector(".domino");
    if (inner && cloneInner) {
      const compInner = window.getComputedStyle(inner);
      const innerTransform = compInner.transform !== "none" ? compInner.transform : "";
      cloneInner.style.transform = innerTransform;
    }

    const computed = window.getComputedStyle(wrapper);
    const computedTransform = computed.transform;
    
    if (computedTransform && computedTransform !== "none") {
        clone.style.transform = computedTransform;
    } else {
        clone.style.transform =
            `translate(-50%, -50%) rotate(${angleVar})`;
    }

    clone.style.left = `${wrapperCenterX}px`;
    clone.style.top = `${wrapperCenterY}px`;
    clone.style.position = "fixed";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "9999";

    document.body.appendChild(clone);

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

// ------------------------------------------------------------
// finalize
// ------------------------------------------------------------
/**
 * finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)
 * Purpose: Re-render board and tray and run sync checks after any state mutation.
 * Use: Called after placement, removal, or rotation operations complete.
 */
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

  // Inline assert-sync for developer convenience
  (function assertSync(dominos, grid) {
    try {
      if (!grid || !Array.isArray(grid) || !Array.isArray(grid[0])) return;
      const list = dominos instanceof Map ? Array.from(dominos.values()) : Array.isArray(dominos) ? dominos : [];
      const rows = grid.length;
      const cols = grid[0].length;

      for (const d of list) {
        if (!d || d.row0 == null || d.col0 == null || d.row1 == null || d.col1 == null) continue;

        const inBounds0 = d.row0 >= 0 && d.row0 < rows && d.col0 >= 0 && d.col0 < cols;
        const inBounds1 = d.row1 >= 0 && d.row1 < rows && d.col1 >= 0 && d.col1 < cols;

        if (!inBounds0 || !inBounds1) {
          console.warn("ASSERT-SYNC-OUT-OF-BOUNDS", d.id, { domino: d, rows, cols });
          continue;
        }

        const idStr = String(d.id);
        const g0 = grid[d.row0][d.col0];
        const g1 = grid[d.row1][d.col1];

        const ok0 = g0 && String(g0.dominoId) === idStr && g0.half === 0;
        const ok1 = g1 && String(g1.dominoId) === idStr && g1.half === 1;

        if (!ok0 || !ok1) {
          console.warn("ASSERT-SYNC-FAIL", d.id, { domino: d, gridCell0: g0, gridCell1: g1 });
        }
      }
    } catch (err) {
      console.error("ASSERT-SYNC-ERROR", err);
    }
  })(dominos, grid);
}
