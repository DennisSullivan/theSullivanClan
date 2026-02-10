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
  } catch (e) { /* ignore */ }

  try {
    const w = dragState.wrapper;
    if (w) {
      w.classList.remove("dragging");
      w.style.visibility = '';
      w.style.opacity = '';
      w.style.pointerEvents = '';
      try { w.style.removeProperty('transform'); } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
}

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

  // Ensure wrapper carries the domino id for robust lookup elsewhere
  try { wrapper.dataset.dominoId = domino.id; } catch (err) { /* ignore */ }

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
    moved: false,
    fromTray: trayEl.contains(wrapper),
    clone: null,
    offsetX: 0,
    offsetY: 0,
    _handlers: null
  };

  // Add dragging class but avoid changing layout-affecting transforms on the original.
  wrapper.classList.add("dragging");

  // --- create a visual clone that will follow the pointer but won't capture pointer events
  try {
    const clone = wrapper.cloneNode(true);
    clone.classList.add("domino-clone");

    // size the clone to match the wrapper's on-screen size
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;

    // copy computed styles once and use them for visual fidelity
    const comp = window.getComputedStyle(wrapper);

    // copy key computed visuals so the clone looks identical when moved to document.body
    clone.style.background = comp.backgroundColor;
    clone.style.border = comp.border;
    clone.style.borderRadius = comp.borderRadius;
    clone.style.boxShadow = comp.boxShadow;
    clone.style.padding = comp.padding;
    clone.style.color = comp.color;
    clone.style.boxSizing = comp.boxSizing;
    clone.style.transformOrigin = comp.transformOrigin;

    // compute wrapper center and pointer offset so the clone doesn't snap to cursor
    const wrapperCenterX = rect.left + rect.width / 2;
    const wrapperCenterY = rect.top + rect.height / 2;

    // offset from pointer to wrapper center (pointer - center)
    const offsetX = e.clientX - wrapperCenterX;
    const offsetY = e.clientY - wrapperCenterY;

    // store offsets so onDrag can keep the same relative positioning
    dragState.offsetX = offsetX;
    dragState.offsetY = offsetY;

    // --- match inner domino transform (nudge) so clone pixels align with original
    const inner = wrapper.querySelector('.domino');
    const cloneInner = clone.querySelector('.domino');
    if (inner && cloneInner) {
      const compInner = window.getComputedStyle(inner);
      const innerTransform = compInner.transform && compInner.transform !== 'none' ? compInner.transform : '';
      if (innerTransform) {
        try { cloneInner.style.transform = innerTransform; } catch (err) { /* ignore */ }
      } else {
        try { cloneInner.style.transform = ''; } catch (err) { /* ignore */ }
      }
    }

    // --- IMPORTANT: match the clone's transform expression to the wrapper's computed transform when possible
    const compTransform = comp.transform;
    const angleVarRaw = comp.getPropertyValue('--angle')?.trim();
    const angleVar = angleVarRaw && angleVarRaw.length ? angleVarRaw : '0deg';

    if (compTransform && compTransform !== 'none') {
      // Use the computed transform string so clone matches wrapper exactly
      clone.style.transform = compTransform;
    } else {
      // Fallback: center + rotate using the same angle variable the renderer uses
      clone.style.transform = `translate(-50%, -50%) rotate(${angleVar})`;
    }

    // position the clone so its center matches the original wrapper center (no jump)
    clone.style.left = `${wrapperCenterX}px`;
    clone.style.top = `${wrapperCenterY}px`;

    clone.style.pointerEvents = 'none';
    clone.style.position = 'fixed';
    clone.style.transformOrigin = 'center center';
    clone.style.zIndex = '9999';
    document.body.appendChild(clone);

    // hide the original wrapper visually but keep layout stable.
    try {
      wrapper.style.visibility = 'hidden';
      wrapper.style.pointerEvents = 'none';
    } catch (err) {
      // fallback to opacity if visibility fails
      wrapper.style.opacity = '0';
      wrapper.style.pointerEvents = 'none';
    }

    // store clone in drag state
    dragState.clone = clone;
  } catch (err) {
    console.warn("startDrag: clone creation failed, falling back to inline transform", err);
    dragState.clone = null;
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

  // cancellation and blur handlers to ensure cleanup
  const cancelHandler = (ev) => {
    try { cleanupDragState(dragState); } catch (e) { /* ignore */ }
    window.removeEventListener("pointermove", moveHandler);
    window.removeEventListener("pointerup", upHandler);
    window.removeEventListener("pointercancel", cancelHandler);
    window.removeEventListener("blur", blurHandler);
  };

  const blurHandler = () => {
    try { cleanupDragState(dragState); } catch (e) { /* ignore */ }
    window.removeEventListener("pointermove", moveHandler);
    window.removeEventListener("pointerup", upHandler);
    window.removeEventListener("pointercancel", cancelHandler);
    window.removeEventListener("blur", blurHandler);
  };

  // store handlers so endDragHandler can remove them if needed
  dragState._handlers = { moveHandler, upHandler, cancelHandler, blurHandler };

  window.addEventListener("pointermove", moveHandler);
  window.addEventListener("pointerup", upHandler);
  window.addEventListener("pointercancel", cancelHandler);
  window.addEventListener("blur", blurHandler);
}

