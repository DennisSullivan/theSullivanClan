// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Rotation session state machine for dominos.
// NOTES:
//  - Double-click enters rotation session (geometry-only).
//  - Subsequent double-clicks rotate geometry-only.
//  - Session ends on pointerdown outside the domino or pointerup.
//  - On session end we emit 'pips:board-rotate-request' with
//    the domino id and the pre-session snapshot.
// ============================================================

import { rotateDominoOnBoard } from "../engine/placement.js";

/* Rotation session state */
let rotatingDomino = null;      // domino object currently in session
let rotatingPrev = null;        // snapshot { r0,c0,r1,c1 }
let rotatingPivot = 0;          // pivot half used for last rotate
let rotatingRender = null;      // renderPuzzle reference
let rotatingBoardEl = null;     // board element

/**
 * initRotation(dominos, trayEl, boardEl, renderPuzzle)
 * - dominos: Map of domino objects
 * - trayEl, boardEl: DOM elements
 * - renderPuzzle: function that re-renders board + tray
 */
export function initRotation(dominos, trayEl, boardEl, renderPuzzle) {
  if (!boardEl || !renderPuzzle) {
    console.warn("initRotation: missing required args", {
      boardEl: !!boardEl,
      renderPuzzle: !!renderPuzzle
    });
    return;
  }

  rotatingRender = renderPuzzle;
  rotatingBoardEl = boardEl;

  console.log("ROT: initRotation complete");

  // ----------------------------------------------------------
  // TRAY single-click rotates tray domino (spec-compliant)
  // ----------------------------------------------------------
  trayEl.addEventListener("click", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;
  
    const id = wrapper.dataset.dominoId ?? wrapper.dataset.id;
    if (!id) return;
  
    const domino = dominos.get(id);
    if (!domino) return;
    if (domino.row0 !== null) return; // only tray dominos
  
    // Rotate 90° clockwise
    domino.trayOrientation = ((domino.trayOrientation || 0) + 90) % 360;
  
    console.log("ROT: tray rotate (single-click)", {
      id,
      newOrientation: domino.trayOrientation
    });
  
    renderPuzzle();
  });

  // ----------------------------------------------------------
  // TRAY double-click rotates tray domino visually (no session)
  // ----------------------------------------------------------
  trayEl.addEventListener("dblclick", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId ?? wrapper.dataset.id;
    if (!id) return;

    const domino = dominos.get(id);
    if (!domino) return;
    if (domino.row0 !== null) return; // only tray dominos

    domino.trayOrientation = ((domino.trayOrientation || 0) + 90) % 360;

    console.log("ROT: tray rotate", {
      id,
      newOrientation: domino.trayOrientation
    });

    renderPuzzle();
  });

  // ----------------------------------------------------------
  // BOARD double-click enters or continues rotation session
  // ----------------------------------------------------------
  boardEl.addEventListener("dblclick", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId ?? wrapper.dataset.id;
    if (!id) return;

    const domino = dominos.get(id);
    if (!domino) return;
    if (domino.row0 === null) return; // only board dominos

    // Determine pivot half
    const halfEl = event.target.closest(".half");
    let pivotHalf = 0;
    if (halfEl) {
      pivotHalf = halfEl.classList.contains("half1") ? 1 : 0;
    }

    // Start or continue session
    if (rotatingDomino !== domino) {
      rotatingDomino = domino;
      rotatingPrev = {
        r0: domino.row0,
        c0: domino.col0,
        r1: domino.row1,
        c1: domino.col1
      };
      rotatingPivot = pivotHalf;

      console.log("ROT: session start", {
        id,
        pivotHalf,
        prev: rotatingPrev
      });
    } else {
      rotatingPivot = pivotHalf;
      console.log("ROT: session continue", { id, pivotHalf });
    }

    // Geometry-only rotation
    rotateDominoOnBoard(domino, pivotHalf);

    console.log("ROT: geometry rotate", {
      id,
      pivotHalf,
      new: {
        r0: domino.row0,
        c0: domino.col0,
        r1: domino.row1,
        c1: domino.col1
      }
    });

    renderPuzzle();
  });

  // ----------------------------------------------------------
  // Pointerdown outside the rotating domino ends the session
  // ----------------------------------------------------------
  document.addEventListener("pointerdown", (event) => {
    if (!rotatingDomino) return;

    const insideSame =
      event.target.closest(".domino-wrapper")?.dataset.dominoId ===
      String(rotatingDomino.id);

    if (!insideSame) {
      console.log("ROT: pointerdown outside → end session");
      endRotationSession();
    }
  });

  // ----------------------------------------------------------
  // Pointerup also ends the session (release after drag)
  // ----------------------------------------------------------
  document.addEventListener("pointerup", () => {
    if (rotatingDomino) {
      console.log("ROT: pointerup → end session");
      endRotationSession();
    }
  });
}

/**
 * endRotationSession()
 * Emits 'pips:board-rotate-request' with:
 *   { id, pivotHalf, prev }
 */
function endRotationSession() {
  if (!rotatingDomino) return;

  const d = rotatingDomino;
  const prev = rotatingPrev
    ? { ...rotatingPrev }
    : { r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 };

  console.log("ROT: endRotationSession", {
    id: d.id,
    pivotHalf: rotatingPivot,
    prev
  });

  const ev = new CustomEvent("pips:board-rotate-request", {
    detail: { id: d.id, pivotHalf: rotatingPivot, prev },
    bubbles: true
  });
  document.dispatchEvent(ev);

  rotatingDomino = null;
  rotatingPrev = null;
  rotatingPivot = 0;

  // Allow validator to update model before rendering
  setTimeout(() => {
    try {
      rotatingRender();
    } catch (e) {
      console.warn("ROT: render error after session end", e);
    }
  }, 0);
}
