// ============================================================
// FILE: loader.js
// PURPOSE: Loads a puzzle JSON file using the canonical schema
//          and produces all engine-ready structures.
// NOTES:
//   - No DOM logic.
//   - No orientation stored in puzzle files.
//   - Validates dominos, starting placements, regions, blocked.
//   - Builds regionMap and canonical Domino objects.
// ============================================================

import { MASTER_TRAY, createDomino, isValidDominoId } from "./domino.js";
import { createGrid, areAdjacent } from "./grid.js";
import { buildRegionMap } from "./regionMapBuilder.js";


// ------------------------------------------------------------
// loadPuzzle(json)
// Loads a puzzle definition and returns an engine-ready object.
// INPUTS:
//   json - parsed puzzle JSON (already validated by schema)
// RETURNS:
//   {
//     width, height,
//     dominos: Map<id, Domino>,
//     grid,
//     regionMap,
//     blocked: Set<string>,
//     regions: [...],
//   }
// NOTES:
//   - Performs adjacency validation for startingDominos.
//   - Ensures dominos are a sorted subset of MASTER_TRAY.
// ------------------------------------------------------------
export function loadPuzzle(json) {
  const { width, height } = json;

  // Create empty grid
  const grid = createGrid(width, height);

  // Load blocked cells
  const blocked = new Set(json.blocked || []);

  // Validate and load dominos
  const dominos = loadDominos(json.dominos);

  // Apply starting placements
  applyStartingDominos(json.startingDominos || [], dominos, grid);

  // Build region map
  const regionMap = buildRegionMap(width, height, json.regions);

  return {
    width,
    height,
    dominos,
    grid,
    regionMap,
    blocked,
    regions: json.regions
  };
}


// ------------------------------------------------------------
// loadDominos(idList)
// Validates and constructs canonical Domino objects.
// INPUTS:
//   idList - array of "XY" strings
// RETURNS:
//   Map<id, Domino>
// NOTES:
//   - Ensures sorted subset of MASTER_TRAY.
//   - Ensures all IDs are valid.
// ------------------------------------------------------------
function loadDominos(idList) {
  // Validate subset
  for (const id of idList) {
    if (!MASTER_TRAY.includes(id)) {
      throw new Error(`Domino ID ${id} is not in the canonical set`);
    }
    if (!isValidDominoId(id)) {
      throw new Error(`Invalid domino ID: ${id}`);
    }
  }

  // Validate sorted order
  const sorted = [...idList].sort();
  for (let i = 0; i < idList.length; i++) {
    if (idList[i] !== sorted[i]) {
      throw new Error("Dominos must be sorted ascending");
    }
  }

  // Build map of Domino objects
  const map = new Map();
  for (const id of idList) {
    map.set(id, createDomino(id));
  }
  return map;
}


// ------------------------------------------------------------
// applyStartingDominos(startingList, dominos, grid)
// Places pre-defined dominos onto the board.
// INPUTS:
//   startingList - array of { id, cells:[{row,col},{row,col}] }
//   dominos      - Map<id,Domino>
//   grid         - occupancy map
// NOTES:
//   - Validates adjacency.
//   - Validates bounds.
//   - Validates emptiness.
//   - Sets pivotHalf = 0.
// ------------------------------------------------------------
function applyStartingDominos(startingList, dominos, grid) {
  for (const entry of startingList) {
    const { id, cells } = entry;

    if (!dominos.has(id)) {
      throw new Error(`Starting domino ${id} not in puzzle dominos`);
    }

    const d = dominos.get(id);

    const r0 = cells[0].row;
    const c0 = cells[0].col;
    const r1 = cells[1].row;
    const c1 = cells[1].col;

    // Validate adjacency
    if (!areAdjacent(r0, c0, r1, c1)) {
      throw new Error(`Starting domino ${id} cells are not adjacent`);
    }

    // Validate bounds
    if (!grid[r0] || !grid[r0][c0]) {
      throw new Error(`Starting domino ${id} cell out of bounds`);
    }
    if (!grid[r1] || !grid[r1][c1]) {
      throw new Error(`Starting domino ${id} cell out of bounds`);
    }

    // Validate emptiness
    if (grid[r0][c0] !== null || grid[r1][c1] !== null) {
      throw new Error(`Starting domino ${id} overlaps another piece`);
    }

    // Assign coordinates
    d.row0 = r0;
    d.col0 = c0;
    d.row1 = r1;
    d.col1 = c1;

    // Starting dominos always use pivotHalf = 0
    d.pivotHalf = 0;

    // Write to grid
    grid[r0][c0] = { dominoId: id, half: 0 };
    grid[r1][c1] = { dominoId: id, half: 1 };
  }
}

