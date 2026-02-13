// FILE: engine/placement.js
// PURPOSE: Minimal, deterministic placement and rotation helpers.
// NOTES: Engine-level functions only. UI must compute final integer anchors
//       (r0,c0,r1,c1) using pixel overlap rules and call placeDominoAnchor.
//       This module performs atomic grid commits and rotation geometry.

import { isInside } from "./grid.js";

/* ---------- Helpers ---------- */

function toIdStr(id) {
  return String(id);
}

export function resolveDomino(dominos, id) {
  if (!dominos) return undefined;
  if (dominos instanceof Map) {
    if (dominos.has(id)) return dominos.get(id);
    const s = String(id);
    if (dominos.has(s)) return dominos.get(s);
    const n = Number(id);
    if (!Number.isNaN(n) && dominos.has(n)) return dominos.get(n);
    return undefined;
  }
  const sId = String(id);
  return dominos.find(d => String(d.id) === sId);
}

export function idsEqual(a, b) {
  return String(a) === String(b);
}

/* ---------- Rotation geometry (model-only) ---------- */

export function rotateDominoOnBoard(domino, pivotHalf = 0) {
  if (!domino || domino.row0 === null) return;

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

  // 90° clockwise: (dr, dc) -> (dc, -dr)
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

export function rotateDominoInTray(domino) {
  if (!domino) return;
  const old = typeof domino.trayOrientation === "number" ? domino.trayOrientation : 0;
  domino.trayOrientation = (old + 90) % 360;
}

/* ---------- Internal grid helpers ---------- */

function findOldCells(domino, grid) {
  const idStr = toIdStr(domino.id);
  const rows = grid.length;
  const cols = grid[0] ? grid[0].length : 0;
  const old = [];

  // Prefer explicit snapshot if present
  if (typeof domino._prevRow0 !== "undefined" &&
      typeof domino._prevCol0 !== "undefined" &&
      typeof domino._prevRow1 !== "undefined" &&
      typeof domino._prevCol1 !== "undefined") {
    const r0 = domino._prevRow0, c0 = domino._prevCol0, r1 = domino._prevRow1, c1 = domino._prevCol1;
    if (typeof r0 === "number" && typeof c0 === "number") old.push({ r: r0, c: c0 });
    if (typeof r1 === "number" && typeof c1 === "number") old.push({ r: r1, c: c1 });
    return old;
  }

  // Fallback: scan grid for any cells referencing this domino id
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell && String(cell.dominoId) === idStr) old.push({ r, c });
    }
  }
  return old;
}

function cleanupPrevSnapshot(domino) {
  delete domino._prevRow0;
  delete domino._prevCol0;
  delete domino._prevRow1;
  delete domino._prevCol1;
}

/* ---------- Atomic placement API (engine) ---------- */

/**
 * placeDominoAnchor(domino, r0, c0, r1, c1, grid)
 * Purpose: Atomically commit a domino to the two explicit target cells.
 * Precondition: caller has determined the intended anchor (UI-level).
 * Returns: true on success, false on failure (no partial writes).
 */
export function placeDominoAnchor(domino, r0, c0, r1, c1, grid) {
  if (!domino) return false;

  const rows = grid.length;
  const cols = grid[0] ? grid[0].length : 0;
  const idStr = toIdStr(domino.id);

  // Basic numeric validation
  function isNum(n) { return typeof n === "number" && !Number.isNaN(n); }
  if (![r0,c0,r1,c1].every(isNum)) return false;

  // Bounds check
  if (r0 < 0 || r0 >= rows || c0 < 0 || c0 >= cols) return false;
  if (r1 < 0 || r1 >= rows || c1 < 0 || c1 >= cols) return false;

  // Distinct cells required
  if (r0 === r1 && c0 === c1) return false;

  // Occupancy check: allow cells already occupied by this domino (move) or null
  const cell0 = grid[r0][c0];
  const cell1 = grid[r1][c1];
  if (cell0 && String(cell0.dominoId) !== idStr) return false;
  if (cell1 && String(cell1.dominoId) !== idStr) return false;

  // Determine old cells to clear (snapshot or scan)
  const oldCells = findOldCells(domino, grid);

  // Perform atomic swap: clear old cells, then write new cells
  // Clearing only cells that still reference this domino
  for (const oc of oldCells) {
    if (oc.r >= 0 && oc.r < rows && oc.c >= 0 && oc.c < cols) {
      const cell = grid[oc.r][oc.c];
      if (cell && String(cell.dominoId) === idStr) {
        grid[oc.r][oc.c] = null;
      }
    }
  }

  // Write new occupancy
  grid[r0][c0] = { dominoId: idStr, half: 0 };
  grid[r1][c1] = { dominoId: idStr, half: 1 };

  // Update domino geometry
  domino.row0 = r0; domino.col0 = c0;
  domino.row1 = r1; domino.col1 = c1;

  // Cleanup snapshot metadata if present
  cleanupPrevSnapshot(domino);

  return true;
}

/**
 * isPlacementValid(domino, grid)
 * Purpose: Quick engine-level validator for current integer geometry.
 * Returns true if both halves are inside and either empty or already owned by this domino.
 */
