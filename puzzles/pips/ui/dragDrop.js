// ============================================================
// FILE: dragDrop.js
// PURPOSE: Enables drag-and-drop interactions for dominos.
// NOTES:
//   - Visual dragging composes rotation via translate(-50%,-50%) rotate(var(--angle))
//   - Wrapper stays in tray slot (no collapse)
//   - Engine placement unchanged
//   - Rotation-mode callbacks supported via endDrag.fire()
//   - Robust hit testing using a non-interactive visual clone
//   - Temporary debug instrumentation included (DBG logs)
// ============================================================

import { placeDomino, moveDomino, removeDominoToTray } from "../engine/placement.js";
import { syncCheck } from "../engine/syncCheck.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";
let pendingTrayRerender = null;

// -----------------------------
// Debug helpers (temporary)
// -----------------------------
function dbg(...args) {
  try { console.log("%cDBG", "background:#222;color:#ffd700;padding:2px 4px;", ...args); } catch(e){}
}

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

// Expose a quick inspector to the console
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
  const domino = (dominos instanceof Map)
    ? dominos.get(dominoId)
    : dominos.find(d => String(d.id) === String(dominoId));
  if (!domino) return;

  // Ensure wrapper carries the domino id
  wrapper.dataset.dominoId = domino.id;

  // ⭐ NEW: Sync wrapper rotation before any drag logic
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

