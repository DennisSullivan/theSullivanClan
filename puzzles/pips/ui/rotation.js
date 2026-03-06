// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Contract‑clean rotation preview & commit instrumentation
// NOTES:
//   - Pure UI: never mutates engine state except trayOrientation.
//   - Geometry is taken from engine (grid/domino), never from DOM.
//   - Pivot‑half detection is authoritative.
//   - Wrapper is not used as a geometry authority.
// ============================================================

import { findDominoCells } from "../engine/grid.js";

// ------------------------------------------------------------
// Debug logger
// ------------------------------------------------------------
function logRotation(event, data = {}) {
  console.log(
    `%c[ROTATION] ${event}`,
    "color:#c71585;font-weight:bold;",
    data
  );
}

// ------------------------------------------------------------
// Rotation session state
// ------------------------------------------------------------
let rotatingDomino = null;        // { id, ... } from dominos map
let rotationGhost = null;         // { id,row0,col0,row1,col1 } or null
let rotationPointerId = null;     // pointerId during optional adjust

// ------------------------------------------------------------
// Double‑click detection (pointer‑based)
// ------------------------------------------------------------
let lastClickTime = 0;
const DoubleClickWindow = 300; // ms

export function initRotation(dominos, grid, trayEl, boardEl, renderPuzzle) {

  // ------------------------------------------------------------
  // 1. TRAY ROTATION (visual-only)
  // ------------------------------------------------------------
  trayEl.addEventListener("click", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;

    // Only rotate if in tray (engine geometry is null)
    if (domino.row0 !== null || domino.row1 !== null) return;

    domino.trayOrientation = ((domino.trayOrientation || 0) + 90) % 360;

    logRotation("TrayRotate", {
      id,
      newOrientation: domino.trayOrientation
    });

    renderPuzzle();
  });

  // ------------------------------------------------------------
  // 2. BOARD ROTATION — pointer‑based double‑click detector
  // ------------------------------------------------------------
  document.addEventListener("pointerup", (event) => {
    const now = performance.now();
    const delta = now - lastClickTime;
    lastClickTime = now;

    if (delta > DoubleClickWindow) return; // Not a double‑click

    handleBoardDoubleClick(event);
  });

  function handleBoardDoubleClick(event) {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!boardEl.contains(wrapper)) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;

    const halfEl = event.target.closest(".half");
    if (!halfEl) return;

    const clickedHalf = halfEl.classList.contains("half1") ? 1 : 0;

    // Geometry from engine, not DOM
    const cells = findDominoCells(grid, String(id));
    if (!cells || cells.length !== 2) return;

    const cell0 = cells.find(c => c.half === 0);
    const cell1 = cells.find(c => c.half === 1);
    if (!cell0 || !cell1) return;

    const prev = {
      r0: cell0.row,
      c0: cell0.col,
      r1: cell1.row,
      c1: cell1.col
    };

    logRotation("RotationStart", {
      id,
      clickedHalf,
      prev
    });

    const pivotHalf = clickedHalf;
    const preview = computePivotPreview(prev, pivotHalf);
    if (!preview) return;

    logRotation("PreviewComputed", {
      id,
      pivotHalf,
      preview
    });

    rotatingDomino = domino;
    rotationGhost = {
      id: domino.id,
      row0: preview.row0,
      col0: preview.col0,
      row1: preview.row1,
      col1: preview.col1
    };
    rotationPointerId = null;

    renderPuzzle();

    logRotation("PreviewRendered", {
      id: domino.id,
      ghost: rotationGhost
    });
  }

  // ------------------------------------------------------------
  // 3. Optional adjust + exit triggers
  // ------------------------------------------------------------
  document.addEventListener("pointerdown", (event) => {
    if (!rotatingDomino) return;

    const wrapper = event.target.closest(".domino-wrapper");
    const inside =
      wrapper && wrapper.dataset.dominoId === String(rotatingDomino.id);

    if (inside) {
      rotationPointerId = event.pointerId;

      logRotation("AdjustStart", {
        id: rotatingDomino.id,
        pointerId: event.pointerId,
        ghost: rotationGhost
      });

      return;
    }

    // Exit trigger B: pointerDown outside → commit/cancel
    logRotation("ExitTriggerOutside", {
      id: rotatingDomino.id,
      ghost: rotationGhost
    });

    if (rotationGhost) {
      dispatchRotationProposal(boardEl, rotationGhost);
    }

    clearRotationPreview(renderPuzzle);
  });

  document.addEventListener("pointerup", (event) => {
    if (!rotatingDomino) return;
    if (rotationPointerId === null) return;
    if (event.pointerId !== rotationPointerId) return;

    logRotation("AdjustEnd", {
      id: rotatingDomino.id,
      pointerId: event.pointerId,
      ghost: rotationGhost
    });

    // Exit trigger A: pointerUp on rotated domino → commit/cancel
    if (rotationGhost) {
      dispatchRotationProposal(boardEl, rotationGhost);
    }

    clearRotationPreview(renderPuzzle);
  });

  document.addEventListener("pointercancel", (event) => {
    if (!rotatingDomino) return;
    if (rotationPointerId !== null && event.pointerId !== rotationPointerId) return;

    logRotation("Cancel", {
      id: rotatingDomino?.id
    });

    clearRotationPreview(renderPuzzle);
  });
}

// ============================================================
// computePivotPreview()
// 90° clockwise rotation around pivotHalf
// ============================================================
function computePivotPreview(prev, pivotHalf) {
  const half0 = { r: prev.r0, c: prev.c0 };
  const half1 = { r: prev.r1, c: prev.c1 };

  const pivot = pivotHalf === 0 ? half0 : half1;
  const other = pivotHalf === 0 ? half1 : half0;

  const dr = other.r - pivot.r;
  const dc = other.c - pivot.c;

  // 90° clockwise rotation
  const rotatedOther = {
    r: pivot.r + dc,
    c: pivot.c - dr
  };

  // Re‑express in half0‑anchored form
  if (pivotHalf === 0) {
    return {
      row0: pivot.r,
      col0: pivot.c,
      row1: rotatedOther.r,
      col1: rotatedOther.c
    };
  } else {
    return {
      row0: rotatedOther.r,
      col0: rotatedOther.c,
      row1: pivot.r,
      col1: pivot.c
    };
  }
}

// ============================================================
// clearRotationPreview()
// ============================================================
function clearRotationPreview(renderPuzzle) {
  logRotation("SessionCleared");

  rotationGhost = null;
  rotatingDomino = null;
  rotationPointerId = null;
  renderPuzzle();
}

// ============================================================
// dispatchRotationProposal()
// Renderer‑neutral event to engine/validator
// ============================================================
function dispatchRotationProposal(boardEl, ghost) {
  logRotation("CommitDispatched", {
    proposal: ghost
  });

  boardEl.dispatchEvent(
    new CustomEvent("pips:rotate:proposal", {
      bubbles: true,
      detail: { proposal: ghost }
    })
  );
}

// ============================================================
// Public helpers
// ============================================================
export function getRotatingDominoId() {
  return rotatingDomino?.id ?? null;
}

export function getRotationGhost() {
  return rotationGhost;
}