// ------------------------------------------------------------
// onDrag — visual dragging (composes rotation)
// ------------------------------------------------------------
function onDrag(e, dragState) {
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  // Use a larger threshold to avoid accidental drags while clicking
  if (!dragState.moved && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
    console.log(`onDrag: movement threshold passed dx=${dx} dy=${dy}`);
    dragState.moved = true;
  }

  // If we created a clone, move it to follow the pointer while preserving initial offset
  if (dragState.clone) {
    // position clone center = pointer - initial offset
    dragState.clone.style.left = `${e.clientX - dragState.offsetX}px`;
    dragState.clone.style.top = `${e.clientY - dragState.offsetY}px`;

    // Only add scale when the drag has actually started (moved === true)
    const scalePart = dragState.moved ? ' scale(1.1)' : '';
    // Use rotate(var(--angle)) so the clone follows the model angle while dragging.
    dragState.clone.style.transform = `translate(-50%, -50%) rotate(var(--angle, 0deg))${scalePart}`;
    return;
  }

  // Fallback: if no clone, move the original wrapper (less ideal)
  const scalePart = dragState.moved ? ' scale(1.1)' : '';
  dragState.wrapper.style.transform =
    `translate(-50%, -50%) rotate(var(--angle, 0deg)) translate(${dx}px, ${dy}px)${scalePart}`;
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
  // Remove pointer listeners (defensive)
  try {
    window.removeEventListener("pointermove", moveHandler);
    window.removeEventListener("pointerup", upHandler);
  } catch (e) { /* ignore */ }

  // Ensure clone removed for all end paths
  try { cleanupDragState(dragState); } catch (e) { /* ignore */ }

  const { domino, moved, wrapper, clickedHalf, fromTray } = dragState;

  // Compute hit list at release point (more robust than single elementFromPoint)
  const hits = document.elementsFromPoint(e.clientX, e.clientY);
  console.log("endDrag: elementsFromPoint hits:", hits);

  // Prefer the nearest board cell in the hit stack
  let dropTarget = null;
  let cell = null;

  for (const el of hits) {
    if (!el) continue;
    // If this element or an ancestor is a board cell, choose it immediately
    const maybeCell = el.closest ? el.closest(".board-cell") : null;
    if (maybeCell) {
      dropTarget = maybeCell;
      cell = maybeCell;
      break;
    }
    // If not a board cell, check if it's inside the tray (tray half or slot)
    if (el.closest && el.closest(".tray")) {
      dropTarget = el;
      break;
    }
  }

  console.log("endDrag: resolved dropTarget =", dropTarget, "resolved cell =", cell);

  // Ensure dragging class removed on wrapper (defensive)
  try { wrapper.classList.remove("dragging"); } catch (e) { /* ignore */ }

  // --------------------------------------------------------
  // Click-only: handle single-click vs double-click
  // --------------------------------------------------------
  if (!moved) {
    console.log(`endDrag: click-only, no movement for domino ${domino.id}`);

    const now = (typeof performance !== "undefined" && performance.now)
      ? performance.now()
      : Date.now();

    const isSameDomino = (lastClickDominoId === domino.id);
    const isDblClick = isSameDomino && (now - lastClickTime <= DBLCLICK_THRESHOLD_MS);

    // TRAY single-click: commit rotation on pointerup (no preview on pointerdown)
    if (fromTray) {
      const oldAngle = typeof domino.trayOrientation === "number" ? domino.trayOrientation : 0;
      const newAngle = (oldAngle + 90) % 360;

      // Commit model
      domino.trayOrientation = newAngle;

      console.log(
        "%cTRAY ROTATE (MODEL COMMIT)",
        "color: purple; font-weight: bold;",
        `id=${domino.id}`,
        `before=${oldAngle}`,
        `after=${domino.trayOrientation}`
      );

      // Ensure the wrapper (if still present) has the CSS var for immediate render
      try { wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`); } catch (e) { /* ignore */ }

      // Remove clone immediately and restore original wrapper so we animate the real element
      try { cleanupDragState(dragState); } catch (e) { /* ignore */ }

      // Apply inline transform to the wrapper so the browser can animate it now
      try {
        wrapper.style.transform = `translate(-50%, -50%) rotate(${domino.trayOrientation}deg)`;
        // Force layout so the transform is applied
        void wrapper.getBoundingClientRect();
      } catch (e) { /* ignore */ }

      // Compute transition duration from computed style (fallback to 160ms)
      let waitMs = 160;
      try {
        const cs = window.getComputedStyle(wrapper);
        const dur = cs.transitionDuration || '';
        const delay = cs.transitionDelay || '';
        const toMs = (s) => s.endsWith('ms') ? parseFloat(s) : s.endsWith('s') ? parseFloat(s) * 1000 : 0;
        const durations = dur.split(',').map(s => s.trim());
        const delays = delay.split(',').map(s => s.trim());
        let max = 0;
        for (let i = 0; i < durations.length; i++) {
          const d = toMs(durations[i] || '0s');
          const dl = toMs(delays[i] || '0s');
          max = Math.max(max, d + dl);
        }
        if (max > 0) waitMs = Math.ceil(max) + 20;
      } catch (e) { /* ignore */ }

      // After the transition, re-render tray from model and clear inline transform
      setTimeout(() => {
        try { renderTray(puzzleJson, dominos, trayEl); } catch (err) { console.warn("renderTray failed after tray rotation:", err); }
        try { wrapper.style.removeProperty('transform'); } catch (e) { /* ignore */ }
      }, waitMs);

      // Remove pointer handlers for this drag (defensive)
      try {
        if (dragState._handlers) {
          window.removeEventListener("pointermove", dragState._handlers.moveHandler);
          window.removeEventListener("pointerup", dragState._handlers.upHandler);
          window.removeEventListener("pointercancel", dragState._handlers.cancelHandler);
          window.removeEventListener("blur", dragState._handlers.blurHandler);
        }
      } catch (e) { /* ignore */ }

      // Reset double-click tracking
      lastClickTime = 0;
      lastClickDominoId = null;
      return;
    }

    // BOARD double-click detection (preserve existing board double-click behavior)
    if (isDblClick && !fromTray) {
      console.log(`endDrag: detected board double-click on domino ${domino.id}`);
      lastClickTime = 0;
      lastClickDominoId = null;
      return;
    }

    // Not a double-click: record this click for potential double-click detection
    lastClickTime = now;
    lastClickDominoId = domino.id;

    return;
  }

  const cameFromBoard = (domino.row0 !== null);

  // Dropped on tray
  if (dropTarget && trayEl.contains(dropTarget)) {
    console.log(`endDrag: dropping domino ${domino.id} onto tray`);

    endDrag.fire(domino, null, null, grid);

    removeDominoToTray(domino, grid);
    finalize(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
    return;
  }

  // Dropped on board cell (we resolved 'cell' above)
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
