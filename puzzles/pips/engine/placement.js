// engine/placement.js
// Drop-in replacement focused on safe rotation, commit, and basic placement.

import { isInside } from "./grid.js";

/**
 * Rotate a domino on the board 90 degrees clockwise around the given pivot half.
 * This function snapshots previous geometry (if not already snapshotted) so callers
 * can call commitRotation(domino, grid) to validate and persist the rotation.
 *
 * pivotHalf: 0 or 1 indicating which half is the pivot.
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
 * Rotate a tray domino visually by 90 degrees clockwise.
 * This only updates the model's trayOrientation and does not touch the grid.
 */
export function rotateDominoInTray(domino) {
  if (!domino) return;
  const old = typeof domino.trayOrientation === "number" ? domino.trayOrientation : 0;
  domino.trayOrientation = (old + 90) % 360;
}

/**
 * Commit a previously applied geometry-only rotation.
 * Validates bounds and occupancy and writes the new occupancy into grid.
 * If validation fails, restores the previous geometry snapshot and returns false.
 *
 * Returns true on success, false on failure.
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

function cleanupPrevSnapshot(domino) {
  delete domino._prevRow0;
  delete domino._prevCol0;
  delete domino._prevRow1;
  delete domino._prevCol1;
}

/**
 * Validate whether the domino's current geometry is a legal placement
 * (bounds + empty cells).
 */
export function isPlacementValid(domino, grid) {
  if (!domino) return false;
  const r0 = domino.row0, c0 = domino.col0, r1 = domino.row1, c1 = domino.col1;
  if (!isInside(grid, r0, c0) || !isInside(grid, r1, c1)) return false;
  if (grid[r0][c0] !== null) return false;
  if (grid[r1][c1] !== null) return false;
  return true;
}

/**
 * Attempt to place a domino onto the board.
 *
 * clickedHalf indicates which half the user clicked when dropping:
 * - 0 means the target (row,col) should be half0
 * - 1 means the target should be half1
 *
 * The function tries the four cardinal orientations in this order:
 *  - right, down, left, up (relative to the clicked half)
 *
 * On success it updates domino.row* or col* and writes grid occupancy and returns true.
 * On failure it leaves the domino unchanged and returns false.
 */
export function placeDomino(domino, row, col, grid, clickedHalf = 0) {
  if (!domino) return false;

  // Candidate orientation offsets for the other half relative to the anchor half
  const orientations = [
    { dr: 0, dc: 1 },  // right
    { dr: 1, dc: 0 },  // down
    { dr: 0, dc: -1 }, // left
    { dr: -1, dc: 0 }  // up
  ];

  // Anchor is the clicked half
  for (const o of orientations) {
    let r0, c0, r1, c1;
    if (clickedHalf === 0) {
      r0 = row; c0 = col;
      r1 = row + o.dr; c1 = col + o.dc;
    } else {
      r1 = row; c1 = col;
      r0 = row - o.dr; c0 = col - o.dc;
    }

    if (!isInside(grid, r0, c0) || !isInside(grid, r1, c1)) continue;
    if (grid[r0][c0] !== null || grid[r1][c1] !== null) continue;

    // Place domino
    domino.row0 = r0; domino.col0 = c0;
    domino.row1 = r1; domino.col1 = c1;
    grid[r0][c0] = { dominoId: domino.id, half: 0 };
    grid[r1][c1] = { dominoId: domino.id, half: 1 };
    return true;
  }

  return false;
}

/**
 * Move a domino already on the board to a new anchor position.
 * This implementation treats the requested (row,col) as the new position for half0.
 * It preserves the domino id and updates grid occupancy atomically.
 *
 * Returns true on success, false on failure.
 */
export function moveDomino(domino, row, col, grid) {
  if (!domino) return false;

  // Compute current orientation vector
  const curDr = domino.row1 - domino.row0;
  const curDc = domino.col1 - domino.col0;

  // Proposed new coords with half0 anchored at (row,col)
  const newRow0 = row;
  const newCol0 = col;
  const newRow1 = row + curDr;
  const newCol1 = col + curDc;

  if (!isInside(grid, newRow0, newCol0) || !isInside(grid, newRow1, newCol1)) return false;

  // Check occupancy: allow cells currently occupied by this domino
  const cellFreeOrSelf = (r, c) => {
    const cell = grid[r][c];
    return cell === null || (cell && String(cell.dominoId) === String(domino.id));
  };

  if (!cellFreeOrSelf(newRow0, newCol0) || !cellFreeOrSelf(newRow1, newCol1)) return false;

  // Clear previous occupancy if it references this domino
  if (isInside(grid, domino.row0, domino.col0) && grid[domino.row0][domino.col0] && String(grid[domino.row0][domino.col0].dominoId) === String(domino.id)) {
    grid[domino.row0][domino.col0] = null;
  }
  if (isInside(grid, domino.row1, domino.col1) && grid[domino.row1][domino.col1] && String(grid[domino.row1][domino.col1].dominoId) === String(domino.id)) {
    grid[domino.row1][domino.col1] = null;
  }

  // Apply new geometry
  domino.row0 = newRow0; domino.col0 = newCol0;
  domino.row1 = newRow1; domino.col1 = newCol1;

  // Write new occupancy
  grid[newRow0][newCol0] = { dominoId: domino.id, half: 0 };
  grid[newRow1][newCol1] = { dominoId: domino.id, half: 1 };

  return true;
}

/**
 * Remove a domino from the board and return it to the tray.
 * Clears grid occupancy and sets domino.row0 = null.
 */
export function removeDominoToTray(domino, grid) {
  if (!domino) return;

  if (isInside(grid, domino.row0, domino.col0) && grid[domino.row0][domino.col0] && String(grid[domino.row0][domino.col0].dominoId) === String(domino.id)) {
    grid[domino.row0][domino.col0] = null;
  }
  if (isInside(grid, domino.row1, domino.col1) && grid[domino.row1][domino.col1] && String(grid[domino.row1][domino.col1].dominoId) === String(domino.id)) {
    grid[domino.row1][domino.col1] = null;
  }

  domino.row0 = null;
  domino.col0 = null;
  domino.row1 = null;
  domino.col1 = null;
}
