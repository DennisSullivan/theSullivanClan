// ui/interaction/dragDrop.js
//
// Implements PIPS Interaction & State Transitions — Drag Lifecycle
//
// Responsibilities:
// - Manage pointer lifecycle (down / move / up)
// - Create and move a visual drag clone
// - Determine destination placement at pointer-up
// - Emit a single PlacementProposal
//
// Non-responsibilities:
// - No engine mutation
// - No validation
// - No snapping
// - No heuristics
// - No half identity inference
//
// Contract alignment:
// - Placement is determined ONLY at pointer-up
// - Destination is defined by the clone’s visual footprint
// - Half identities never swap
// - All logical changes cross the boundary as a PlacementProposal

const DRAG_THRESHOLD_PX = 6;
const dragRoots = {
  boardEl: null,
  trayEl: null
};
let dragState = null;

// ------------------------------------------------------------------
// Installation
// ------------------------------------------------------------------
//
// installDragDrop()
// Attaches drag/drop interaction handlers.
// Configuration is limited to DOM scoping only.
// No geometry or placement decisions occur here.

export function installDragDrop({ boardEl, trayEl }) {
  document.addEventListener("pointerdown", onPointerDown);

  // Optional: store roots for cell detection if needed later
  dragRoots.boardEl = boardEl;
  dragRoots.trayEl = trayEl;
}

/* ------------------------------------------------------------------ */
/* Pointer Down                                                        */
/* ------------------------------------------------------------------ */

export function onPointerDown(e) {
  const dominoEl = e.target.closest(".domino");
  if (!dominoEl) return;

  dragState = {
    dominoId: dominoEl.dataset.dominoId,
    sourceEl: dominoEl,
    startX: e.clientX,
    startY: e.clientY,
    dragging: false,
    clone: null,
    snapshot: null
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp, { once: true });
}

/* ------------------------------------------------------------------ */
/* Pointer Move                                                        */
/* ------------------------------------------------------------------ */

function onPointerMove(e) {
  if (!dragState) return;

  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.dragging) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    startDrag(e);
  }

  updateClonePosition(e);
}

/* ------------------------------------------------------------------ */
/* Drag Start                                                          */
/* ------------------------------------------------------------------ */

function startDrag(e) {
  dragState.dragging = true;

  dragState.snapshot = captureGeometrySnapshot(dragState.sourceEl);
  dragState.clone = createDragClone(dragState.sourceEl, dragState.snapshot);

  dragState.sourceEl.classList.add("hidden-during-drag");

  updateClonePosition(e);
}

/* ------------------------------------------------------------------ */
/* Drag Move (visual only)                                             */
/* ------------------------------------------------------------------ */

function updateClonePosition(e) {
  const clone = dragState.clone;
  if (!clone) return;

  clone.style.left = `${e.clientX}px`;
  clone.style.top = `${e.clientY}px`;
}

/* ------------------------------------------------------------------ */
/* Pointer Up                                                          */
/* ------------------------------------------------------------------ */

function onPointerUp(e) {
  document.removeEventListener("pointermove", onPointerMove);

  if (!dragState) return;

  if (!dragState.dragging) {
    cleanup();
    return;
  }

  const { dominoId, clone, snapshot } = dragState;

  const placement = computePlacementFromClone(clone, snapshot);

  cleanup();

  console.log("Placment", placement);

  if (!placement) return;

  emitPlacementProposal({
    dominoId,
    ...placement
  });
}

/* ------------------------------------------------------------------ */
/* Geometry Snapshot                                                   */
/* ------------------------------------------------------------------ */

function captureGeometrySnapshot(dominoEl) {
  return {
    half0Side: dominoEl.dataset.half0Side,
    width: dominoEl.offsetWidth,
    height: dominoEl.offsetHeight
  };
}

/* ------------------------------------------------------------------ */
/* Clone Creation                                                      */
/* ------------------------------------------------------------------ */

function createDragClone(sourceEl, snapshot) {
  const clone = sourceEl.cloneNode(true);
  clone.classList.add("domino-clone");

  clone.style.position = "fixed";
  clone.style.pointerEvents = "none";
  clone.style.width = `${snapshot.width}px`;
  clone.style.height = `${snapshot.height}px`;

  document.body.appendChild(clone);
  return clone;
}

/* ------------------------------------------------------------------ */
/* Placement Determination                                             */
/* ------------------------------------------------------------------ */

function computePlacementFromClone(clone, snapshot) {
  const cells = cellsUnderClone(clone);
  if (cells.length !== 2) return null;

  const [cellA, cellB] = cells;

  const { row: rA, col: cA } = cellA.dataset;
  const { row: rB, col: cB } = cellB.dataset;

  if (snapshot.half0Side === "left" || snapshot.half0Side === "top") {
    return {
      row0: Number(rA),
      col0: Number(cA),
      row1: Number(rB),
      col1: Number(cB)
    };
  }

  return {
    row0: Number(rB),
    col0: Number(cB),
    row1: Number(rA),
    col1: Number(cA)
  };
}

/* ------------------------------------------------------------------ */
/* Board Cell Detection                                                */
/* ------------------------------------------------------------------ */

function cellsUnderClone(clone) {
  const rect = clone.getBoundingClientRect();

  const midX = (rect.left + rect.right) / 2;
  const midY = (rect.top + rect.bottom) / 2;

  const halfOffsetX = rect.width / 4;
  const halfOffsetY = rect.height / 4;

  const points = [
    [midX - halfOffsetX, midY],
    [midX + halfOffsetX, midY]
  ];

  const cells = new Set();

  for (const [x, y] of points) {
    const el = document.elementFromPoint(x, y);
    const cell = el && el.closest(".board-cell");
    if (cell) cells.add(cell);
  }

  return Array.from(cells);
}

/* ------------------------------------------------------------------ */
/* Proposal Emission                                                   */
/* ------------------------------------------------------------------ */

function emitPlacementProposal({ dominoId, row0, col0, row1, col1 }) {
//  console.log("DROP PROPOSAL", proposal);
  document.dispatchEvent(
    new CustomEvent("pips:drop:proposal", {
      detail: {
        proposal: {
          id: String(dominoId),
          row0,
          col0,
          row1,
          col1
        }
      },
      bubbles: true
    })
  );
}

/* ------------------------------------------------------------------ */
/* Cleanup                                                             */
/* ------------------------------------------------------------------ */

function cleanup() {
  if (dragState?.clone) dragState.clone.remove();
  if (dragState?.sourceEl)
    dragState.sourceEl.classList.remove("hidden-during-drag");

  dragState = null;
}
