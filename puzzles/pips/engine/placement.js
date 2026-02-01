// ============================================================
// FILE: placement.js
// PURPOSE: Handles all board/tray placement logic.
// NOTES:
//   - Geometry-first model.
//   - Tray → Board preserves trayOrientation.
//   - Board → Tray resets trayOrientation to 0.
//   - Board rotation is geometry-only (no grid checks).
// ============================================================


// ------------------------------------------------------------
// placeDomino(domino, row, col, grid, clickedHalf)
// PURPOSE:
//   - Place a domino from the tray onto the board.
//   - Orientation is derived from trayOrientation (0/90/180/270).
//   - clickedHalf determines which half anchors at (row, col).
// ------------------------------------------------------------
export function placeDomino(domino, row, col, grid, clickedHalf = 0) {

  // Only apply orientation logic if the domino is coming from the tray
  if (domino.row0 === null) {
    const angle = domino.trayOrientation % 360;

    let r0, c0, r1, c1;

    if (angle === 0) {
      // Horizontal L→R
      if (clickedHalf === 0) {
        r0 = row;     c0 = col;
        r1 = row;     c1 = col + 1;
      } else {
        r0 = row;     c0 = col - 1;
        r1 = row;     c1 = col;
      }
    }

    else if (angle === 90) {
      // Vertical T→B
      if (clickedHalf === 0) {
        r0 = row;     c0 = col;
        r1 = row + 1; c1 = col;
      } else {
        r0 = row - 1; c0 = col;
        r1 = row;     c1 = col;
      }
    }

    else if (angle === 180) {
      // Horizontal R→L
      if (clickedHalf === 0) {
        r0 = row;     c0 = col + 1;
        r1 = row;     c1 = col;
      } else {
        r0 = row;     c0 = col;
        r1 = row;     c1 = col - 1;
      }
    }

    else if (angle === 270) {
      // Vertical B→T
      if (clickedHalf === 0) {
        r0 = row + 1; c0 = col;
        r1 = row;     c1 = col;
      } else {
        r0 = row;     c0 = col;
        r1 = row + 1; c1 = col;
      }
    }

    domino.row0 = r0;
    domino.col0 = c0;
    domino.row1 = r1;
    domino.col1 = c1;
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
  const oldRow0 = domino.row0;
  const oldCol0 = domino.col0;
  const oldRow1 = domino.row1;
  const oldCol1 = domino.col1;

  domino.row0 = row;
  domino.col0 = col;
  domino.row1 = row + dr;
  domino.col1 = col + dc;

  // Validate
  if (!isPlacementValid(domino, grid)) {
    // Restore old geometry
    domino.row0 = oldRow0;
    domino.col0 = oldCol0;
    domino.row1 = oldRow1;
    domino.col1 = oldCol1;

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
  if (!grid[r0] || typeof grid[r0][c0] === "undefined") return false;
  if (!grid[r1] || typeof grid[r1][c1] === "undefined") return false;

  // Occupancy check
  if (!isCellFree(grid, r0, c0)) return false;
  if (!isCellFree(grid, r1, c1)) return false;

  return true;
}


// ------------------------------------------------------------
// isCellFree(grid, row, col)
// PURPOSE:
//   - A cell is free if null.
// ------------------------------------------------------------
function isCellFree(grid, row, col) {
  return grid[row][col] === null;
}


// ------------------------------------------------------------
// rotateDominoOnBoard(domino, pivotHalf)
// PURPOSE:
//   - Rotate 90° clockwise around the clicked half.
//   - Geometry-only: does NOT touch grid or validate.
//   - Constraints are enforced later on placement/move.
// ------------------------------------------------------------
export function rotateDominoOnBoard(domino, pivotHalf) {
  if (domino.row0 === null) return; // not on board

  // Identify pivot and other half
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

  // 90° clockwise: (dr, dc) -> (-dc, dr)
  const newDr = -dc;
  const newDc = dr;

  const newOtherRow = pivotRow + newDr;
  const newOtherCol = pivotCol + newDc;

  // Reassign geometry, preserving half0/half1 identity
  if (pivotHalf === 0) {
    domino.row0 = pivotRow;
    domino.col0 = pivotCol;
    domino.row1 = newOtherRow;
    domino.col1 = newOtherCol;
  } else {
    domino.row1 = pivotRow;
    domino.col1 = pivotCol;
    domino.row0 = newOtherRow;
    domino.col0 = newOtherCol;
  }
}


// ------------------------------------------------------------
// rotateDominoInTray(domino)
// PURPOSE:
//   - Rotate a tray domino 90° clockwise visually.
//   - Uses trayOrientation only; no geometry.
// ------------------------------------------------------------
export function rotateDominoInTray(domino) {
  if (domino.row0 !== null) return; // only tray dominos

  domino.trayOrientation = (domino.trayOrientation + 90) % 360;
}
