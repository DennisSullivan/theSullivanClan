// ============================================================
// FILE: engine/placement.js
// PURPOSE: Deterministic, engine‑level placement and rotation helpers.
// NOTES:
//   - UI computes integer anchors (r0,c0,r1,c1) and calls placeDominoAnchor.
//   - This module performs atomic grid commits and rotation geometry only.
//   - No DOM, no UI heuristics, no pixel math.
//   - Medium diagnostics for impossible branches.
// ============================================================

import { isInside } from "./grid.js";

// ------------------------------------------------------------
// Utility helpers
// ------------------------------------------------------------

/**
 * toIdStr(id)
 * Normalizes any id to a string. Used for grid occupancy checks.
 */
function toIdStr(id) {
  return String(id);
}

/**
 * resolveDomino(dominos, id)
 * Finds a domino by id in either a Map or an array.
 * Returns undefined if not found.
 */
export function resolveDomino(dominos, id) {
  if (!dominos) {
    console.error("resolveDomino: dominos is null/undefined");
    return undefined;
  }

  // Map case
  if (dominos instanceof Map) {
    if (dominos.has(id)) return dominos.get(id);

    const s = String(id);
    if (dominos.has(s)) return dominos.get(s);

    const n = Number(id);
    if (!Number.isNaN(n) && dominos.has(n)) return dominos.get(n);

    console.warn("resolveDomino: id not found in Map", id);
    return undefined;
  }

  // Array case
  const sId = String(id);
  const found = dominos.find((d) => String(d.id) === sId);
  if (!found) {
    console.warn("resolveDomino: id not found in array", id);
  }
  return found;
}

/**
 * idsEqual(a, b)
 * Compares two ids by string equivalence.
 */
export function idsEqual(a, b) {
  return String(a) === String(b);
}

// ------------------------------------------------------------
// Rotation geometry (model‑only)
// ------------------------------------------------------------

/**
 * rotateDominoOnBoard(domino, pivotHalf = 0)
 * Applies a 90° clockwise rotation around the chosen half.
 * This mutates only the domino's row/col fields.
 * Does NOT commit to the grid — caller must validate/commit.
 */
export function rotateDominoOnBoard(domino, pivotHalf = 0) {
  if (!domino || domino.row0 === null) {
    console.warn("rotateDominoOnBoard: domino not on board or null", domino);
    return;
  }

  // Snapshot previous geometry if not already captured.
  if (typeof domino._prevRow0 === "undefined") {
    domino._prevRow0 = domino.row0;
    domino._prevCol0 = domino.col0;
    domino._prevRow1 = domino.row1;
    domino._prevCol1 = domino.col1;
  }

  // Determine pivot and other half.
  let pivotRow, pivotCol, otherRow, otherCol;
  if (pivotHalf === 0) {
    pivotRow = domino.row0;
    pivotCol = domino.col0;
    otherRow = domino.row1;
    otherCol = domino.col1;
  } else {
    pivotRow = domino.row1;
    pivotCol = domino.col1;
    otherRow = domino.row0;
    otherCol = domino.col0;
  }

  const dr = otherRow - pivotRow;
  const dc = otherCol - pivotCol;

  // 90° clockwise: (dr, dc) → (dc, -dr)
  const newDr = dc;
  const newDc = -dr;

  const newOtherRow = pivotRow + newDr;
  const newOtherCol = pivotCol + newDc;

  if (pivotHalf === 0) {
    domino.row1 = newOtherRow;
    domino.col1 = newOtherCol;
  } else {
    domino.row0 = newOtherRow;
    domino.col0 = newOtherCol;
  }

  console.log("PLACEMENT: rotateDominoOnBoard", {
    id: domino.id,
    pivotHalf,
    newRow0: domino.row0,
    newCol0: domino.col0,
    newRow1: domino.row1,
    newCol1: domino.col1
  });
}

/**
 * rotateDominoInTray(domino)
 * Simple orientation increment for tray dominos.
 */
export function rotateDominoInTray(domino) {
  if (!domino) {
    console.error("rotateDominoInTray: missing domino");
    return;
  }
  const old = typeof domino.trayOrientation === "number" ? domino.trayOrientation : 0;
  domino.trayOrientation = (old + 90) % 360;
}

// ------------------------------------------------------------
// Internal grid helpers
// ------------------------------------------------------------

/**
 * findOldCells(domino, grid)
 * Returns the list of grid cells currently occupied by this domino.
 * Uses snapshot if available; otherwise scans the grid.
 */