// ------------------------------------------------------------
// onDrag
// ------------------------------------------------------------
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
 * FILE: ui/dragDrop.js
 * PURPOSE: Finalize a drag operation for a domino.
 *
 * Conversational notes:
 * This function stops global listeners, removes the visual clone, and decides
 * where the user dropped the piece. It uses the *clicked half's center* (prefers
 * the clone half when dragging) and deterministically maps that point into the
 * board grid (row/col). It then either places the domino on the board, returns
 * it to the tray, or handles click/rotation semantics. The implementation is
 * defensive and logs compact diagnostics when the clicked-half center cannot be
 * mapped to a board cell.
 *
 * Drop-in: Replace the existing endDragHandler function body in ui/dragDrop.js
 * with this function (keep the same signature).
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

  // Remove global listeners immediately
  window.removeEventListener("pointermove", moveHandler);
  window.removeEventListener("pointerup", upHandler);

  // Clean up visuals (clone removal, restore wrapper)
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

  // -------------------- CLICK (no move) --------------------
  if (!moved) {
    const now = performance.now ? performance.now() : Date.now();
    const isSameDomino = lastClickDominoId === domino.id;
    const isDblClick = isSameDomino && (now - lastClickTime <= DBLCLICK_THRESHOLD_MS);

    if (fromTray) {
      // Rotate in tray on click
      const oldAngle = domino.trayOrientation;
      domino.trayOrientation = (oldAngle || 0) + 90;
      if (wrapper) wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`);

      // Re-render tray after transition completes (best-effort)
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

  // -------------------- DRAG handling --------------------
  const cameFromBoard = domino.row0 !== null;

  // -------------------- HIT TEST: clicked-half center -> deterministic mapping --------------------
  // Compute clicked-half center (prefer clone's half, else wrapper's half).
  let hitX = e.clientX, hitY = e.clientY;
  try {
    const halfSelector = `.half${dragState.clickedHalf ?? 0}`;
    let halfEl = null;
    if (dragState && dragState.clone) halfEl = dragState.clone.querySelector(halfSelector);
    if (!halfEl && wrapper) halfEl = wrapper.querySelector(halfSelector);

    if (!halfEl) {
      // Diagnostic: missing half element (shouldn't happen normally)
      dbg("hit-test error: clicked half element not found", { clickedHalf: dragState.clickedHalf, hasClone: !!dragState.clone, wrapperExists: !!wrapper });
      // Use pointer coords for diagnostic logs below; treat as miss if outside board.
      hitX = e.clientX; hitY = e.clientY;
    } else {
      const hr = halfEl.getBoundingClientRect();
      hitX = hr.left + hr.width / 2;
      hitY = hr.top + hr.height / 2;
    }
  } catch (err) {
    dbg("hit-test exception computing half center", { err: String(err) });
    hitX = e.clientX; hitY = e.clientY;
  }

  // Map the clicked-half center into board grid coordinates deterministically.
  const boardRect = boardEl.getBoundingClientRect();

  // If clicked-half center is outside the board bounding box, treat as outside.
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

  // Determine cell size and gap from the rendered grid
  const sampleCell = boardEl.querySelector(".board-cell");
  const cols = grid[0].length;
  const rows = grid.length;
  const cellSize = sampleCell ? sampleCell.offsetWidth : (boardRect.width / cols);

  // Read CSS gaps (column-gap / row-gap) if present; fall back to zero.
  const csBoard = window.getComputedStyle(boardEl);
  const gapX = parseFloat(csBoard.columnGap || csBoard.getPropertyValue("column-gap") || "0") || 0;
  const gapY = parseFloat(csBoard.rowGap || csBoard.getPropertyValue("row-gap") || "0") || 0;
  const stepX = cellSize + gapX;
  const stepY = cellSize + gapY;

  // Compute row/col by integer division of the relative coordinates
  const relX = hitX - boardRect.left;
  const relY = hitY - boardRect.top;
  const col = Math.floor(relX / stepX);
  const row = Math.floor(relY / stepY);

  // Out of bounds -> treat as outside
  if (row < 0 || row >= rows || col < 0 || col >= cols) {
    dbg("clicked-half mapped outside grid indices", { row, col, rows, cols, hitPoint: { x: Math.round(hitX), y: Math.round(hitY) } });
    endDrag.fire(domino, null, null, grid);
    dbg("drop outside board — returning to tray", { id: domino.id });
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Locate the DOM cell element for debug/visual use
  const cell = boardEl.querySelector(`.board-cell[data-row="${row}"][data-col="${col}"]`);
  if (!cell) {
    dbg("mapped cell element not found", { row, col, hitPoint: { x: Math.round(hitX), y: Math.round(hitY) } });
    endDrag.fire(domino, null, null, grid);
    dbg("drop outside board — returning to tray", { id: domino.id });
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Optional: detect if the clicked-half center is over the tray (rare) by checking elementsFromPoint.
  let dropTarget = null;
  try {
    const hits = document.elementsFromPoint(Math.round(hitX), Math.round(hitY));
    for (const el of hits) {
      if (!el) continue;
      if (el.closest?.(".tray")) { dropTarget = el; break; }
    }
  } catch (err) {
    // elementsFromPoint can throw in some environments; ignore and proceed with mapped cell.
    dropTarget = null;
  }

  // -------------------- Handle tray drop --------------------
  if (dropTarget && trayEl.contains(dropTarget)) {
    endDrag.fire(domino, null, null, grid);
    dbg("drop onto tray target — returning to tray", { id: domino.id });
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // -------------------- Handle board cell drop --------------------
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

    dragState.offsetX = e.clientX - wrapperCenterX;
    dragState.offsetY = e.clientY - wrapperCenterY;

    const inner = wrapper.querySelector(".domino");
    const cloneInner = clone.querySelector(".domino");
    if (inner && cloneInner) {
      const compInner = window.getComputedStyle(inner);
      const innerTransform = compInner.transform !== "none" ? compInner.transform : "";
      cloneInner.style.transform = innerTransform;
    }

    // Always use the wrapper’s computed transform, even if it reports "none"
    const computed = window.getComputedStyle(wrapper);
    const computedTransform = computed.transform;
    
    // If computedTransform is "none", build the correct transform manually
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
  // after syncCheck(dominos, grid);
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

      // Expect objects of the form { dominoId, half }
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
