// ============================================================
// FILE: syncCheck.js
// PURPOSE: Development-only integrity checker.
// NOTES:
//   - Ensures grid and dominos agree.
//   - Ensures adjacency is correct.
//   - Ensures no overlaps or out-of-bounds.
//   - Ensures pip order is preserved (pip0 = half0).
//   - Logs warnings; does not throw.
// ============================================================

import { areAdjacent, isInside } from "./grid.js";

export function syncCheck(dominos, grid) {
console.log("syncCheck grid object:", grid);
  const rows = grid.length;
  const cols = grid[0].length;

  const seen = new Set();

  // ------------------------------------------------------------
  // PASS 1: Domino → Grid validation
  // ------------------------------------------------------------
  for (const [id, d] of dominos) {
    if (d.row0 === null) continue; // in tray

    const { row0, col0, row1, col1 } = d;

    // Bounds
    if (!isInside(grid, row0, col0)) {
      console.warn(`syncCheck: Domino ${id} half0 out of bounds`);
      continue;
    }
    if (!isInside(grid, row1, col1)) {
      console.warn(`syncCheck: Domino ${id} half1 out of bounds`);
      continue;
    }

    // Adjacency
    if (!areAdjacent(row0, col0, row1, col1)) {
      console.warn(`syncCheck: Domino ${id} halves not adjacent`);
    }

    // Pip order (Option B)
    if (d.pip0 === undefined || d.pip1 === undefined) {
      console.warn(`syncCheck: Domino ${id} missing pip values`);
    }

    // Degenerate geometry
    if (row0 === row1 && col0 === col1) {
      console.warn(`syncCheck: Domino ${id} halves occupy same cell`);
    }

    // Grid occupancy
    const cellA = grid[row0][col0];
    const cellB = grid[row1][col1];

    if (!cellA || cellA.dominoId !== id || cellA.half !== 0) {
      console.warn(`syncCheck: Domino ${id} half0 mismatch in grid`);
    }
    if (!cellB || cellB.dominoId !== id || cellB.half !== 1) {
      console.warn(`syncCheck: Domino ${id} half1 mismatch in grid`);
    }

    // Overlap detection
    const keyA = `${row0},${col0}`;
    const keyB = `${row1},${col1}`;

    if (seen.has(keyA)) console.warn(`syncCheck: Overlap at ${keyA}`);
    if (seen.has(keyB)) console.warn(`syncCheck: Overlap at ${keyB}`);

    seen.add(keyA);
    seen.add(keyB);
  }

  // ------------------------------------------------------------
  // PASS 2: Grid → Domino validation
  // ------------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (!cell) continue;

      const { dominoId, half } = cell;
      const d = dominos.get(dominoId);

      if (!d) {
        console.warn(`syncCheck: Grid cell (${r},${c}) references missing domino ${dominoId}`);
        continue;
      }

      // Validate half index
      if (half !== 0 && half !== 1) {
        console.warn(`syncCheck: Grid cell (${r},${c}) has invalid half index ${half}`);
      }

      // Validate geometry match
      if (half === 0 && (d.row0 !== r || d.col0 !== c)) {
        console.warn(`syncCheck: Grid mismatch for domino ${dominoId} half0 at (${r},${c})`);
      }
      if (half === 1 && (d.row1 !== r || d.col1 !== c)) {
        console.warn(`syncCheck: Grid mismatch for domino ${dominoId} half1 at (${r},${c})`);
      }
    }
  }
}
