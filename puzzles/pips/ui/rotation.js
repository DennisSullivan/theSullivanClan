// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Rotation session → PlacementProposal emitter.
// MODEL:
//  - Rotation is geometry-only until commit
//  - No board mutation during session
//  - Session end emits a PlacementProposal
//  - Engine is sole authority for accept/reject
// ============================================================

let rotatingDomino = null;
let rotatingPrev = null;
let rotatingPivot = 0;
let rotatingBoardEl = null;

export function initRotation(dominos, trayEl, boardEl) {
  if (!boardEl) {
    console.warn("initRotation: missing boardEl");
    return;
  }

  rotatingBoardEl = boardEl;

  console.log("ROT: initRotation complete");

  // ----------------------------------------------------------
  // TRAY single-click rotates tray domino visually (allowed)
  // ----------------------------------------------------------
  trayEl.addEventListener("click", (event) => {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;
    if (domino.row0 !== null) return;

    domino.trayOrientation = ((domino.trayOrientation || 0) + 90) % 360;
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
    if (domino.row0 === null) return;

    const halfEl = event.target.closest(".half");
    const pivotHalf = halfEl?.classList.contains("half1") ? 1 : 0;

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
      endRotationSession();
    }
  });

  // ----------------------------------------------------------
  // Pointerup ends the session
  // ----------------------------------------------------------
  document.addEventListener("pointerup", () => {
    if (rotatingDomino) {
      endRotationSession();
    }
  });
}

// ------------------------------------------------------------
// Session end → emit PlacementProposal
// ------------------------------------------------------------
function endRotationSession() {
  if (!rotatingDomino || !rotatingPrev) return;

  const d = rotatingDomino;
  const { r0, c0, r1, c1 } = rotatingPrev;

  const pivot =
    rotatingPivot === 0
      ? { r: r0, c: c0 }
      : { r: r1, c: c1 };

  const other =
    rotatingPivot === 0
      ? { r: r1, c: c1 }
      : { r: r0, c: c0 };

  // 90° clockwise rotation around pivot
  const dr = other.r - pivot.r;
  const dc = other.c - pivot.c;

  const rotated = {
    r: pivot.r - dc,
    c: pivot.c + dr
  };

  const half0IsPivot = rotatingPivot === 0;

  const proposal = half0IsPivot
    ? {
        id: d.id,
        row0: pivot.r,
        col0: pivot.c,
        row1: rotated.r,
        col1: rotated.c
      }
    : {
        id: d.id,
        row0: rotated.r,
        col0: rotated.c,
        row1: pivot.r,
        col1: pivot.c
      };

  console.log("ROT: emit placement proposal", proposal);

  rotatingBoardEl.dispatchEvent(
    new CustomEvent("pips:drop:proposal", {
      bubbles: true,
      detail: { proposal }
    })
  );

  rotatingDomino = null;
  rotatingPrev = null;
  rotatingPivot = 0;
}
