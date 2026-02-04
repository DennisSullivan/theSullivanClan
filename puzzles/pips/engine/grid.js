// ============================================================
// FILE: grid.js
// PURPOSE: Implements the canonical grid occupancy system.
// NOTES:
//   - The grid stores only { dominoId, half } or null.
//   - No orientation flags, no DOM logic.
//   - All adjacency and legality checks are pure functions.
// ============================================================


// ------------------------------------------------------------
// createGrid(width, height)
// Creates an empty grid of the given size.
// RETURNS:
//   2D array: grid[row][col] = null
// ------------------------------------------------------------
export function createGrid(width, height) {
  const grid = [];
  for (let r = 0; r < height; r++) {
    const row = new Array(width).fill(null);
    grid.push(row);
  }
  return grid;
}


// ------------------------------------------------------------
// isInside(grid, row, col)
// Returns true if (row,col) is within the grid bounds.
// ------------------------------------------------------------
export function isInside(grid, row, col) {
  return (
    row >= 0 &&
    col >= 0 &&
    row < grid.length &&
    col < grid[0].length
  );
}


// ------------------------------------------------------------
// getCell(grid, row, col)
// Returns the cell contents or null if out of bounds.
// ------------------------------------------------------------
export function getCell(grid, row, col) {
  if (!isInside(grid, row, col)) return null;
  return grid[row][col];
}


// ------------------------------------------------------------
// setCell(grid, row, col, dominoId, half)
// Places a half of a domino into a cell.
// INPUTS:
//   dominoId - string "XY"
//   half     - 0 or 1
// NOTES:
//   - Does NOT validate adjacency or legality.
//   - Engine handles those checks.
// ------------------------------------------------------------
export function setCell(grid, row, col, dominoId, half) {
  grid[row][col] = { dominoId, half };
}


// ------------------------------------------------------------
// clearCell(grid, row, col)
// Removes any domino half from the cell.
// ------------------------------------------------------------
export function clearCell(grid, row, col) {
  if (isInside(grid, row, col)) {
    grid[row][col] = null;
  }
}


// ------------------------------------------------------------
// placeDomino(grid, domino)
// Writes both halves of a domino into the grid.
// INPUTS:
//   domino - canonical Domino object with row0/col0 and row1/col1
// NOTES:
//   - Does NOT validate legality.
//   - Assumes coordinates are already correct.
// ------------------------------------------------------------
export function placeDomino(grid, domino) {
  setCell(grid, domino.row0, domino.col0, domino.id, 0);
  setCell(grid, domino.row1, domino.col1, domino.id, 1);
}


// ------------------------------------------------------------
// removeDomino(grid, domino)
// Clears both halves of a domino from the grid.
// ------------------------------------------------------------
export function removeDomino(grid, domino) {
  clearCell(grid, domino.row0, domino.col0);
  clearCell(grid, domino.row1, domino.col1);
}


// ------------------------------------------------------------
// isCellFree(grid, row, col)
// Returns true if the cell is inside the grid and empty.
// ------------------------------------------------------------
export function isCellFree(grid, row, col) {
  return isInside(grid, row, col) && grid[row][col] === null;
}


// ------------------------------------------------------------
// areAdjacent(r0,c0, r1,c1)
// Returns true if the two cells are orthogonally adjacent.
// ------------------------------------------------------------
export function areAdjacent(r0, c0, r1, c1) {
  const dr = Math.abs(r0 - r1);
  const dc = Math.abs(c0 - c1);
  return (dr + dc === 1); // Manhattan distance = 1
}


// ------------------------------------------------------------
// canPlaceDomino(grid, domino, r0, c0, r1, c1)
// Checks if a domino can be placed at the given coordinates.
// RETURNS:
//   true/false
// NOTES:
//   - Validates bounds
//   - Validates adjacency
//   - Validates emptiness
// ------------------------------------------------------------
export function canPlaceDomino(grid, domino, r0, c0, r1, c1) {
  // Must be inside grid
  if (!isInside(grid, r0, c0)) return false;
  if (!isInside(grid, r1, c1)) return false;

  // Must be adjacent
  if (!areAdjacent(r0, c0, r1, c1)) return false;

  // Both cells must be free
  if (!isCellFree(grid, r0, c0)) return false;
  if (!isCellFree(grid, r1, c1)) return false;

  return true;
}


// ------------------------------------------------------------
// findDominoCells(grid, dominoId)
// Returns the two cells occupied by a domino.
// RETURNS:
//   [ {row,col,half}, {row,col,half} ] or []
// NOTES:
//   - Useful for sync checking and debugging.
// ------------------------------------------------------------
export function findDominoCells(grid, dominoId) {
  const result = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const cell = grid[r][c];
      if (cell && cell.dominoId === dominoId) {
        result.push({ row: r, col: c, half: cell.half });
      }
    }
  }
  return result;
}

