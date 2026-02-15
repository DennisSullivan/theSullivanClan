// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Rotation session state machine for dominos.
// NOTES:
//  - Double-click enters rotation session (geometry-only).
//  - Subsequent double-clicks rotate geometry-only.
//  - Session ends on pointerdown outside the domino or pointerup.
//  - On session end we emit 'pips:board-rotate-request'.
// ============================================================

import { rotateDominoOnBoard } from "../engine/placement.js";

let rotatingDomino = null;
let rotatingPrev = null;
let rotatingPivot = 0;
let rotatingRender = null;
let rotatingBoardEl = null;

export function initRotation(dominos, trayEl, boardEl, renderPuzzle) {
  if (!boardEl || !renderPuzzle) {
    console.warn("initRotation: missing required args");
    return;
  }

  rotatingRender = renderPuzzle;
  rotatingBoardEl = boardEl;

  console.log("ROT: initRotation complete");

  // ----------------------------------------------------------
  // TRAY single-click rotates tray domino visually
  // ----------------------------------------------------------
  trayEl.addEventListener("click", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
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

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;
    if (domino.row0 === null) return; // only board dominos

    // Determine pivot half
    const halfEl = event.target.closest(".half");
    const pivotHalf = halfEl?.classList.contains("half1") ? 1 : 0;

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
  // Pointerdown outside ends the session
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
  // Pointerup ends the session
  // ----------------------------------------------------------
  document.addEventListener("pointerup", () => {
    if (rotatingDomino) {
      console.log("ROT: pointerup → end session");
      endRotationSession();
    }
  });
}

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

  setTimeout(() => {
    try {
      rotatingRender();
    } catch (e) {
      console.warn("ROT: render error after session end", e);
    }
  }, 0);
}
