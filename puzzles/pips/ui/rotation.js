// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Visual-only pivot preview for board rotation.
// MODEL:
//  - Board rotation is a pivot around the clicked half
//  - No logical mutation during session
//  - No engine interaction
//  - Visual preview only (discardable)
// ============================================================

let rotatingDomino = null;
let rotatingPrev = null;
let rotatingPivot = 0;
let rotationGhost = null;
let boardElRef = null;
let renderDominoRef = null;

export function initRotation(dominos, trayEl, boardEl, renderDomino) {
  boardElRef = boardEl;
  renderDominoRef = renderDomino;

  // ----------------------------------------------------------
  // TRAY click rotates tray domino visually (allowed)
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
  // BOARD double-click → pivot preview
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
    }

    rotatingPivot = pivotHalf;
    showPivotPreview(domino, rotatingPrev, pivotHalf);
  });

  // ----------------------------------------------------------
  // End session on pointerdown outside
  // ----------------------------------------------------------
  document.addEventListener("pointerdown", (event) => {
    if (!rotatingDomino) return;

    const inside =
      event.target.closest(".domino-wrapper")?.dataset.dominoId ===
      String(rotatingDomino.id);

    if (!inside) clearRotationPreview();
  });

  // ----------------------------------------------------------
  // End session on pointerup
  // ----------------------------------------------------------
  document.addEventListener("pointerup", () => {
    if (rotatingDomino) clearRotationPreview();
  });
}

// ------------------------------------------------------------
// Compute pivoted placement (visual only)
// ------------------------------------------------------------
function computePivotPreview(prev, pivotHalf) {
  const pivot =
    pivotHalf === 0
      ? { r: prev.r0, c: prev.c0 }
      : { r: prev.r1, c: prev.c1 };

  const other =
    pivotHalf === 0
      ? { r: prev.r1, c: prev.c1 }
      : { r: prev.r0, c: prev.c0 };

  const dr = other.r - pivot.r;
  const dc = other.c - pivot.c;

  // vertical → horizontal
  if (Math.abs(dr) === 1 && dc === 0) {
    return pivotHalf === 0
      ? { row0: pivot.r, col0: pivot.c, row1: pivot.r, col1: pivot.c + dr }
      : { row0: pivot.r, col0: pivot.c + dr, row1: pivot.r, col1: pivot.c };
  }

  // horizontal → vertical
  if (Math.abs(dc) === 1 && dr === 0) {
    return pivotHalf === 0
      ? { row0: pivot.r, col0: pivot.c, row1: pivot.r - dc, col1: pivot.c }
      : { row0: pivot.r - dc, col0: pivot.c, row1: pivot.r, col1: pivot.c };
  }

  return null;
}

// ------------------------------------------------------------
// Render visual ghost preview
// ------------------------------------------------------------
function showPivotPreview(domino, prev, pivotHalf) {
  const preview = computePivotPreview(prev, pivotHalf);
  if (!preview) return;

  if (rotationGhost) rotationGhost.remove();

  rotationGhost = document.createElement("div");
  rotationGhost.className = "domino-wrapper ghost";
  rotationGhost.dataset.dominoId = domino.id;

  const isHorizontal = preview.row0 === preview.row1;
  rotationGhost.dataset.half0Side = isHorizontal
    ? preview.col1 > preview.col0 ? "left" : "right"
    : preview.row1 > preview.row0 ? "top" : "bottom";

  const boardRect = boardElRef.getBoundingClientRect();
  const rows = Number(boardElRef.dataset.rows);
  const cols = Number(boardElRef.dataset.cols);
  const cellW = boardRect.width / cols;
  const cellH = boardRect.height / rows;

  rotationGhost.style.position = "absolute";
  rotationGhost.style.left = `${preview.col0 * cellW}px`;
  rotationGhost.style.top = `${preview.row0 * cellH}px`;
  rotationGhost.style.width = `${isHorizontal ? cellW * 2 : cellW}px`;
  rotationGhost.style.height = `${isHorizontal ? cellH : cellH * 2}px`;
  rotationGhost.style.pointerEvents = "none";
  rotationGhost.style.opacity = "0.6";

  boardElRef.appendChild(rotationGhost);
  renderDominoRef(domino, rotationGhost);
}

// ------------------------------------------------------------
// Clear preview
// ------------------------------------------------------------
function clearRotationPreview() {
  if (rotationGhost) rotationGhost.remove();
  rotationGhost = null;
  rotatingDomino = null;
  rotatingPrev = null;
  rotatingPivot = 0;
}
