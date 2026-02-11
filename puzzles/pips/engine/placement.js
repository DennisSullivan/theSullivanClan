// FILE: engine/placement.js
// PURPOSE: Placement and rotation helpers for domino geometry and grid occupancy.
// NOTES (conversational): This module is the single place that mutates domino geometry
// and the grid. Functions here are careful to validate bounds and to commit atomically.
// Keep changes minimal: callers compute desired anchor and pass clickedHalf into placeDomino.

import { isInside } from "./grid.js";

/**
 * resolveDomino(dominos, id)
 * Purpose: Flexible resolver for a domino by id from a Map or Array.
 * Use: internal helper for diagnostics or callers that need a domino object.
 */
function resolveDomino(dominos, id) {
  if (!dominos) return undefined;
  if (dominos instanceof Map) {
    if (dominos.has(id)) return dominos.get(id);
    const s = String(id);
    if (dominos.has(s)) return dominos.get(s);
    const n = Number(id);
    if (!Number.isNaN(n) && dominos.has(n)) return dominos.get(n);
    return undefined;
  }
  const sId = String(id);
  return dominos.find(d => String(d.id) === sId);
}

/**
 * idsEqual(a, b)
 * Purpose: Type-agnostic id comparison.
 * Use: compare grid.dominoId to domino.id without worrying about string/number types.
 */
function idsEqual(a, b) {
  return String(a) === String(b);
}

/**
 * rotateDominoOnBoard(domino, pivotHalf = 0)
 * Purpose: Apply a geometry-only 90° clockwise rotation around pivotHalf.
 * Use: caller should snapshot before calling commitRotation to persist or revert.
 */
export function rotateDominoOnBoard(domino, pivotHalf = 0) {
  if (!domino || domino.row0 === null) return;

  // Snapshot previous geometry if not already present
  if (typeof domino._prevRow0 === "undefined") {
    domino._prevRow0 = domino.row0;
    domino._prevCol0 = domino.col0;
    domino._prevRow1 = domino.row1;
    domino._prevCol1 = domino.col1;
  }

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

  // 90° clockwise mapping for grid coordinates (row increases downward)
  // Vector (dr, dc) rotates to (dc, -dr)
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
}

/**
 * rotateDominoInTray(domino)
 * Purpose: Visually rotate a tray domino by 90° clockwise (model-only trayOrientation).
 * Use: purely visual; does not touch grid geometry.
 */
export function rotateDominoInTray(domino) {
  if (!domino) return;
  const old = typeof domino.trayOrientation === "number" ? domino.trayOrientation : 0;
  domino.trayOrientation = (old + 90) % 360;
}

/**
 * commitRotation(domino, grid)
 * Purpose: Validate and persist a previously applied geometry-only rotation.
 * Use: call after rotateDominoOnBoard; returns true on success, false on failure.
 */
export function commitRotation(domino, grid) {
  if (!domino || domino.row0 === null) return false;

  // Read snapshot; if missing, create a defensive snapshot from current geometry
  let prevRow0 = domino._prevRow0;
  let prevCol0 = domino._prevCol0;
  let prevRow1 = domino._prevRow1;
  let prevCol1 = domino._prevCol1;
  if (typeof prevRow0 === "undefined") {
    prevRow0 = domino._prevRow0 = domino.row0;
    prevCol0 = domino._prevCol0 = domino.col0;
    prevRow1 = domino._prevRow1 = domino.row1;
    prevCol1 = domino._prevCol1 = domino.col1;
  }

  const newRow0 = domino.row0;
  const newCol0 = domino.col0;
  const newRow1 = domino.row1;
  const newCol1 = domino.col1;

  // Bounds
  if (!isInside(grid, newRow0, newCol0) || !isInside(grid, newRow1, newCol1)) {
    // restore
    domino.row0 = prevRow0;
    domino.col0 = prevCol0;
    domino.row1 = prevRow1;
    domino.col1 = prevCol1;
    cleanupPrevSnapshot(domino);
    return false;
  }

  // Helper: cell free or already occupied by this domino
  const cellFreeOrSelf = (r, c) => {
    const cell = grid[r][c];
    return cell === null || (cell && String(cell.dominoId) === String(domino.id));
  };

  if (!cellFreeOrSelf(newRow0, newCol0) || !cellFreeOrSelf(newRow1, newCol1)) {
    // restore
    domino.row0 = prevRow0;
    domino.col0 = prevCol0;
    domino.row1 = prevRow1;
    domino.col1 = prevCol1;
    cleanupPrevSnapshot(domino);
    return false;
  }

  // Clear previous occupancy only if it references this domino
  if (isInside(grid, prevRow0, prevCol0) && grid[prevRow0][prevCol0] && String(grid[prevRow0][prevCol0].dominoId) === String(domino.id)) {
    grid[prevRow0][prevCol0] = null;
  }
  if (isInside(grid, prevRow1, prevCol1) && grid[prevRow1][prevCol1] && String(grid[prevRow1][prevCol1].dominoId) === String(domino.id)) {
    grid[prevRow1][prevCol1] = null;
  }

  // Write new occupancy
  grid[newRow0][newCol0] = { dominoId: domino.id, half: 0 };
  grid[newRow1][newCol1] = { dominoId: domino.id, half: 1 };

  cleanupPrevSnapshot(domino);
  return true;
}