function findOldCells(domino, grid) {
  const idStr = toIdStr(domino.id);
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const old = [];

  // Prefer explicit snapshot if present.
  if (
    typeof domino._prevRow0 !== "undefined" &&
    typeof domino._prevCol0 !== "undefined" &&
    typeof domino._prevRow1 !== "undefined" &&
    typeof domino._prevCol1 !== "undefined"
  ) {
    const r0 = domino._prevRow0,
      c0 = domino._prevCol0,
      r1 = domino._prevRow1,
      c1 = domino._prevCol1;

    if (typeof r0 === "number" && typeof c0 === "number") old.push({ r: r0, c: c0 });
    if (typeof r1 === "number" && typeof c1 === "number") old.push({ r: r1, c: c1 });

    return old;
  }

  // Fallback: scan grid.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell && String(cell.dominoId) === idStr) {
        old.push({ r, c });
      }
    }
  }

  return old;
}

/**
 * cleanupPrevSnapshot(domino)
 * Removes snapshot fields after a successful commit.
 */
function cleanupPrevSnapshot(domino) {
  delete domino._prevRow0;
  delete domino._prevCol0;
  delete domino._prevRow1;
  delete domino._prevCol1;
}

// ------------------------------------------------------------
// Atomic placement API (engine)
// ------------------------------------------------------------

/**
 * placeDominoAnchor(domino, r0, c0, r1, c1, grid)
 * Atomically commits a domino to the two explicit target cells.
 * UI must compute anchors; this function only validates and commits.
 *
 * RETURNS:
 *   true  → success
 *   false → failure (no partial writes)
 */
export function placeDominoAnchor(domino, r0, c0, r1, c1, grid) {
  if (!domino) {
    console.error("placeDominoAnchor: missing domino");
    return false;
  }

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const idStr = toIdStr(domino.id);

  // Basic numeric validation.
  const isNum = (n) => typeof n === "number" && !Number.isNaN(n);
  if (![r0, c0, r1, c1].every(isNum)) {
    console.error("placeDominoAnchor: non-numeric coordinates", { r0, c0, r1, c1 });
    return false;
  }

  // Bounds check.
  if (r0 < 0 || r0 >= rows || c0 < 0 || c0 >= cols) return false;
  if (r1 < 0 || r1 >= rows || c1 < 0 || c1 >= cols) return false;

  // Distinct cells required.
  if (r0 === r1 && c0 === c1) {
    console.error("placeDominoAnchor: both halves map to same cell", { r0, c0 });
    return false;
  }

  // Occupancy check.
  const cell0 = grid[r0][c0];
  const cell1 = grid[r1][c1];

  if (cell0 && String(cell0.dominoId) !== idStr) return false;
  if (cell1 && String(cell1.dominoId) !== idStr) return false;

  // Determine old cells to clear.
  const oldCells = findOldCells(domino, grid);

  // Clear old cells that still reference this domino.
  for (const oc of oldCells) {
    if (oc.r >= 0 && oc.r < rows && oc.c >= 0 && oc.c < cols) {
      const cell = grid[oc.r][oc.c];
      if (cell && String(cell.dominoId) === idStr) {
        grid[oc.r][oc.c] = null;
      }
    }
  }

  // Write new occupancy.
  grid[r0][c0] = { dominoId: idStr, half: 0 };
  grid[r1][c1] = { dominoId: idStr, half: 1 };

  // Update domino geometry.
  domino.row0 = r0;
  domino.col0 = c0;
  domino.row1 = r1;
  domino.col1 = c1;

  cleanupPrevSnapshot(domino);

  console.log("PLACEMENT: placeDominoAnchor committed", {
    id: domino.id,
    r0,
    c0,
    r1,
    c1
  });

  return true;
}

/**
 * isPlacementValid(domino, grid)
 * Quick engine-level validator for the domino's current geometry.
 * Returns true if:
 *   - both halves are inside the grid
 *   - both halves are empty or already owned by this domino
 *   - halves are not overlapping
 */
export function isPlacementValid(domino, grid) {
  if (!domino) {
    console.error("isPlacementValid: missing domino");
    return false;
  }

  const { row0: r0, col0: c0, row1: r1, col1: c1 } = domino;

  if (!isInside(grid, r0, c0) || !isInside(grid, r1, c1)) return false;

  const idStr = toIdStr(domino.id);
  const cell0 = grid[r0][c0];
  const cell1 = grid[r1][c1];

  if (cell0 !== null && !(cell0 && String(cell0.dominoId) === idStr)) return false;
  if (cell1 !== null && !(cell1 && String(cell1.dominoId) === idStr)) return false;

  if (r0 === r1 && c0 === c1) return false;

  return true;
}

// ------------------------------------------------------------
// Rotation commit (atomic)
// ------------------------------------------------------------

/**
 * commitRotation(domino, grid)
 * Commits the domino's current geometry (after rotateDominoOnBoard)
 * into the grid using atomic semantics.
 *
 * RETURNS:
 *   true  → success
 *   false → failure (no partial writes)
 */
