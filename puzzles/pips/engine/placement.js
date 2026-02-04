// ============================================================
// FILE: placement.js
// PURPOSE: Handles all board/tray placement logic.
// NOTES:
//   - Geometry-first model.
//   - Tray → Board preserves trayOrientation.
//   - Board → Tray resets trayOrientation to 0.
//   - Board rotation is geometry-only while rotating (no grid checks).
//   - When rotation mode completes, call commitRotation(domino, grid)
//     to validate and atomically apply the rotated geometry to the grid.
//   - Grid cells use canonical format: { dominoId, half }
// ============================================================


// ------------------------------------------------------------
// placeDomino(domino, row, col, grid, clickedHalf)
// PURPOSE:
//   - Place a domino from the tray onto the board.
//   - Orientation is derived from trayOrientation (0/90/180/270).
//   - clickedHalf determines which half anchors at (row, col).
// ------------------------------------------------------------
export function placeDomino(domino, row, col, grid, clickedHalf = 0) {

  const cameFromTray = (domino.row0 === null);

  // Compute geometry only if coming from tray
  if (cameFromTray) {
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

    // If it came from the tray, restore tray state explicitly
    if (cameFromTray) {
      domino.row0 = null;
      domino.col0 = null;
      domino.row1 = null;
      domino.col1 = null;
    }

    return false;
  }

  // Mark grid occupancy (canonical format)
  grid[domino.row0][domino.col0] = { dominoId: domino.id, half: 0 };
  grid[domino.row1][domino.col1] = { dominoId: domino.id, half: 1 };

  return true;
}


// ------------------------------------------------------------
// moveDomino(domino, row, col, grid)
// PURPOSE:
//   - Move a domino already on the board to a new location.
//   - Geometry-only: orientation stays the same.
// ------------------------------------------------------------
export function moveDomino(domino, row, col, grid) {

  // Clear old occupancy (only if those cells reference this domino)
  if (grid[domino.row0] && grid[domino.row0][domino.col0] && grid[domino.row0][domino.col0].dominoId === domino.id) {
    grid[domino.row0][domino.col0] = null;
  }
  if (grid[domino.row1] && grid[domino.row1][domino.col1] && grid[domino.row1][domino.col1].dominoId === domino.id) {
    grid[domino.row1][domino.col1] = null;
  }

  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

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
    grid[domino.row0][domino.col0] = { dominoId: domino.id, half: 0 };
    grid[domino.row1][domino.col1] = { dominoId: domino.id, half: 1 };

    return false;
  }

  // Mark new occupancy
  grid[domino.row0][domino.col0] = { dominoId: domino.id, half: 0 };
  grid[domino.row1][domino.col1] = { dominoId: domino.id, half: 1 };

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

  if (domino.row0 !== null) {
    if (grid[domino.row0] && grid[domino.row0][domino.col0] && grid[domino.row0][domino.col0].dominoId === domino.id) {
      grid[domino.row0][domino.col0] = null;
    }
    if (grid[domino.row1] && grid[domino.row1][domino.col1] && grid[domino.row1][domino.col1].dominoId === domino.id) {
      grid[domino.row1][domino.col1] = null;
    }
  }

  domino.row0 = null;
  domino.col0 = null;
  domino.row1 = null;
  domino.col1 = null;

  domino.trayOrientation = 0;
}


// ------------------------------------------------------------
// isPlacementValid(domino, grid)
// PURPOSE:
//   - Ensure both cells are in bounds and unoccupied.
// ------------------------------------------------------------
export function isPlacementValid(domino, grid) {
  const r0 = domino.row0;
  const c0 = domino.col0;
  const r1 = domino.row1;
  const c1 = domino.col1;

  // Bounds check
  if (!grid[r0] || typeof grid[r0][c0] === "undefined") return false;
  if (!grid[r1] || typeof grid[r1][c1] === "undefined") return false;

  // Occupancy check
  if (grid[r0][c0] !== null) return false;
  if (grid[r1][c1] !== null) return false;

  return true;
}


