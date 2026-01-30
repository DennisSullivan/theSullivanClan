// ============================================================
// FILE: rotation.js
// PURPOSE: Implements physical pivot-based rotation for dominos.
// NOTES:
//   - Rotation is geometric, not logical.
//   - pivotHalf stays fixed in place.
//   - The partner half rotates in a 4-cycle around the pivot.
//   - No pip swapping, no half swapping, no orientation flags.
// ============================================================

import { isInside, isCellFree } from "./grid.js";


// ------------------------------------------------------------
// rotateDomino(domino, grid)
// Rotates the domino 90° clockwise around pivotHalf.
// INPUTS:
//   domino - canonical Domino object (must be on board)
//   grid   - occupancy map used to validate rotation
// RETURNS:
//   true if rotation succeeded, false if blocked
// NOTES:
//   - Updates domino.row0/col0 and domino.row1/col1 in place.
//   - If rotation is illegal (blocked or out of bounds), no change.
// ------------------------------------------------------------
export function rotateDomino(domino, grid) {
  if (domino.pivotHalf === null) {
    console.warn("rotateDomino called but pivotHalf is null");
    return false;
  }

  // Identify pivot and partner halves
  const pivotIs0 = domino.pivotHalf === 0;

  const pivotRow = pivotIs0 ? domino.row0 : domino.row1;
  const pivotCol = pivotIs0 ? domino.col0 : domino.col1;

  const partRow = pivotIs0 ? domino.row1 : domino.row0;
  const partCol = pivotIs0 ? domino.col1 : domino.col0;

  // Compute relative offset of partner from pivot
  const dr = partRow - pivotRow;
  const dc = partCol - pivotCol;

  // 90° clockwise rotation of (dr,dc)
  // (dr,dc) → (-dc, dr)
  const newDr = -dc;
  const newDc = dr;

  const newPartRow = pivotRow + newDr;
  const newPartCol = pivotCol + newDc;

  // Check bounds
  if (!isInside(grid, newPartRow, newPartCol)) {
    return false;
  }

  // Check if the destination cell is free or belongs to this domino
  const cell = grid[newPartRow][newPartCol];
  const movingHalf = pivotIs0 ? 1 : 0;

  if (cell && (cell.dominoId !== domino.id || cell.half !== movingHalf)) {
    return false;
  }

  // Rotation is legal — update coordinates
  if (pivotIs0) {
    domino.row1 = newPartRow;
    domino.col1 = newPartCol;
  } else {
    domino.row0 = newPartRow;
    domino.col0 = newPartCol;
  }

  return true;
}


// ------------------------------------------------------------
// getRotatedPartnerCell(domino)
// Computes the partner half's new coordinates WITHOUT modifying
// the domino. Useful for previewing rotation.
// RETURNS:
//   { row, col } or null if pivotHalf is null
// ------------------------------------------------------------
export function getRotatedPartnerCell(domino) {
  if (domino.pivotHalf === null) return null;

  const pivotIs0 = domino.pivotHalf === 0;

  const pivotRow = pivotIs0 ? domino.row0 : domino.row1;
  const pivotCol = pivotIs0 ? domino.col0 : domino.col1;

  const partRow = pivotIs0 ? domino.row1 : domino.row0;
  const partCol = pivotIs0 ? domino.col1 : domino.col0;

  const dr = partRow - pivotRow;
  const dc = partCol - pivotCol;

  // 90° clockwise: (dr,dc) → (-dc, dr)
  return {
    row: pivotRow - dc,
    col: pivotCol + dr
  };
}

