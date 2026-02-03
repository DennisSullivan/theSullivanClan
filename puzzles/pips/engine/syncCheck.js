// ============================================================
// FILE: syncCheck.js
// PURPOSE: Ensures dominos[] geometry and grid[][] occupancy
//          are perfectly synchronized.
// NOTES:
//   - Uses canonical grid cell format: { dominoId, half }
//   - Geometry-first: domino.row0/col0 and row1/col1 are truth.
//   - Grid must reflect geometry exactly.
//   - Robust to id types (string/number) and dominos being Map or Array.
// ============================================================

/**
 * Resolve a domino object from a dominos collection using flexible id matching.
 * Supports dominos as Map or Array. Tries id as provided, then String(id), then Number(id).
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

  // dominos as Array
  const sId = String(id);
  return dominos.find(d => String(d.id) === sId);
}

/**
 * Compare two ids for equality in a type-agnostic way.
 */
function idsEqual(a, b) {
  return String(a) === String(b);
}

export function syncCheck(dominos, grid) {
  if (!dominos || !grid) {
    console.warn("syncCheck: missing dominos or grid");
    return;
  }

  // Normalize dominos iteration: produce entries [id, domino]
  let entries;
  if (dominos instanceof Map) {
    entries = Array.from(dominos.entries());
  } else if (Array.isArray(dominos)) {
    entries = dominos.map(d => [d.id, d]);
  } else {
    console.warn("syncCheck: unsupported dominos collection type");
    return;
  }

  let issues = 0;

  // ----------------------------------------------------------
  // 1. Check each domino's geometry against the grid
  // ----------------------------------------------------------
  for (const [idKey, d] of entries) {
    const id = idKey;

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
      issues++;
    }
    if (!cell1) {
      console.warn(`syncCheck: Domino ${id} half1 missing in grid at (${r1},${c1})`);
      issues++;
    }

    // Wrong dominoId (type-agnostic compare)
    if (cell0 && !idsEqual(cell0.dominoId, id)) {
      console.warn(`syncCheck: Domino ${id} half0 mismatch in grid at (${r0},${c0}) — grid.dominoId=${cell0.dominoId}`);
      issues++;
    }
    if (cell1 && !idsEqual(cell1.dominoId, id)) {
      console.warn(`syncCheck: Domino ${id} half1 mismatch in grid at (${r1},${c1}) — grid.dominoId=${cell1.dominoId}`);
      issues++;
    }

    // Wrong half identity
    if (cell0 && cell0.half !== 0) {
      console.warn(`syncCheck: Domino ${id} half0 has wrong half index in grid at (${r0},${c0}) — grid.half=${cell0.half}`);
      issues++;
    }
    if (cell1 && cell1.half !== 1) {
      console.warn(`syncCheck: Domino ${id} half1 has wrong half index in grid at (${r1},${c1}) — grid.half=${cell1.half}`);
      issues++;
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

      // Geometry must match
      const match0 = (half === 0 && r === d.row0 && c === d.col0);
      const match1 = (half === 1 && r === d.row1 && c === d.col1);

      if (!match0 && !match1) {
        console.warn(`syncCheck: Grid cell (${r},${c}) references domino ${dominoId} but geometry disagrees (domino at [${d.row0},${d.col0}] and [${d.row1},${d.col1}])`);
        issues++;
      }
    }
  }

  if (issues === 0) {
    console.log("syncCheck: OK — no geometry/grid mismatches detected");
  } else {
    console.warn(`syncCheck: completed with ${issues} issue(s) detected`);
  }
}
