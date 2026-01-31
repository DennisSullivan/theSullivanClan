// ============================================================
// FILE: placement.js
// PURPOSE: Handles all board/tray placement logic.
// NOTES:
//   - Geometry-first model.
//   - Tray → Board preserves trayOrientation.
//   - Board → Tray resets trayOrientation to 0.
//   - Board rotation (future) will modify geometry only.
// ============================================================


// ------------------------------------------------------------
// placeDomino(domino, row, col, grid)
// PURPOSE:
//   - Place a domino from the tray onto the board.
//   - Orientation is derived from trayOrientation (0/90/180/270).
//   - No gesture-based orientation.
// ------------------------------------------------------------
export function placeDomino(domino, row, col, grid) {

  // Only apply orientation logic if the domino is coming from the tray
  if (domino.row0 === null) {
    const angle = domino.trayOrientation % 360;

    if (angle === 0) {
      // Horizontal L→R
      domino.row0 = row;
      domino.col0 = col;
      domino.row1 = row;
      domino.col1 = col + 1;
    }

    else if (angle === 90) {
      // Vertical T→B
      domino.row0 = row;
      domino.col0 = col;
      domino.row1 = row + 1;
      domino.col1 = col;
    }

    else if (angle === 180) {
      // Horizontal R→L
      domino.row0 = row;
      domino.col0 = col + 1;
      domino.row1 = row;
      domino.col1 = col;
    }

    else if (angle === 270) {
      // Vertical B→T
      domino.row0 = row + 1;
      domino.col0 = col;
      domino.row1 = row;
      domino.col1 = col;
    }
  }

  // Validate placement
  if (!isPlacementValid(domino, grid)) {
    domino.row0 = domino.col0 = domino.row1 = domino.col1 = null;
    return false;
  }

  // Mark grid occupancy
  grid[domino.row0][domino.col0] = domino.id;
  grid[domino.row1][domino.col1] = domino.id;

  return true;
}


// ------------------------------------------------------------
// moveDomino(domino, row, col, grid)
// PURPOSE:
//   - Move a domino already on the board to a new location.
//   - Geometry-only: orientation stays the same.
// ------------------------------------------------------------
export function moveDomino(domino, row, col, grid) {

  // Clear old occupancy
  grid[domino.row0][domino.col0] = null;
  grid[domino.row1][domino.col1] = null;

  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

  // Apply same geometry at new anchor
  domino.row0 = row;
  domino.col0 = col;
  domino.row1 = row + dr;
  domino.col1 = col + dc;

  // Validate
  if (!isPlacementValid(domino, grid)) {
    // Restore old geometry
    domino.row0 = row - dr;
    domino.col0 = col - dc;
    domino.row1 = row;
    domino.col1 = col;

    // Restore occupancy
    grid[domino.row0][domino.col0] = domino.id;
    grid[domino.row1][domino.col1] = domino.id;

    return false;
  }

  // Mark new occupancy
  grid[domino.row0][domino.col0] = domino.id;
  grid[domino.row1][domino.col1] = domino.id;

  return true;
}


// ------------------------------------------------------------
// removeDominoToTray(domino, grid)
// PURPOSE:
//   - Remove a domino from the board.
//   - Reset geometry.
//   - Reset trayOrientation to 0 (canonical unrotated state).
// ------------------------------------------------------------
export function removeDominoToTray(domino, grid) {

  // Clear grid occupancy if the domino was on the board
  if (domino.row0 !== null) {
    grid[domino.row0][domino.col0] = null;
    grid[domino.row1][domino.col1] = null;
  }

  // Reset geometry
  domino.row0 = null;
  domino.col0 = null;
  domino.row1 = null;
  domino.col1 = null;

  // Reset tray orientation to canonical 0°
  domino.trayOrientation = 0;
}


// ------------------------------------------------------------
// isPlacementValid(domino, grid)
// PURPOSE:
//   - Ensure both cells are in bounds and unoccupied.
// ------------------------------------------------------------
function isPlacementValid(domino, grid) {
  const r0 = domino.row0;
  const c0 = domino.col0;
  const r1 = domino.row1;
  const c1 = domino.col1;

  // Bounds check
  if (!grid[r0] || !grid[r0][c0]) return false;
  if (!grid[r1] || !grid[r1][c1]) return false;

  // Occupancy check
  if (!isCellFree(grid, r0, c0)) return false;
  if (!isCellFree(grid, r1, c1)) return false;

  return true;
}


// ------------------------------------------------------------
// isCellFree(grid, row, col)
// PURPOSE:
//   - A cell is free if null OR already occupied by this domino.
// ------------------------------------------------------------
function isCellFree(grid, row, col) {
  return grid[row][col] === null;
}
