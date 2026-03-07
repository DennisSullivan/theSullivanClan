// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Contract‑clean rotation preview & commit instrumentation
// NOTES:
//   - Pure UI: never mutates engine state except trayOrientation.
//   - Geometry is taken from engine (grid/domino), never from DOM.
//   - Pivot‑half detection is authoritative.
//   - Wrapper is not used as a geometry authority.
//   - Rotation session:
//       * Starts on dblclick on a specific domino half.
//       * Continues only for dblclicks on the same half of the same domino.
//       * Pivot half stays fixed for the entire session.
//       * A single click (pointerDown+pointerUp) on that same half ends session,
//         unless a dblclick arrives within DoubleClickWindow.
//       * pointerDown anywhere else ends session immediately.
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
let rotatingDomino = null;
let rotationGhost = null;
let rotationPointerId = null;
let rotationSessionHalf = null;

// Single‑click exit deferral (to give dblclick priority)
const DoubleClickWindow = 300; // ms
let pendingExitTimeoutId = null;

// ------------------------------------------------------------
// TRAY + BOARD ROTATION INITIALIZER
// ------------------------------------------------------------
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
  // 2. BOARD ROTATION — dblclick‑based session start/advance
  // ------------------------------------------------------------
  document.addEventListener("dblclick", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!boardEl.contains(wrapper)) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;

    // Identify clicked half
    const halfEl = event.target.closest(".half");
    let clickedHalf;
    if (halfEl) {
      clickedHalf = halfEl.classList.contains("half1") ? 1 : 0;
    } else {
      // Contract‑safe default: pivot on half0 if not on a half
      clickedHalf = 0;
    }

    // If a rotation session is active, it continues only for the same domino + same half
    if (rotatingDomino && rotationSessionHalf !== null) {
      const sameDomino = String(rotatingDomino.id) === String(id);
      const sameHalf = sameDomino && clickedHalf === rotationSessionHalf;

      if (!sameHalf) {
        // Different half or different domino: treat as outside click
        // → end current session immediately, then start a new one for this dblclick.
        logRotation("ExitTriggerOutside", {
          id: rotatingDomino.id,
          ghost: rotationGhost
        });
        if (rotationGhost) {
          dispatchRotationProposal(boardEl, rotationGhost);
        }
        clearRotationPreview(renderPuzzle);
        // fall through to start a new session below
      } else {
        // Same half, same domino: cancel any pending single‑click exit
        if (pendingExitTimeoutId !== null) {
          clearTimeout(pendingExitTimeoutId);
          pendingExitTimeoutId = null;
        }
      }
    }

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

    const pivotHalf = rotatingDomino && rotationSessionHalf !== null
      ? rotationSessionHalf
      : clickedHalf;

    const preview = computePivotPreview(prev, pivotHalf);
    if (!preview) return;

    logRotation("PreviewComputed", {
      id,
      pivotHalf,
      preview
    });

    rotatingDomino = domino;
    rotationSessionHalf = pivotHalf;
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
  });

  // ------------------------------------------------------------
  // 3. Optional adjust + exit triggers
  // ------------------------------------------------------------
  document.addEventListener("pointerdown", (event) => {
    if (!rotatingDomino) return;

    const wrapper = event.target.closest(".domino-wrapper");
    const halfEl = event.target.closest(".half");

    const sameDomino =
      wrapper && wrapper.dataset.dominoId === String(rotatingDomino.id);

    const sameHalf =
      sameDomino &&
      halfEl &&
      ((halfEl.classList.contains("half1") ? 1 : 0) === rotationSessionHalf);

    if (sameHalf) {
      // Optional adjust start
      rotationPointerId = event.pointerId;

      logRotation("AdjustStart", {
        id: rotatingDomino.id,
        pointerId: event.pointerId,
        ghost: rotationGhost
      });

      return;
    }

    // Any pointerDown not on the same half is Exit Trigger B
    logRotation("ExitTriggerOutside", {
      id: rotatingDomino.id,
      ghost: rotationGhost
    });

    // Cancel any pending single‑click exit
    if (pendingExitTimeoutId !== null) {
      clearTimeout(pendingExitTimeoutId);
      pendingExitTimeoutId = null;
    }

    if (rotationGhost) {
      dispatchRotationProposal(boardEl, rotationGhost);
    }

    clearRotationPreview(renderPuzzle);
  });

  document.addEventListener("pointerup", (event) => {
    if (!rotatingDomino) return;

    // If this pointerup corresponds to an adjust drag, end adjust and schedule exit
    if (rotationPointerId !== null && event.pointerId === rotationPointerId) {
      logRotation("AdjustEnd", {
        id: rotatingDomino.id,
        pointerId: event.pointerId,
        ghost: rotationGhost
      });

      rotationPointerId = null;

      // Exit Trigger A: pointerUp on same half (end session),
      // but give dblclick priority by deferring commit/revert.
      if (pendingExitTimeoutId !== null) {
        clearTimeout(pendingExitTimeoutId);
        pendingExitTimeoutId = null;
      }

      if (rotationGhost) {
        pendingExitTimeoutId = setTimeout(() => {
          logRotation("ExitTriggerSameHalf", {
            id: rotatingDomino.id,
            ghost: rotationGhost
          });

          dispatchRotationProposal(boardEl, rotationGhost);
          clearRotationPreview(renderPuzzle);
        }, DoubleClickWindow);
      }

      return;
    }

    // If pointerup is not part of adjust, we still treat a single click on the same half
    // as a potential Exit Trigger A, but again defer to allow dblclick.
    const wrapper = event.target.closest(".domino-wrapper");
    const halfEl = event.target.closest(".half");

    const sameDomino =
      wrapper && rotatingDomino && wrapper.dataset.dominoId === String(rotatingDomino.id);

    const sameHalf =
      sameDomino &&
      halfEl &&
      ((halfEl.classList.contains("half1") ? 1 : 0) === rotationSessionHalf);

    if (sameHalf) {
      if (pendingExitTimeoutId !== null) {
        clearTimeout(pendingExitTimeoutId);
        pendingExitTimeoutId = null;
      }

      if (rotationGhost) {
        pendingExitTimeoutId = setTimeout(() => {
          logRotation("ExitTriggerSameHalf", {
            id: rotatingDomino.id,
            ghost: rotationGhost
          });

          dispatchRotationProposal(boardEl, rotationGhost);
          clearRotationPreview(renderPuzzle);
        }, DoubleClickWindow);
      }
    }
  });

  document.addEventListener("pointercancel", (event) => {
    if (!rotatingDomino) return;
    if (rotationPointerId !== null && event.pointerId !== rotationPointerId) return;

    logRotation("Cancel", {
      id: rotatingDomino?.id
    });

    if (pendingExitTimeoutId !== null) {
      clearTimeout(pendingExitTimeoutId);
      pendingExitTimeoutId = null;
    }

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
  rotationSessionHalf = null;

  if (pendingExitTimeoutId !== null) {
    clearTimeout(pendingExitTimeoutId);
    pendingExitTimeoutId = null;
  }

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
