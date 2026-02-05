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

// ============================================================
// Double-click detection state (for tray rotation)
// ============================================================
let lastClickTime = 0;
let lastClickDominoId = null;
const DBLCLICK_THRESHOLD_MS = 250;

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
  console.log("startDrag initiated");
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
    moved: false,
    fromTray: trayEl.contains(wrapper),
    clone: null
  };

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

    // copy CSS variable angle if present and set initial transform
    const angleVar = comp.getPropertyValue('--angle')?.trim();
    if (angleVar) {
      clone.style.transform = `translate(-50%, -50%) rotate(${angleVar})`;
    } else {
      const compTransform = comp.transform;
      clone.style.transform = compTransform && compTransform !== 'none'
        ? compTransform
        : 'translate(-50%, -50%)';
    }

    // position the clone at the pointer start (centered)
    clone.style.left = `${e.clientX}px`;
    clone.style.top = `${e.clientY}px`;
    clone.style.pointerEvents = 'none';
    clone.style.position = 'fixed';
    clone.style.transformOrigin = 'center center';
    clone.style.zIndex = '9999';
    document.body.appendChild(clone);

    // hide the original wrapper so it doesn't interfere with hit testing
    wrapper.style.visibility = 'hidden';

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

  window.addEventListener("pointermove", moveHandler);
  window.addEventListener("pointerup", upHandler);
}

// ------------------------------------------------------------
// onDrag — visual dragging (composes rotation)
// ------------------------------------------------------------
function onDrag(e, dragState) {
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    console.log(`onDrag: movement threshold passed dx=${dx} dy=${dy}`);
    dragState.moved = true;
  }

  // If we created a clone, move it to follow the pointer
  if (dragState.clone) {
    // center the clone on the pointer (use left/top only)
    dragState.clone.style.left = `${e.clientX}px`;
    dragState.clone.style.top = `${e.clientY}px`;

    // preserve rotation and scale but DO NOT add translate(dx,dy)
    // (left/top already positions the clone at the pointer)
    dragState.clone.style.transform = `translate(-50%, -50%) rotate(var(--angle, 0deg)) scale(1.1)`;
    return;
  }

  // Fallback: if no clone, move the original wrapper (less ideal)
  dragState.wrapper.style.transform =
    `translate(-50%, -50%) rotate(var(--angle, 0deg)) translate(${dx}px, ${dy}px) scale(1.1)`;
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

  const { domino, moved, wrapper, clickedHalf, fromTray } = dragState;

  // Remove inline transform from the original (it was hidden during drag)
  wrapper.style.removeProperty("transform");

  // Compute drop target while the clone is still visible (clone has pointer-events:none)
  const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
  console.log("endDrag: dropTarget =", dropTarget);

  // Cleanup: remove clone and restore original wrapper visibility
  if (dragState.clone && dragState.clone.parentNode) {
    dragState.clone.parentNode.removeChild(dragState.clone);
  }
  wrapper.classList.remove("dragging");
  wrapper.style.visibility = '';

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

    if (isDblClick && fromTray) {
      console.log(`endDrag: detected tray double-click on domino ${domino.id} → rotate`);

      const oldAngle = domino.trayOrientation ?? 0;

      console.log(
        "%cTRAY ROTATE (MODEL, BEFORE)",
        "color: purple; font-weight: bold;",
        `id=${domino.id}`,
        `before=${oldAngle}`
      );
      domino.trayOrientation = (oldAngle + 90) % 360;

      console.log(
        "%cTRAY ROTATE (MODEL, AFTER)",
        "color: purple; font-weight: bold;",
        `id=${domino.id}`,
        `after=${domino.trayOrientation}`
      );

      // Apply new angle to CSS variable (centered rotation via CSS)
      wrapper.style.setProperty("--angle", `${domino.trayOrientation}deg`);

      // Re-render tray only (no reflow of siblings)
      renderTray(puzzleJson, dominos, trayEl);

      // Reset dblclick state
      lastClickTime = 0;
      lastClickDominoId = null;

      return;
    }

    // Not a double-click: record this as the latest click
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
