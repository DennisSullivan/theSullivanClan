// FILE: engine/placement.js
// PURPOSE: Pure, deterministic engine-level placement and rotation.
// NOTES:
//   - UI computes exact (r0,c0,r1,c1) using clone geometry.
//   - Engine performs ONLY atomic commits, no guessing.
//   - No clickedHalf, no heuristics, no orientation inference.
//   - This file is stable and model-first.

import { isInside } from "./grid.js";

/* ------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------ */

function toIdStr(id) {
  return String(id);
}

function cleanupPrevSnapshot(domino) {
  delete domino._prevRow0;
  delete domino._prevCol0;
  delete domino._prevRow1;
  delete domino._prevCol1;
}

/* ------------------------------------------------------------
 * Rotation geometry (model-only)
 * ------------------------------------------------------------ */

export function rotateDominoOnBoard(domino, pivotHalf = 0) {
  if (!domino || domino.row0 === null) return;

  // Snapshot original geometry if not already captured
  if (typeof domino._prevRow0 === "undefined") {
    domino._prevRow0 = domino.row0;
    domino._prevCol0 = domino.col0;
    domino._prevRow1 = domino.row1;
    domino._prevCol1 = domino.col1;
  }

  let pivotRow, pivotCol, otherRow, otherCol;
  if (pivotHalf === 0) {
    pivotRow = domino.row0; pivotCol = domino.col0;
    otherRow = domino.row1; otherCol = domino.col1;
  } else {
    pivotRow = domino.row1; pivotCol = domino.col1;
    otherRow = domino.row0; otherCol = domino.col0;
  }

  const dr = otherRow - pivotRow;
  const dc = otherCol - pivotCol;

  // 90° clockwise: (dr, dc) → (dc, -dr)
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

/* ------------------------------------------------------------
 * Atomic placement API
 * ------------------------------------------------------------ */

/**
 * placeDominoAnchor(domino, r0, c0, r1, c1, grid)
 * PURPOSE:
 *   Commit a domino to exactly two target cells.
 *   UI must compute these cells from clone geometry.
 *
 * RETURNS:
 *   true on success, false on failure (no partial writes).
 */
export function placeDominoAnchor(domino, r0, c0, r1, c1, grid) {
  if (!domino) return false;

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const idStr = toIdStr(domino.id);

  // Validate numeric
  const isNum = (n) => typeof n === "number" && !Number.isNaN(n);
  if (![r0, c0, r1, c1].every(isNum)) return false;

  // Bounds
  if (!isInside(grid, r0, c0)) return false;
  if (!isInside(grid, r1, c1)) return false;

  // Distinct cells
  if (r0 === r1 && c0 === c1) return false;

  // Occupancy: allow empty or same domino
  const cell0 = grid[r0][c0];
  const cell1 = grid[r1][c1];
  if (cell0 && String(cell0.dominoId) !== idStr) return false;
  if (cell1 && String(cell1.dominoId) !== idStr) return false;

  // Collect old cells
  const oldCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const g = grid[r][c];
      if (g && String(g.dominoId) === idStr) {
        oldCells.push({ r, c });
      }
    }
  }

  // Atomic clear
  for (const oc of oldCells) {
    grid[oc.r][oc.c] = null;
  }

  // Atomic write
  grid[r0][c0] = { dominoId: idStr, half: 0 };
  grid[r1][c1] = { dominoId: idStr, half: 1 };

  // Update model geometry
  domino.row0 = r0; domino.col0 = c0;
  domino.row1 = r1; domino.col1 = c1;

  cleanupPrevSnapshot(domino);
  return true;
}

/* ------------------------------------------------------------
 * Rotation commit
 * ------------------------------------------------------------ */

export function commitRotation(domino, grid) {
  if (!domino) return false;

  // If geometry null → remove from grid
  if (domino.row0 == null || domino.row1 == null) {
    const idStr = toIdStr(domino.id);
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        const cell = grid[r][c];
        if (cell && String(cell.dominoId) === idStr) {
          grid[r][c] = null;
        }
      }
    }
    domino.row0 = domino.col0 = domino.row1 = domino.col1 = null;
    cleanupPrevSnapshot(domino);
    return true;
  }

  // Validate numeric
  const { row0, col0, row1, col1 } = domino;
  const isNum = (n) => typeof n === "number" && !Number.isNaN(n);
  if (![row0, col0, row1, col1].every(isNum)) return false;

  return placeDominoAnchor(domino, row0, col0, row1, col1, grid);
}

/* ------------------------------------------------------------
 * Removal helper
 * ------------------------------------------------------------ */

export function removeDominoToTray(domino, grid) {
  if (!domino) return;

  const idStr = toIdStr(domino.id);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const cell = grid[r][c];
      if (cell && String(cell.dominoId) === idStr) {
        grid[r][c] = null;
      }
    }
  }

  domino.row0 = domino.col0 = domino.row1 = domino.col1 = null;
  cleanupPrevSnapshot(domino);
}
