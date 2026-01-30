// ============================================================
// FILE: placement.js
// PURPOSE: Implements all movement rules for dominos:
//          - tray → board placement
//          - board → tray removal
//          - coordinate assignment
//          - pivotHalf initialization
// NOTES:
//   - No orientation flags.
//   - No DOM logic.
//   - No A/B model.
//   - trayOrientation controls tray-only visuals.
// ============================================================

import { isInside, isCellFree, areAdjacent } from "./grid.js";
import { clearBoardState, setCells } from "./domino.js";


// ------------------------------------------------------------
// placeFromTray(domino, grid, dropRow, dropCol, direction)
// Places a domino from the tray onto the board.
// INPUTS:
//   domino    - canonical Domino object (must be in tray)
//   grid      - occupancy map
//   dropRow   - target row for the pivot half
//   dropCol   - target col for the pivot half
//   direction - "up" | "down" | "left" | "right"
// RETURNS:
//   true if placement succeeded, false otherwise
// NOTES:
//   - pivotHalf is always 0 on initial placement.
//   - trayOrientation determines initial orientation only.
//   - direction determines where half1 goes.
// ------------------------------------------------------------
export function placeFromTray(domino, grid, dropRow, dropCol, direction) {
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
// Moves a domino already on the board to new coordinates.
// INPUTS:
//   domino - canonical Domino object
//   grid   - occupancy map
//   newR0,newC0,newR1,newC1 - new coordinates
// RETURNS:
//   true if move succeeded, false otherwise
// NOTES:
//   - Does NOT change pivotHalf.
//   - Used for drag repositioning on board.
// ------------------------------------------------------------
export function moveOnBoard(domino, grid, newR0, newC0, newR1, newC1) {
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
// Removes a domino from the board and returns it to the tray.
// INPUTS:
//   domino - canonical Domino object
// NOTES:
//   - Coordinates cleared
//   - pivotHalf cleared
//   - trayOrientation preserved
//   - Home slot is handled by trayRenderer, not here
// ------------------------------------------------------------
export function returnToTray(domino) {
  clearBoardState(domino);
}


// ------------------------------------------------------------
// getDropDirectionFromDrag(dx, dy)
// Converts drag vector into a cardinal direction.
// INPUTS:
//   dx, dy - drag deltas
// RETURNS:
//   "up" | "down" | "left" | "right"
// NOTES:
//   - UI layer may use this to choose placement direction.
// ------------------------------------------------------------
export function getDropDirectionFromDrag(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  } else {
    return dy > 0 ? "down" : "up";
  }
}