export function isPlacementValid(domino, grid) {
  if (!domino) return false;
  const r0 = domino.row0, c0 = domino.col0, r1 = domino.row1, c1 = domino.col1;
  if (!isInside(grid, r0, c0) || !isInside(grid, r1, c1)) return false;
  const idStr = toIdStr(domino.id);
  const cell0 = grid[r0][c0];
  const cell1 = grid[r1][c1];
  if (cell0 !== null && !(cell0 && String(cell0.dominoId) === idStr)) return false;
  if (cell1 !== null && !(cell1 && String(cell1.dominoId) === idStr)) return false;
  if (r0 === r1 && c0 === c1) return false;
  return true;
}

/* ---------- Rotation commit (uses same atomic semantics) ---------- */

/**
 * commitRotation(domino, grid)
 * Purpose: Commit the domino's current geometry (after rotateDominoOnBoard) into the grid.
 * Returns true on success, false on failure (no partial writes).
 */
export function commitRotation(domino, grid) {
  // If domino is being returned to tray (row0 null), clear old cells and set tray geometry
  if (!domino) return false;

  // If geometry is null => remove from grid
  if (domino.row0 === null || domino.row0 === undefined) {
    // Clear any old cells referencing this domino
    const oldCells = findOldCells(domino, grid);
    for (const oc of oldCells) {
      if (oc.r >= 0 && oc.r < grid.length && oc.c >= 0 && oc.c < grid[0].length) {
        const cell = grid[oc.r][oc.c];
        if (cell && String(cell.dominoId) === toIdStr(domino.id)) grid[oc.r][oc.c] = null;
      }
    }
    // Reset geometry
    domino.row0 = null; domino.col0 = null;
    domino.row1 = null; domino.col1 = null;
    cleanupPrevSnapshot(domino);
    return true;
  }

  // Otherwise, validate numeric geometry and occupancy
  const r0 = domino.row0, c0 = domino.col0, r1 = domino.row1, c1 = domino.col1;
  if (![r0,c0,r1,c1].every(n => typeof n === "number" && !Number.isNaN(n))) return false;

  // Use placeDominoAnchor semantics to commit atomically
  return placeDominoAnchor(domino, r0, c0, r1, c1, grid);
}

/* ---------- Removal helper ---------- */

export function removeDominoToTray(domino, grid) {
  if (!domino) return;
  // Clear any grid references
  const oldCells = findOldCells(domino, grid);
  for (const oc of oldCells) {
    if (oc.r >= 0 && oc.r < grid.length && oc.c >= 0 && oc.c < grid[0].length) {
      const cell = grid[oc.r][oc.c];
      if (cell && String(cell.dominoId) === toIdStr(domino.id)) grid[oc.r][oc.c] = null;
    }
  }
  // Reset geometry to tray
  domino.row0 = null; domino.col0 = null;
  domino.row1 = null; domino.col1 = null;
  cleanupPrevSnapshot(domino);
}

/* ---------- Deprecated convenience (UI-only) ---------- */

/**
 * placeDomino (deprecated engine convenience)
 * NOTE: This function contains UI heuristics and is provided only for backward compatibility.
 * UI should compute anchors and call placeDominoAnchor instead.
 */
export function placeDomino(domino, row, col, grid, clickedHalf = 0) {
  // Keep a minimal fallback: try the four orthogonal anchors with clickedHalf semantics,
  // but do not clear grid until a candidate is chosen. This is a convenience wrapper only.
  const rows = grid.length;
  const cols = grid[0] ? grid[0].length : 0;
  const inside = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols;

  const candidates = [];
  if (clickedHalf === 0) {
    candidates.push([row, col,     row, col + 1]); // right
    candidates.push([row, col,     row + 1, col]); // down
    candidates.push([row, col,     row, col - 1]); // left
    candidates.push([row, col,     row - 1, col]); // up
  } else {
    // Keep a neutral order but this is UI-level behavior; prefer caller to compute anchor.
    candidates.push([row - 1, col, row, col]);     // above
    candidates.push([row, col - 1, row, col]);     // left
    candidates.push([row, col + 1, row, col]);     // right
    candidates.push([row + 1, col, row, col]);     // below
  }

  for (const [r0, c0, r1, c1] of candidates) {
    if (!inside(r0, c0) || !inside(r1, c1)) continue;
    const cell0 = grid[r0][c0];
    const cell1 = grid[r1][c1];
    const idStr = toIdStr(domino.id);
    const ok0 = cell0 === null || (cell0.dominoId && String(cell0.dominoId) === idStr);
    const ok1 = cell1 === null || (cell1.dominoId && String(cell1.dominoId) === idStr);
    if (!ok0 || !ok1) continue;

    // Commit atomically using the anchor API
    if (placeDominoAnchor(domino, r0, c0, r1, c1, grid)) return true;
  }

  return false;
}

/**
 * moveDomino(domino, row, col, grid)
 * Backwards-compatible wrapper for callers expecting moveDomino.
 * Semantics: attempt to place the domino with half0 anchored at (row,col).
 * Returns true on success, false otherwise.
 */
export function moveDomino(domino, row, col, grid) {
  // Try the four anchors where half0 == (row,col)
  const candidates = [
    [row, col,     row, col + 1], // right
    [row, col,     row + 1, col], // down
    [row, col,     row, col - 1], // left
    [row, col,     row - 1, col]  // up
  ];

  for (const [r0, c0, r1, c1] of candidates) {
    try {
      if (placeDominoAnchor(domino, r0, c0, r1, c1, grid)) return true;
    } catch (e) {
      // Defensive: ignore and try next candidate
    }
  }
  return false;
}