/**
 * cleanupPrevSnapshot(domino)
 * Purpose: Remove temporary rotation snapshot fields from a domino.
 * Use: internal cleanup after commit or revert.
 */
function cleanupPrevSnapshot(domino) {
  delete domino._prevRow0;
  delete domino._prevCol0;
  delete domino._prevRow1;
  delete domino._prevCol1;
}

/**
 * isPlacementValid(domino, grid)
 * Purpose: Quick validator to check whether domino's current geometry fits (bounds + empty).
 * Use: callers can use this to pre-check before commit.
 */
export function isPlacementValid(domino, grid) {
  if (!domino) return false;
  const r0 = domino.row0, c0 = domino.col0, r1 = domino.row1, c1 = domino.col1;
  if (!isInside(grid, r0, c0) || !isInside(grid, r1, c1)) return false;
  if (grid[r0][c0] !== null && !(grid[r0][c0] && String(grid[r0][c0].dominoId) === String(domino.id))) return false;
  if (grid[r1][c1] !== null && !(grid[r1][c1] && String(grid[r1][c1].dominoId) === String(domino.id))) return false;
  return true;
}

/**
 * _clearDominoFromGrid(domino, grid)
 * Purpose: Remove any grid cells that reference this domino id.
 * Use: internal helper used before committing new occupancy.
 */
function _clearDominoFromGrid(domino, grid) {
  const idStr = String(domino.id);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const cell = grid[r][c];
      if (cell && String(cell.dominoId) === idStr) grid[r][c] = null;
    }
  }
}

/**
 * placeDomino(domino, row, col, grid, clickedHalf = 0)
 * Purpose: Attempt to place a domino so that the clicked half is anchored at (row,col).
 * Use: Called by drag/drop. Tries orientations in order: right, down, left, up (relative to clicked half).
 * Returns: true on success (grid and domino geometry updated), false if no fit.
 */
export function placeDomino(domino, row, col, grid, clickedHalf = 0) {
  const rows = grid.length;
  const cols = grid[0].length;
  const idStr = String(domino.id);

  const inside = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols;

  // Build candidates so the clicked half is anchored at (row,col)
  const candidates = [];
  if (clickedHalf === 0) {
    candidates.push([row, col,     row, col + 1]); // right
    candidates.push([row, col,     row + 1, col]); // down
    candidates.push([row, col,     row, col - 1]); // left
    candidates.push([row, col,     row - 1, col]); // up
  } else {
    // clickedHalf === 1: ensure half1 == (row,col)
    candidates.push([row, col + 1, row, col]);     // right
    candidates.push([row - 1, col, row, col]);     // down
    candidates.push([row, col - 1, row, col]);     // left
    candidates.push([row + 1, col, row, col]);     // up
  }

  for (const [r0, c0, r1, c1] of candidates) {
    if (!inside(r0, c0) || !inside(r1, c1)) continue;

    const cell0 = grid[r0][c0];
    const cell1 = grid[r1][c1];

    const ok0 = cell0 === null || (cell0.dominoId && String(cell0.dominoId) === idStr);
    const ok1 = cell1 === null || (cell1.dominoId && String(cell1.dominoId) === idStr);
    if (!ok0 || !ok1) continue;

    // Commit atomically
    _clearDominoFromGrid(domino, grid);
    grid[r0][c0] = { dominoId: idStr, half: 0 };
    grid[r1][c1] = { dominoId: idStr, half: 1 };

    domino.row0 = r0; domino.col0 = c0;
    domino.row1 = r1; domino.col1 = c1;

    return true;
  }

  return false;
}

/**
 * moveDomino(domino, row, col, grid)
 * Purpose: Move an already-placed domino to a new anchor. Reuses placeDomino logic.
 * Use: called when dragging a domino that came from the board.
 */
export function moveDomino(domino, row, col, grid) {
  return placeDomino(domino, row, col, grid, 0);
}

/**
 * removeDominoToTray(domino, grid)
 * Purpose: Remove domino occupancy from grid and reset geometry to tray (nulls).
 * Use: called when returning a domino to the tray.
 */
export function removeDominoToTray(domino, grid) {
  try {
    _clearDominoFromGrid(domino, grid);
  } finally {
    domino.row0 = null; domino.col0 = null;
    domino.row1 = null; domino.col1 = null;
  }
}
