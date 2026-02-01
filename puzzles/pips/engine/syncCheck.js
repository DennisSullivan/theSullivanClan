// ============================================================
// FILE: syncCheck.js
// PURPOSE: Ensures dominos[] geometry and grid[][] occupancy
//          are perfectly synchronized.
// NOTES:
//   - Uses canonical grid cell format: { dominoId, half }
//   - Geometry-first: domino.row0/col0 and row1/col1 are truth.
//   - Grid must reflect geometry exactly.
// ============================================================

export function syncCheck(dominos, grid) {

  // ----------------------------------------------------------
  // 1. Check each domino's geometry against the grid
  // ----------------------------------------------------------
  for (const [id, d] of dominos) {

    // Tray dominos should have no grid cells
    if (d.row0 === null) {
      continue;
    }

    const r0 = d.row0, c0 = d.col0;
    const r1 = d.row1, c1 = d.col1;

    const cell0 = grid[r0]?.[c0];
    const cell1 = grid[r1]?.[c1];

    // Missing cells
    if (!cell0) {
      console.warn(`syncCheck: Domino ${id} half0 missing in grid at (${r0},${c0})`);
    }
    if (!cell1) {
      console.warn(`syncCheck: Domino ${id} half1 missing in grid at (${r1},${c1})`);
    }

    // Wrong dominoId
    if (cell0 && cell0.dominoId !== id) {
      console.warn(`syncCheck: Domino ${id} half0 mismatch in grid`);
    }
    if (cell1 && cell1.dominoId !== id) {
      console.warn(`syncCheck: Domino ${id} half1 mismatch in grid`);
    }

    // Wrong half identity
    if (cell0 && cell0.half !== 0) {
      console.warn(`syncCheck: Domino ${id} half0 has wrong half index`);
    }
    if (cell1 && cell1.half !== 1) {
      console.warn(`syncCheck: Domino ${id} half1 has wrong half index`);
    }
  }


  // ----------------------------------------------------------
  // 2. Check each grid cell against dominos[] geometry
  // ----------------------------------------------------------
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {

      const cell = grid[r][c];
      if (!cell) continue;

      const { dominoId, half } = cell;

      const d = dominos.get(dominoId);
      if (!d) {
        console.warn(`syncCheck: Grid cell (${r},${c}) references unknown domino ${dominoId}`);
        continue;
      }

      // Domino should be on board
      if (d.row0 === null) {
        console.warn(`syncCheck: Grid cell (${r},${c}) references tray domino ${dominoId}`);
        continue;
      }

      // Geometry must match
      const match0 = (half === 0 && r === d.row0 && c === d.col0);
      const match1 = (half === 1 && r === d.row1 && c === d.col1);

      if (!match0 && !match1) {
        console.warn(`syncCheck: Grid cell (${r},${c}) references domino ${dominoId} but geometry disagrees`);
      }
    }
  }
}
