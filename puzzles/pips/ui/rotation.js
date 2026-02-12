// FILE: ui/rotation.js
// PURPOSE: Rotation session state machine for dominos.
// NOTES:
//  - Double-click enters rotation session (geometry-only).
//  - Subsequent double-clicks rotate geometry-only.
//  - Session ends on pointerdown outside a domino, pointerdown that begins a drag,
//    or when endDrag.fire is invoked (drag release).
//  - On session end we emit a single 'pips:board-rotate-request' event with
//    the domino id and the pre-session snapshot. The placement validator
//    is responsible for commitRotation, region/blocked validation, history.

import {
  rotateDominoOnBoard,
} from "../engine/placement.js";

/* Rotation session state */
let rotatingDomino = null;      // domino object currently in session
let rotatingPrev = null;        // snapshot { r0,c0,r1,c1 }
let rotatingPivot = 0;          // pivot half used for last rotate
let rotatingRender = null;      // renderPuzzle reference (for convenience)
let rotatingBoardEl = null;     // board element (for pointer hit tests)

/**
 * initRotation(dominos, trayEl, boardEl, renderPuzzle, endDrag)
 * - dominos: Map or collection of domino objects
 * - trayEl, boardEl: DOM elements
 * - renderPuzzle: function that re-renders board + tray
 * - endDrag: rotation-mode uses endDrag.fire to commit on drop
 */
export function initRotation(dominos, trayEl, boardEl, renderPuzzle, endDrag) {
  if (!boardEl || !renderPuzzle || !endDrag) {
    console.warn("initRotation: missing required args");
    return;
  }

  rotatingRender = renderPuzzle;
  rotatingBoardEl = boardEl;

  // ----------------------------------------------------------
  // TRAY double-click rotates tray domino visually (no session)
  // Keep tray behavior simple: rotate model.trayOrientation and re-render.
  // ----------------------------------------------------------
  trayEl.addEventListener("dblclick", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId ?? wrapper.dataset.id;
    if (!id) return;

    const domino = (dominos instanceof Map) ? dominos.get(id) : (Array.isArray(dominos) ? dominos.find(d => String(d.id) === String(id)) : undefined);
    if (!domino) return;
    if (domino.row0 !== null) return; // only tray dominos

    // rotate visual orientation in model (controller/validator may record history)
    domino.trayOrientation = (typeof domino.trayOrientation === "number" ? domino.trayOrientation : 0) + 90;
    domino.trayOrientation = domino.trayOrientation % 360;

    // re-render
    renderPuzzle();
  });

  // ----------------------------------------------------------
  // BOARD double-click enters or continues rotation session
  // ----------------------------------------------------------
  boardEl.addEventListener("dblclick", (event) => {
    // Find the wrapper (we rely on wrapper.dataset.dominoId to be present)
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId ?? wrapper.dataset.id;
    if (!id) return;

    const domino = (dominos instanceof Map) ? dominos.get(id) : (Array.isArray(dominos) ? dominos.find(d => String(d.id) === String(id)) : undefined);
    if (!domino) return;
    if (domino.row0 === null) return; // only board dominos

    // Determine pivot half robustly from clicked element
    const halfEl = event.target.closest(".half");
    let pivotHalf = 0;
    if (halfEl) {
      pivotHalf = halfEl.classList.contains("half1") ? 1 : 0;
    } else {
      // fallback: if wrapper has two halves, assume left is 0
      const halves = wrapper.querySelectorAll(".half");
      if (halves && halves.length >= 2) {
        pivotHalf = Array.from(halves).indexOf(event.target.closest(".half")) === 1 ? 1 : 0;
      }
    }

    // Enter session if not already rotating this domino
    if (rotatingDomino !== domino) {
      // start session: snapshot previous geometry
      rotatingDomino = domino;
      rotatingPrev = {
        r0: domino.row0,
        c0: domino.col0,
        r1: domino.row1,
        c1: domino.col1
      };
      rotatingPivot = pivotHalf;
    } else {
      // continue session; update pivot to the most recent
      rotatingPivot = pivotHalf;
    }

    // Apply geometry-only rotation (rotateDominoOnBoard mutates geometry only)
    rotateDominoOnBoard(domino, pivotHalf);

    // Re-render to show preview geometry
    renderPuzzle();
  });

  // ----------------------------------------------------------
  // Pointerdown outside a domino cancels rotation session (session end)
  // Also pointerdown that begins a drag should end the session.
  // We listen on document for pointerdown and decide whether to end session.
  // ----------------------------------------------------------
  document.addEventListener("pointerdown", (event) => {
    if (!rotatingDomino) return;

    // If pointerdown is inside the same domino wrapper, do nothing (user may be interacting)
    const insideSame = !!event.target.closest?.(".domino-wrapper") && event.target.closest(".domino-wrapper").dataset.dominoId === String(rotatingDomino.id);
    if (insideSame) {
      // If pointerdown is on a different control inside the same domino, we still keep session.
      return;
    }

    // Otherwise end the rotation session and request validation/commit
    endRotationSession();
  });

  // ----------------------------------------------------------
  // endDrag callback: when a drag ends, if it concerns the rotating domino,
  // we should end the rotation session (this covers "release after a drag").
  // endDrag.fire(domino, row, col, grid) will call our registered callback.
  // ----------------------------------------------------------
  endDrag.registerCallback((domino, row, col, grid) => {
    if (!rotatingDomino) return;
    if (rotatingDomino !== domino) return;

    // End session and request validation/commit
    endRotationSession();
  });
}

/**
 * endRotationSession()
 * Ends the current rotation session (if any) and emits a single
 * 'pips:board-rotate-request' CustomEvent on document with detail:
 *   { id, prev: { r0,c0,r1,c1 } }
 *
 * The placement validator listens for this event, calls commitRotation,
 * validates regions/blocked, records history, and emits commit/reject events.
 */
function endRotationSession() {
  if (!rotatingDomino) return;

  const d = rotatingDomino;
  const prev = rotatingPrev ? { ...rotatingPrev } : { r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 };

  // Emit request for validator to commit/validate
  const ev = new CustomEvent("pips:board-rotate-request", {
    detail: {
      id: d.id,
      pivotHalf: rotatingPivot,
      prev
    },
    bubbles: true,
    cancelable: false
  });
  // Dispatch on document so attachPlacementValidator's appRoot listener will catch it
  document.dispatchEvent(ev);

  // Clear session state
  rotatingDomino = null;
  rotatingPrev = null;
  rotatingPivot = 0;

  // Re-render to reflect final model state (validator may change model asynchronously)
  if (typeof rotatingRender === "function") {
    // Defer a tick to allow validator to mutate model and then render
    setTimeout(() => {
      try { rotatingRender(); } catch (e) { /* swallow render errors */ }
    }, 0);
  }
}