// ------------------------------------------------------------
// rotateDominoOnBoard(domino, pivotHalf)
// PURPOSE:
//   - Rotate 90° clockwise around the clicked half.
//   - Geometry-only: does NOT touch grid or validate.
//   - Use this during rotation mode so the user can rotate freely.
// ------------------------------------------------------------
export function rotateDominoOnBoard(domino, pivotHalf) {
  if (domino.row0 === null) return;

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

  const newDr = -dc;
  const newDc = dr;

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


// ------------------------------------------------------------
// commitRotation(domino, grid)
// PURPOSE:
//   - After geometry-only rotation(s) are done, validate and atomically
//     apply the domino's current geometry to the grid.
//   - If the commit fails (out of bounds or occupied), restore previous
//     geometry and grid occupancy and return false.
//   - Returns true on success.
// USAGE:
//   - Call this when rotation mode completes (user places domino or cancels).
// ------------------------------------------------------------
export function commitRotation(domino, grid) {
  // Domino must be on board to commit
  if (domino.row0 === null) return false;

  // Capture previous geometry snapshot if not already present
  if (typeof domino._prevRow0 === 'undefined') {
    domino._prevRow0 = domino.row0;
    domino._prevCol0 = domino.col0;
    domino._prevRow1 = domino.row1;
    domino._prevCol1 = domino.col1;
  }

  const prevRow0 = domino._prevRow0;
  const prevCol0 = domino._prevCol0;
  const prevRow1 = domino._prevRow1;
  const prevCol1 = domino._prevCol1;

  // Proposed new coordinates are the current domino geometry
  const newRow0 = domino.row0;
  const newCol0 = domino.col0;
  const newRow1 = domino.row1;
  const newCol1 = domino.col1;

  const rows = grid.length;
  const cols = grid[0].length;

  // Bounds check
  if (newRow0 < 0 || newRow0 >= rows || newCol0 < 0 || newCol0 >= cols) {
    // restore snapshot and return false
    domino.row0 = prevRow0;
    domino.col0 = prevCol0;
    domino.row1 = prevRow1;
    domino.col1 = prevCol1;
    cleanupPrevSnapshot(domino);
    return false;
  }
  if (newRow1 < 0 || newRow1 >= rows || newCol1 < 0 || newCol1 >= cols) {
    domino.row0 = prevRow0;
    domino.col0 = prevCol0;
    domino.row1 = prevRow1;
    domino.col1 = prevCol1;
    cleanupPrevSnapshot(domino);
    return false;
  }

  // Helper: cell is free if null OR already occupied by this domino
  const cellFreeOrSelf = (r, c) => {
    const cell = grid[r][c];
    return cell === null || (cell && cell.dominoId === domino.id);
  };

  if (!cellFreeOrSelf(newRow0, newCol0) || !cellFreeOrSelf(newRow1, newCol1)) {
    // restore geometry
    domino.row0 = prevRow0;
    domino.col0 = prevCol0;
    domino.row1 = prevRow1;
    domino.col1 = prevCol1;
    cleanupPrevSnapshot(domino);
    return false;
  }

  // Clear current occupancy (only clear cells that reference this domino)
  if (grid[prevRow0] && grid[prevRow0][prevCol0] && grid[prevRow0][prevCol0].dominoId === domino.id) {
    grid[prevRow0][prevCol0] = null;
  }
  if (grid[prevRow1] && grid[prevRow1][prevCol1] && grid[prevRow1][prevCol1].dominoId === domino.id) {
    grid[prevRow1][prevCol1] = null;
  }

  // Write new occupancy
  grid[newRow0][newCol0] = { dominoId: domino.id, half: 0 };
  grid[newRow1][newCol1] = { dominoId: domino.id, half: 1 };

  // Clear snapshot metadata
  cleanupPrevSnapshot(domino);

  return true;
}

function cleanupPrevSnapshot(domino) {
  delete domino._prevRow0;
  delete domino._prevCol0;
  delete domino._prevRow1;
  delete domino._prevCol1;
}


// ------------------------------------------------------------
// rotateDominoInTray(domino)
// PURPOSE:
//   - Rotate a tray domino 90° clockwise visually.
// ------------------------------------------------------------
export function rotateDominoInTray(domino) {
  if (domino.row0 !== null) return;

  const oldAngle = domino.trayOrientation;
  domino.trayOrientation = (domino.trayOrientation + 90 + 360) % 360;

  console.log(
    `%cTRAY ROTATE (MODEL)`,
    "color: purple; font-weight: bold;",
    `id=${domino.id}`,
    `old=${oldAngle}`,
    `new=${domino.trayOrientation}`
  );
}
