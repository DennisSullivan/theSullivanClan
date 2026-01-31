// ============================================================
// FILE: placement.js
// PURPOSE: Geometry-only domino placement and movement.
// ============================================================

import { isInside, isCellFree, areAdjacent } from "./grid.js";
import { clearBoardState, setCells } from "./domino.js";

function computeGeometryFromDrop(row, col, dx, dy) {
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  if (horizontal) {
    if (dx >= 0) {
      return [row, col, row, col + 1];
    } else {
      return [row, col - 1, row, col];
    }
  } else {
    if (dy >= 0) {
      return [row, col, row + 1, col];
    } else {
      return [row - 1, col, row, col];
    }
  }
}

function placeFromTray(domino, grid, dropRow, dropCol, dx, dy) {
  const [r0, c0, r1, c1] = computeGeometryFromDrop(dropRow, dropCol, dx, dy);

  if (!isInside(grid, r0, c0)) return false;
  if (!isInside(grid, r1, c1)) return false;

  if (!isCellFree(grid, r0, c0)) return false;
  if (!isCellFree(grid, r1, c1)) return false;

  if (!areAdjacent(r0, c0, r1, c1)) return false;

  setCells(domino, r0, c0, r1, c1, grid);
  return true;
}

function moveOnBoard(domino, grid, newR0, newC0) {
  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

  const newR1 = newR0 + dr;
  const newC1 = newC0 + dc;

  if (!isInside(grid, newR0, newC0)) return false;
  if (!isInside(grid, newR1, newC1)) return false;

  if (!areAdjacent(newR0, newC0, newR1, newC1)) return false;

  const cellA = grid[newR0][newC0];
  const cellB = grid[newR1][newC1];

  if (cellA && cellA.dominoId !== domino.id) return false;
  if (cellB && cellB.dominoId !== domino.id) return false;

  setCells(domino, newR0, newC0, newR1, newC1, grid);
  return true;
}

function returnToTray(domino, grid) {
  clearBoardState(domino, grid);
}

export function placeDomino(domino, row, col, grid, dx, dy) {
  return placeFromTray(domino, grid, row, col, dx, dy);
}

export function moveDomino(domino, row, col, grid) {
  return moveOnBoard(domino, grid, row, col);
}

export function removeDominoToTray(domino, grid) {
  return returnToTray(domino, grid);
}
