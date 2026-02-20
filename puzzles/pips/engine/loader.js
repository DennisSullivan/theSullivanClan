// ============================================================
// FILE: loader.js
// PURPOSE:
//   Loads a puzzle JSON file using the canonical schema
//   and produces all engine-ready structures.
// NOTES:
//   - Assumes structural validation has already occurred.
//   - No DOM logic.
//   - No structural rejection or defensive checks.
//   - Builds regionMap and canonical Domino objects.
//   - Assigns each domino a stable homeSlot based on puzzle order.
// ============================================================

import { MASTER_TRAY, createDomino } from "./domino.js";
import { createGrid } from "./grid.js";
import { buildRegionMap } from "./regionMapBuilder.js";

// ------------------------------------------------------------
// loadPuzzle(json)
// Loads a structurally valid puzzle definition and returns
// an engine-ready state object.
// ------------------------------------------------------------
export function loadPuzzle(json) {
  // Accept both canonical (boardRows/boardCols) and legacy (width/height)
  const boardRows = json.boardRows ?? json.height;
  const boardCols = json.boardCols ?? json.width;

  // Create empty grid
  const grid = createGrid(boardCols, boardRows);

  // Normalize blocked cells into "r,c" strings
  const blocked = new Set();
  for (const cell of json.blocked || []) {
    blocked.add(`${cell.row},${cell.col}`);
  }

  // Load tray dominos with stable homeSlot assignment
  const dominos = loadDominos(json.dominos || []);

  // Apply starting placements (assumed valid)
  applyStartingDominos(json.startingDominos || [], dominos, grid);

  // Build region map
  const regionMap = buildRegionMap(boardRows, boardCols, json.regions || []);

  // ------------------------------------------------------------
  // Assemble engine state
  // ------------------------------------------------------------
  return {
    boardRows,
    boardCols,
    dominos,
    grid,
    regionMap,
    blocked,
    regions: json.regions || [],
    startingDominoIds: new Set(
      (json.startingDominos || []).map(d => String(d.id))
    )
  };
}

// ------------------------------------------------------------
// loadDominos(idList)
// Builds Domino objects and assigns stable homeSlot indices.
// Assumes ids are valid and sorted.
// ------------------------------------------------------------
function loadDominos(idList) {
  const map = new Map();
  let index = 0;

  for (const id of idList) {
    const d = createDomino(id);

    d.homeSlot = index++;
    d.trayOrientation = 0;

    map.set(id, d);
  }

  return map;
}

// ------------------------------------------------------------
// applyStartingDominos(startingList, dominos, grid)
// Places fixed starting dominos onto the grid.
// Assumes placements are valid and non-overlapping.
// ------------------------------------------------------------
function applyStartingDominos(startingList, dominos, grid) {
  for (const entry of startingList) {
    const { domino: id, cells } = entry;
    const d = dominos.get(id);

    const r0 = cells[0].row;
    const c0 = cells[0].col;
    const r1 = cells[1].row;
    const c1 = cells[1].col;

    d.row0 = r0;
    d.col0 = c0;
    d.row1 = r1;
    d.col1 = c1;

    // Starting dominos always use pivotHalf = 0
    d.pivotHalf = 0;

    grid[r0][c0] = { dominoId: id, half: 0 };
    grid[r1][c1] = { dominoId: id, half: 1 };
  }
}
