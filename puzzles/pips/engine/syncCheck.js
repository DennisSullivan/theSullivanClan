// ============================================================
// FILE: syncCheck.js
// PURPOSE:
//   Verify that domino cells[] and grid occupancy are perfectly
//   synchronized (cells-authoritative).
// NOTES:
//   - Pure diagnostic tool: never mutates dominos or grid.
// ============================================================

function resolveDomino(dominos, id) {
  if (!dominos) return undefined;

  const key = String(id);
  if (dominos instanceof Map) return dominos.get(key);
  if (Array.isArray(dominos)) return dominos.find(d => String(d.id) === key);
  return undefined;
}

function idsEqual(a, b) {
  return String(a) === String(b);
}

export function syncCheck(dominos, grid) {
  if (!dominos || !grid) {
    console.error("syncCheck: missing dominos or grid");
    return;
  }

  const entries =
    dominos instanceof Map
      ? Array.from(dominos.entries())
      : Array.isArray(dominos)
      ? dominos.map(d => [d.id, d])
      : null;

  if (!entries) {
    console.error("syncCheck: unsupported dominos collection type", dominos);
    return;
  }

  let issues = 0;

  // ----------------------------------------------------------
  // 1. Check each domino’s cells[] against the grid
  // ----------------------------------------------------------
  for (const [id, d] of entries) {
    if (d.cells === null) continue;

    if (!Array.isArray(d.cells) || d.cells.length !== 2) {
      console.warn(`syncCheck: Domino ${id} has invalid cells`, d.cells);
      issues++;
      continue;
    }

    d.cells.forEach((cell, half) => {
      const { row, col } = cell;
      const gcell = grid[row]?.[col];

      if (!gcell) {
        console.warn(`syncCheck: Domino ${id} half${half} missing at (${row},${col})`);
        issues++;
        return;
      }

      if (!idsEqual(gcell.dominoId, id)) {
        console.warn(
          `syncCheck: Domino ${id} half${half} mismatch at (${row},${col}) — grid.dominoId=${gcell.dominoId}`
        );
        issues++;
      }

      if (gcell.half !== half) {
        console.warn(
          `syncCheck: Domino ${id} half${half} wrong half index at (${row},${col}) — grid.half=${gcell.half}`
        );
        issues++;
      }
    });
  }

  // ----------------------------------------------------------
  // 2. Check each grid cell against domino cells[]
  // ----------------------------------------------------------
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (!cell) continue;

      const { dominoId, half } = cell;
      const d = resolveDomino(dominos, dominoId);

      if (!d) {
        console.warn(`syncCheck: Grid cell (${r},${c}) references unknown domino ${dominoId}`);
        issues++;
        continue;
      }

      if (!Array.isArray(d.cells)) {
        console.warn(`syncCheck: Grid cell (${r},${c}) references tray domino ${dominoId}`);
        issues++;
        continue;
      }

      const expected = d.cells[half];
      if (!expected || expected.row !== r || expected.col !== c) {
        console.warn(
          `syncCheck: Grid cell (${r},${c}) disagrees with domino ${dominoId} cells`,
          d.cells
        );
        issues++;
      }
    }
  }

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------
  if (issues === 0) {
    console.log("syncCheck: OK — no geometry/grid mismatches detected");
  } else {
    console.warn(`syncCheck: completed with ${issues} issue(s) detected`);
  }
}
