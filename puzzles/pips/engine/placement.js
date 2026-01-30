// ============================================================
// FILE: placement.js
// PURPOSE: Implements all movement rules for dominos:
//          - tray → board placement
//          - board → board movement
//          - board → tray removal
//          - coordinate assignment
// NOTES:
//   - No orientation flags.
//   - No DOM logic.
//   - Geometry-only orientation.
//   - trayOrientation is tray-only visual state.
// ============================================================

import { isInside, isCellFree, areAdjacent } from "./grid.js";
import { clearBoardState, setCells } from "./domino.js";


// ------------------------------------------------------------
// placeFromTray(domino, grid, dropRow, dropCol, direction)
// Internal helper: places a domino from tray onto board.
// ------------------------------------------------------------
function placeFromTray(domino, grid, dropRow, dropCol, direction) {
  // Compute partner cell based on direction
  let r0 = dropRow;
  let c0 = dropCol;
  let r1 = dropRow;
  let c1 = dropCol;

  if (direction === "up")    r1 = dropRow - 1;
  if (direction === "down")  r1 = dropRow + 1;
  if (direction === "left")  c1 = dropCol - 1;
  if (direction === "right") c1 = dropCol + 1;

  // Validate bounds
  if (!isInside(grid, r0, c0)) return false;
  if (!isInside(grid, r1, c1)) return false;

  // Validate emptiness
  if (!isCellFree(grid, r0, c0)) return false;
  if (!isCellFree(grid, r1, c1)) return false;

  // Validate adjacency
  if (!areAdjacent(r0, c0, r1, c1)) return false;

  // Assign coordinates
  setCells(domino, r0, c0, r1, c1);

  // Initial pivot is always half 0
  domino.pivotHalf = 0;

  return true;
}


// ------------------------------------------------------------
// moveOnBoard(domino, grid, newR0, newC0, newR1, newC1)
// Internal helper: moves a domino already on the board.
// ------------------------------------------------------------
function moveOnBoard(domino, grid, newR0, newC0, newR1, newC1) {
  // Must be inside grid
  if (!isInside(grid, newR0, newC0)) return false;
  if (!isInside(grid, newR1, newC1)) return false;

  // Must be adjacent
  if (!areAdjacent(newR0, newC0, newR1, newC1)) return false;

  // Must be free or occupied by this domino
  const cellA = grid[newR0][newC0];
  const cellB = grid[newR1][newC1];

  if (cellA && cellA.dominoId !== domino.id) return false;
  if (cellB && cellB.dominoId !== domino.id) return false;

  // Update coordinates
  setCells(domino, newR0, newC0, newR1, newC1);

  return true;
}


// ------------------------------------------------------------
// returnToTray(domino)
// Internal helper: removes a domino from the board.
// ------------------------------------------------------------
function returnToTray(domino) {
  clearBoardState(domino);
}


// ============================================================
// CANONICAL PUBLIC API
// These are the names expected by dragDrop.js, main.js, and UI.
// ============================================================

// ------------------------------------------------------------
// placeDomino(domino, row, col, grid, direction)
// Public wrapper for tray → board placement.
// ------------------------------------------------------------
export function placeDomino(domino, row, col, grid, direction) {
  return placeFromTray(domino, grid, row, col, direction);
}


// ------------------------------------------------------------
// moveDomino(domino, row, col, grid)
// Public wrapper for board → board movement.
// Computes new half1 based on existing geometry.
// ------------------------------------------------------------
export function moveDomino(domino, row, col, grid) {
  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

  const newR0 = row;
  const newC0 = col;
  const newR1 = row + dr;
  const newC1 = col + dc;

  return moveOnBoard(domino, grid, newR0, newC0, newR1, newC1);
}


// ------------------------------------------------------------
// removeDominoToTray(domino)
// Public wrapper for board → tray removal.
// ------------------------------------------------------------
export function removeDominoToTray(domino) {
  return returnToTray(domino);
}


// ------------------------------------------------------------
// getDropDirectionFromDrag(dx, dy)
// Utility used by UI to infer placement direction.
// ------------------------------------------------------------
export function getDropDirectionFromDrag(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  } else {
    return dy > 0 ? "down" : "up";
  }
}