export function commitRotation(domino, grid) {
  if (!domino) {
    console.error("commitRotation: missing domino");
    return false;
  }

  // If domino is being returned to tray (row0 null), clear old cells.
  if (domino.row0 === null || domino.row0 === undefined) {
    const oldCells = findOldCells(domino, grid);
    for (const oc of oldCells) {
      if (oc.r >= 0 && oc.r < grid.length && oc.c >= 0 && oc.c < grid[0].length) {
        const cell = grid[oc.r][oc.c];
        if (cell && String(cell.dominoId) === toIdStr(domino.id)) {
          grid[oc.r][oc.c] = null;
        }
      }
    }

    domino.row0 = null;
    domino.col0 = null;
    domino.row1 = null;
    domino.col1 = null;

    cleanupPrevSnapshot(domino);

    console.log("PLACEMENT: commitRotation cleared domino to tray", { id: domino.id });
    return true;
  }

  // Otherwise, validate numeric geometry and commit atomically.
  const { row0: r0, col0: c0, row1: r1, col1: c1 } = domino;

  const isNum = (n) => typeof n === "number" && !Number.isNaN(n);
  if (![r0, c0, r1, c1].every(isNum)) {
    console.error("commitRotation: non-numeric geometry", { r0, c0, r1, c1 });
    return false;
  }

  return placeDominoAnchor(domino, r0, c0, r1, c1, grid);
}

// ------------------------------------------------------------
// Removal helper
// ------------------------------------------------------------

/**
 * removeDominoToTray(domino, grid)
 * Clears any grid references to the domino and resets its geometry.
 */
export function removeDominoToTray(domino, grid) {
  if (!domino) {
    console.error("removeDominoToTray: missing domino");
    return;
  }

  const oldCells = findOldCells(domino, grid);
  for (const oc of oldCells) {
    if (oc.r >= 0 && oc.r < grid.length && oc.c >= 0 && oc.c < grid[0].length) {
      const cell = grid[oc.r][oc.c];
      if (cell && String(cell.dominoId) === toIdStr(domino.id)) {
        grid[oc.r][oc.c] = null;
      }
    }
  }

  domino.row0 = null;
  domino.col0 = null;
  domino.row1 = null;
  domino.col1 = null;

  cleanupPrevSnapshot(domino);

  console.log("PLACEMENT: removeDominoToTray", { id: domino.id });
}

// ------------------------------------------------------------
// Deprecated UI convenience wrappers
// ------------------------------------------------------------

/**
 * placeDomino (deprecated)
 * Legacy UI convenience wrapper. Attempts four orthogonal anchors.
 * UI should compute anchors explicitly and call placeDominoAnchor.
 */
export function placeDomino(domino, row, col, grid, clickedHalf = 0) {
  console.warn("placeDomino: deprecated; UI should call placeDominoAnchor");

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const inside = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols;

  const candidates =
    clickedHalf === 0
      ? [
          [row, col, row, col + 1], // right
          [row, col, row + 1, col], // down
          [row, col, row, col - 1], // left
          [row, col, row - 1, col] // up
        ]
      : [
          [row - 1, col, row, col], // above
          [row, col - 1, row, col], // left
          [row, col + 1, row, col], // right
          [row + 1, col, row, col] // below
        ];

  for (const [r0, c0, r1, c1] of candidates) {
    if (!inside(r0, c0) || !inside(r1, c1)) continue;

    const cell0 = grid[r0][c0];
    const cell1 = grid[r1][c1];
    const idStr = toIdStr(domino.id);

    const ok0 = cell0 === null || (cell0 && String(cell0.dominoId) === idStr);
    const ok1 = cell1 === null || (cell1 && String(cell1.dominoId) === idStr);

    if (!ok0 || !ok1) continue;

    if (placeDominoAnchor(domino, r0, c0, r1, c1, grid)) return true;
  }

  return false;
}

/**
 * moveDomino (deprecated)
 * Legacy wrapper for callers expecting moveDomino semantics.
 * Attempts to place half0 at (row,col) in four directions.
 */
export function moveDomino(domino, row, col, grid) {
  console.warn("moveDomino: deprecated; UI should call placeDominoAnchor");

  const candidates = [
    [row, col, row, col + 1], // right
    [row, col, row + 1, col], // down
    [row, col, row, col - 1], // left
    [row, col, row - 1, col] // up
  ];

  for (const [r0, c0, r1, c1] of candidates) {
    try {
      if (placeDominoAnchor(domino, r0, c0, r1, c1, grid)) return true;
    } catch (e) {
      console.error("moveDomino: error during candidate placement", e);
    }
  }

  return false;
}
