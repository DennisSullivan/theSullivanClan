// ============================================================
// FILE: syncCheck.js
// PURPOSE: Development-only integrity checker.
// NOTES:
//   - Ensures grid and dominos agree.
//   - Ensures adjacency is correct.
//   - Ensures no overlaps or out-of-bounds.
//   - Logs warnings; does not throw.
// ============================================================

import { areAdjacent, isInside } from "./grid.js";


// ------------------------------------------------------------
// syncCheck(dominos, grid)
// Runs a full consistency check between engine structures.
// ------------------------------------------------------------
export function syncCheck(dominos, grid) {
  const rows = grid.length;
  const cols = grid[0].length;

  // Track occupancy from dominos
  const seen = new Set();

  for (const [id, d] of dominos) {
    // Tray dominos: row0 === null
    if (d.row0 === null) {
      continue;
    }

    const { row0, col0, row1, col1 } = d;

    // Bounds check
    if (!isInside(grid, row0, col0)) {
      console.warn(`syncCheck: Domino ${id} half0 out of bounds`);
      continue;
    }
    if (!isInside(grid, row1, col1)) {
      console.warn(`syncCheck: Domino ${id} half1 out of bounds`);
      continue;
    }

    // Adjacency check
    if (!areAdjacent(row0, col0, row1, col1)) {
      console.warn(`syncCheck: Domino ${id} halves not adjacent`);
    }

    // Grid occupancy check
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

    if (seen.has(keyA)) {
      console.warn(`syncCheck: Overlap at ${keyA}`);
    }
    if (seen.has(keyB)) {
      console.warn(`syncCheck: Overlap at ${keyB}`);
    }

    seen.add(keyA);
    seen.add(keyB);
  }

  // Check grid for cells that claim occupancy but no domino matches
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

      if (half === 0 && (d.row0 !== r || d.col0 !== c)) {
        console.warn(`syncCheck: Grid mismatch for ${dominoId} half0 at (${r},${c})`);
      }
      if (half === 1 && (d.row1 !== r || d.col1 !== c)) {
        console.warn(`syncCheck: Grid mismatch for ${dominoId} half1 at (${r},${c})`);
      }
    }
  }
}
