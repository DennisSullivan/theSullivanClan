// ============================================================
// FILE: syncCheck.js
// PURPOSE: Verify that domino geometry and grid occupancy are
//          perfectly synchronized.
// NOTES:
//   - Pure diagnostic tool: never mutates dominos or grid.
//   - Geometry is the source of truth; grid must match it.
//   - Uses canonical grid cell format: { dominoId, half }.
//   - Robust to dominos being Map or Array.
//   - Medium diagnostics for impossible branches.
// ============================================================

/**
 * resolveDomino(dominos, id)
 * Flexible lookup for a domino by id.
 * Supports Map or Array, and handles string/number ids.
 */
function resolveDomino(dominos, id) {
  if (!dominos) return undefined;

  if (dominos instanceof Map) {
    if (dominos.has(id)) return dominos.get(id);
    const s = String(id);
    if (dominos.has(s)) return dominos.get(s);
    const n = Number(id);
    if (!Number.isNaN(n) && dominos.has(n)) return dominos.get(n);
    return undefined;
  }

  // Array fallback
  const sId = String(id);
  return dominos.find((d) => String(d.id) === sId);
}

/**
 * idsEqual(a, b)
 * Type‑agnostic id comparison.
 */
function idsEqual(a, b) {
  return String(a) === String(b);
}

/**
 * syncCheck(dominos, grid)
 * Performs a full two‑way consistency check:
 *   1. Every domino’s geometry must match the grid.
 *   2. Every grid cell must match a domino’s geometry.
 *
 * Logs:
 *   - Missing cells
 *   - Wrong dominoId
 *   - Wrong half index
 *   - Unknown domino references
 *   - Geometry mismatches
 *
 * PURE FUNCTION:
 *   - Never mutates dominos or grid.
 */
export function syncCheck(dominos, grid) {
  if (!dominos || !grid) {
    console.error("syncCheck: missing dominos or grid");
    return;
  }

  // Normalize dominos into [id, domino] pairs.
  let entries;
  if (dominos instanceof Map) {
    entries = Array.from(dominos.entries());
  } else if (Array.isArray(dominos)) {
    entries = dominos.map((d) => [d.id, d]);
  } else {
    console.error("syncCheck: unsupported dominos collection type", dominos);
    return;
  }

  let issues = 0;

  // ----------------------------------------------------------
  // 1. Check each domino’s geometry against the grid
  // ----------------------------------------------------------
  for (const [id, d] of entries) {
    // Tray dominos should have no grid cells.
    if (d.row0 === null) continue;

    const { row0: r0, col0: c0, row1: r1, col1: c1 } = d;

    const cell0 = grid[r0]?.[c0];
    const cell1 = grid[r1]?.[c1];

    // Missing cells
    if (!cell0) {
      console.warn(`syncCheck: Domino ${id} half0 missing at (${r0},${c0})`);
      issues++;
    }
    if (!cell1) {
      console.warn(`syncCheck: Domino ${id} half1 missing at (${r1},${c1})`);
      issues++;
    }

    // Wrong dominoId
    if (cell0 && !idsEqual(cell0.dominoId, id)) {
      console.warn(
        `syncCheck: Domino ${id} half0 mismatch at (${r0},${c0}) — grid.dominoId=${cell0.dominoId}`
      );
      issues++;
    }
    if (cell1 && !idsEqual(cell1.dominoId, id)) {
      console.warn(
        `syncCheck: Domino ${id} half1 mismatch at (${r1},${c1}) — grid.dominoId=${cell1.dominoId}`
      );
      issues++;
    }

    // Wrong half index
    if (cell0 && cell0.half !== 0) {
      console.warn(
        `syncCheck: Domino ${id} half0 wrong half index at (${r0},${c0}) — grid.half=${cell0.half}`
      );
      issues++;
    }
    if (cell1 && cell1.half !== 1) {
      console.warn(
        `syncCheck: Domino ${id} half1 wrong half index at (${r1},${c1}) — grid.half=${cell1.half}`
      );
      issues++;
    }
  }

  // ----------------------------------------------------------
  // 2. Check each grid cell against domino geometry
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

      // Domino should be on board
      if (d.row0 === null) {
        console.warn(`syncCheck: Grid cell (${r},${c}) references tray domino ${dominoId}`);
        issues++;
        continue;
      }

      const match0 = half === 0 && r === d.row0 && c === d.col0;
      const match1 = half === 1 && r === d.row1 && c === d.col1;

      if (!match0 && !match1) {
        console.warn(
          `syncCheck: Grid cell (${r},${c}) references domino ${dominoId} but geometry disagrees — domino at [${d.row0},${d.col0}] and [${d.row1},${d.col1}]`
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
