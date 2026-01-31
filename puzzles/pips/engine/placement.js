// ============================================================
// FILE: placement.js
// PURPOSE: Geometry-only domino placement and movement.
// NOTES:
//   - No direction strings.
//   - No trayOrientation.
//   - pip0 is always half0, pip1 is always half1.
//   - Geometry is the single source of truth.
// ============================================================

import { isInside, isCellFree, areAdjacent } from "./grid.js";
import { clearBoardState, setCells } from "./domino.js";


// ------------------------------------------------------------
// computeGeometryFromDrop(row, col, dx, dy)
// Given a drop cell and drag vector, compute (r0,c0,r1,c1)
// while preserving pip order (pip0 = half0).
// ------------------------------------------------------------
function computeGeometryFromDrop(row, col, dx, dy) {
  // Determine orientation from drag vector
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  if (horizontal) {
    // pip0 must be left, pip1 must be right
    if (dx >= 0) {
      // drag right → natural order
      return [row, col, row, col + 1];
    } else {
      // drag left → flip geometry to preserve pip order
      return [row, col - 1, row, col];
    }
  } else {
    // vertical
    // pip0 must be top, pip1 must be bottom
    if (dy >= 0) {
      // drag down → natural order
      return [row, col, row + 1, col];
    } else {
      // drag up → flip geometry to preserve pip order
      return [row - 1, col, row, col];
    }
  }
}


// ------------------------------------------------------------
// placeFromTray(domino, grid, dropRow, dropCol, dx, dy)
// Compute geometry and place domino from tray.
// ------------------------------------------------------------
function placeFromTray(domino, grid, dropRow, dropCol, dx, dy) {
  const [r0, c0, r1, c1] = computeGeometryFromDrop(dropRow, dropCol, dx, dy);

  // Validate bounds
  if (!isInside(grid, r0, c0)) return false;
  if (!isInside(grid, r1, c1)) return false;

  // Validate emptiness
  if (!isCellFree(grid, r0, c0)) return false;
  if (!isCellFree(grid, r1, c1)) return false;

  // Validate adjacency
  if (!areAdjacent(r0, c0, r1, c1)) return false;

  // Commit geometry
  setCells(domino, r0, c0, r1, c1);

  return true;
}


// ------------------------------------------------------------
// moveOnBoard(domino, grid, newR0, newC0)
// Move domino on board while preserving geometry.
// ------------------------------------------------------------
function moveOnBoard(domino, grid, newR0, newC0) {
  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

  const newR1 = newR0 + dr;
  const newC1 = newC0 + dc;

  // Validate bounds
  if (!isInside(grid, newR0, newC0)) return false;
  if (!isInside(grid, newR1, newC1)) return false;

  // Validate adjacency
  if (!areAdjacent(newR0, newC0, newR1, newC1)) return false;

  // Validate occupancy (allow self)
  const cellA = grid[newR0][newC0];
  const cellB = grid[newR1][newC1];

  if (cellA && cellA.dominoId !== domino.id) return false;
  if (cellB && cellB.dominoId !== domino.id) return false;

  // Commit geometry
  setCells(domino, newR0, newC0, newR1, newC1);

  return true;
}


// ------------------------------------------------------------
// returnToTray(domino)
// ------------------------------------------------------------
function returnToTray(domino) {
  clearBoardState(domino);
}


// ============================================================
// PUBLIC API
// ============================================================

// ------------------------------------------------------------
// placeDomino(domino, row, col, grid, dx, dy)
// dx,dy come from dragDrop.js (movement vector).
// ------------------------------------------------------------
export function placeDomino(domino, row, col, grid, dx, dy) {
  return placeFromTray(domino, grid, row, col, dx, dy);
}


// ------------------------------------------------------------
// moveDomino(domino, row, col, grid)
// row,col = new location for half0
// ------------------------------------------------------------
export function moveDomino(domino, row, col, grid) {
  return moveOnBoard(domino, grid, row, col);
}


// ------------------------------------------------------------
// removeDominoToTray(domino)
// ------------------------------------------------------------
export function removeDominoToTray(domino) {
  return returnToTray(domino);
}
