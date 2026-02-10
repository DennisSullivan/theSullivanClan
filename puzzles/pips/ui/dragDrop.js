// ============================================================
// FILE: dragDrop.js
// PURPOSE: Enables drag-and-drop interactions for dominos.
// NOTES:
//   - Visual dragging composes rotation via translate(-50%,-50%) rotate(var(--angle))
//   - Wrapper stays in tray slot (no collapse)
//   - Engine placement unchanged
//   - Rotation-mode callbacks supported via endDrag.fire()
//   - Robust hit testing using a non-interactive visual clone
// ============================================================

import { placeDomino, moveDomino, removeDominoToTray } from "../engine/placement.js";
import { syncCheck } from "../engine/syncCheck.js";
import { renderBoard } from "./boardRenderer.js";
import { renderTray } from "./trayRenderer.js";
let pendingTrayRerender = null;

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

// ------------------------------------------------------------
// endDragHandler
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

  cleanupDragState(dragState);

  const { domino, moved, wrapper, clickedHalf, fromTray } = dragState;

  const hits = document.elementsFromPoint(e.clientX, e.clientY);

  let dropTarget = null;
  let cell = null;

  for (const el of hits) {
    if (!el) continue;
    const maybeCell = el.closest?.(".board-cell");
    if (maybeCell) {
      dropTarget = maybeCell;
      cell = maybeCell;
      break;
    }
    if (el.closest?.(".tray")) {
      dropTarget = el;
      break;
    }
  }

  wrapper.classList.remove("dragging");

  // CLICK ONLY
  if (!moved) {
    const now = performance.now ? performance.now() : Date.now();
    const isSameDomino = lastClickDominoId === domino.id;
    const isDblClick = isSameDomino && (now - lastClickTime <= DBLCLICK_THRESHOLD_MS);

    if (fromTray) {
      const oldAngle = domino.trayOrientation;
      domino.trayOrientation = oldAngle + 90;

      wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`);

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
      } catch {}

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

  // DRAG PATHS
  const cameFromBoard = domino.row0 !== null;

  if (dropTarget && trayEl.contains(dropTarget)) {
    endDrag.fire(domino, null, null, grid);
    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  if (cell) {
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);

    endDrag.fire(domino, row, col, grid);

    let ok = false;
    if (!cameFromBoard) {
      ok = placeDomino(domino, row, col, grid, clickedHalf);
    } else {
      ok = moveDomino(domino, row, col, grid);
    }

    // If placement failed, return the domino to the tray (spec: "if it does not fit then the domino should go back")
    if (!ok) {
      removeDominoToTray(domino, grid);
    }

    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  endDrag.fire(domino, null, null, grid);
  removeDominoToTray(domino, grid);
  finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
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
  renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
  renderTray(puzzleJson, dominos, trayEl);
  syncCheck(dominos, grid);
}
