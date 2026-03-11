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

import { createDomino } from "./domino.js";
import { createGrid, setCell } from "./grid.js";
import { buildRegionMap } from "./regionMapBuilder.js";

// ------------------------------------------------------------
// loadPuzzle(json)
// Loads a structurally valid puzzle definition and returns
// an engine-ready state object.
// ------------------------------------------------------------
export function loadPuzzle(json) {

  const { width, height } = json;
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error("Puzzle definition missing valid width/height");
  }
  const boardCols = width;
  const boardRows = height;

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
  // Build mini puzzle map
  const miniPuzzles = deriveMiniPuzzles(boardRows, boardCols, blocked);

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
    miniPuzzles,
    startingDominoIds: new Set(
      (json.startingDominos || []).map(e => String(e.domino))
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

    map.set(String(id), d);
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

    const key = String(id);
    let d = dominos.get(key);
    if (!d) {
      // Starting domino not in tray — create it
      d = createDomino(key);
      d.homeSlot = -1;        // ensures it NEVER appears in the tray
      d.trayOrientation = 0;
      dominos.set(key, d);
    }

    d.isStarting = true;

    const r0 = cells[0].row;
    const c0 = cells[0].col;
    const r1 = cells[1].row;
    const c1 = cells[1].col;

    d.row0 = r0;
    d.col0 = c0;
    d.row1 = r1;
    d.col1 = c1;
    d.cells = [
      { row: r0, col: c0 },
      { row: r1, col: c1 }
    ];

    // Commit occupancy via canonical grid helper
    setCell(grid, r0, c0, key, 0);
    setCell(grid, r1, c1, key, 1);
  }
}

// ------------------------------------------------------------
// deriveMiniPuzzles(boardRows, boardCols, blocked)
// Computes maximal 4-connected components of non-blocked cells.
// ------------------------------------------------------------
function deriveMiniPuzzles(boardRows, boardCols, blocked) {
  const visited = new Set();
  const puzzles = [];
  let nextId = 0;

  const key = (r, c) => `${r},${c}`;

  const directions = [
    [ 1,  0],
    [-1,  0],
    [ 0,  1],
    [ 0, -1]
  ];

  for (let row = 0; row < boardRows; row++) {
    for (let col = 0; col < boardCols; col++) {
      const k = key(row, col);
      if (blocked.has(k) || visited.has(k)) continue;

      const cells = [];
      const stack = [[row, col]];
      visited.add(k);

      while (stack.length) {
        const [r, c] = stack.pop();
        cells.push({ row: r, col: c });

        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          const nk = key(nr, nc);

          if (
            nr >= 0 && nr < boardRows &&
            nc >= 0 && nc < boardCols &&
            !blocked.has(nk) &&
            !visited.has(nk)
          ) {
            visited.add(nk);
            stack.push([nr, nc]);
          }
        }
      }

      puzzles.push({
        id: nextId++,
        cells
      });
    }
  }

  return puzzles;
}
