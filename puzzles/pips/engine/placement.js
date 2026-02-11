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
// Helper: clear any grid cells that reference this domino id
function _clearDominoFromGrid(domino, grid) {
  const idStr = String(domino.id);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === idStr) grid[r][c] = null;
    }
  }
}

// Place a domino from tray onto board at (row,col) using clickedHalf orientation.
// Returns true if placed, false otherwise.
export function placeDomino(domino, row, col, grid, clickedHalf = 0) {
  // Determine candidate geometry based on clickedHalf and orientation rules.
  // This logic must match your game's rules; below is a robust example that
  // tries the two orientations anchored at (row,col).
  const rows = grid.length;
  const cols = grid[0].length;
  const idStr = String(domino.id);

  // Candidate pairs to try (r0,c0,r1,c1)
  const candidates = [
    // horizontal: left->right anchored at clickedHalf
    [row, col, row, col + 1],
    [row, col - 1, row, col],
    // vertical: top->bottom
    [row, col, row + 1, col],
    [row - 1, col, row, col]
  ];

  // Try candidates in order; validate bounds and emptiness
  for (const cand of candidates) {
    const [r0, c0, r1, c1] = cand;
    if (r0 < 0 || r1 < 0 || c0 < 0 || c1 < 0) continue;
    if (r0 >= rows || r1 >= rows || c0 >= cols || c1 >= cols) continue;

    // Check occupancy: allow if cells are null or already occupied by this domino
    const ok0 = grid[r0][c0] === null || grid[r0][c0] === idStr;
    const ok1 = grid[r1][c1] === null || grid[r1][c1] === idStr;
    if (!ok0 || !ok1) continue;

    // Commit atomically: clear previous references, then set new ones
    _clearDominoFromGrid(domino, grid);
    grid[r0][c0] = idStr;
    grid[r1][c1] = idStr;

    // Update domino geometry in model
    domino.row0 = r0; domino.col0 = c0;
    domino.row1 = r1; domino.col1 = c1;

    return true;
  }

  // No candidate fit
  return false;
}

// Move a domino already on the board to a new anchor (row,col)
export function moveDomino(domino, row, col, grid) {
  // Similar to placeDomino but allow moving from board; same atomic rules
  return placeDomino(domino, row, col, grid, 0);
}

// Remove domino back to tray: clear grid references and null geometry
export function removeDominoToTray(domino, grid) {
  try {
    _clearDominoFromGrid(domino, grid);
  } finally {
    domino.row0 = null;
    domino.col0 = null;
    domino.row1 = null;
    domino.col1 = null;
  }
}
