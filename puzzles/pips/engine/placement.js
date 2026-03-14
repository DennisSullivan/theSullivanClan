// ============================================================
// FILE: engine/placement.js
// PURPOSE:
//   Single, contract-compliant commit boundary for all engine
//   geometry + occupancy changes (cells-authoritative).
//
// CONTRACT SUMMARY:
//   - Engine mutates state ONLY at explicit commit points.
//   - No drag/rotation session tracking.
//   - No geometry inference; no row/col fields.
//   - Atomic accept/reject with zero side effects on rejection.
//   - Starting dominos are immutable.
//
// REQUIRED ENGINE STATE SHAPE (from loader.js):
//   state = {
//     dominos: Map(id -> domino),
//     grid: 2D array grid[row][col] = null | { dominoId, half },
//     blocked: Set("r,c"),
//     startingDominoIds: Set(id)
//   }
//
// PROPOSAL SHAPE:
//   - Placement: { dominoId, cells: [{row,col},{row,col}] }
//   - Removal:   { dominoId, cells: null }
// ============================================================

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
export function resolveDomino(state, id) {
  if (!state || !state.dominos) return undefined;
  const key = String(id);
  return state.dominos instanceof Map ? state.dominos.get(key) : undefined;
}

function inBounds(state, r, c) {
  const rows = state.grid.length;
  const cols = state.grid[0]?.length || 0;
  return r >= 0 && c >= 0 && r < rows && c < cols;
}

function isBlocked(state, r, c) {
  return !!(state.blocked && state.blocked.has && state.blocked.has(`${r},${c}`));
}

function areAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function isInt(n) {
  return Number.isInteger(n);
}

// ------------------------------------------------------------
// Validation (pure)
// ------------------------------------------------------------
export function validatePlacementProposal(state, proposal) {
  if (!state || !state.grid || !state.dominos) {
    return { ok: false, reason: "missing-state" };
  }
  if (!proposal || typeof proposal !== "object") {
    return { ok: false, reason: "missing-proposal" };
  }

  const dominoId = String(proposal.dominoId ?? "");
  if (!dominoId) return { ok: false, reason: "missing-dominoId" };

  const d = resolveDomino(state, dominoId);
  if (!d) return { ok: false, reason: "unknown-domino" };

  if (!state.startingDominoIds || !state.startingDominoIds.has) {
    return { ok: false, reason: "missing-startingDominoIds" };
  }
  if (state.startingDominoIds.has(dominoId)) {
    return { ok: false, reason: "starting-domino-immutable", info: { dominoId } };
  }

  const { cells } = proposal;

  // Removal
  if (cells === null) {
    return { ok: true, info: { removal: true } };
  }

  // Placement
  if (!Array.isArray(cells) || cells.length !== 2) {
    return { ok: false, reason: "invalid-cells" };
  }

  const [a, b] = cells;

  if (![a, b].every(c => isInt(c.row) && isInt(c.col))) {
    return { ok: false, reason: "invalid-coordinates", info: { cells } };
  }

  if (a.row === b.row && a.col === b.col) {
    return { ok: false, reason: "identical-cells", info: { cells } };
  }

  if (!areAdjacent(a, b)) {
    return { ok: false, reason: "non-adjacent", info: { cells } };
  }

  if (!inBounds(state, a.row, a.col) || !inBounds(state, b.row, b.col)) {
    return { ok: false, reason: "out-of-bounds", info: { cells } };
  }

  if (isBlocked(state, a.row, a.col) || isBlocked(state, b.row, b.col)) {
    return { ok: false, reason: "blocked", info: { cells } };
  }

  const g = state.grid;
  const ca = g[a.row][a.col];
  const cb = g[b.row][b.col];

  const conflictA = ca && String(ca.dominoId) !== dominoId;
  const conflictB = cb && String(cb.dominoId) !== dominoId;

  if (conflictA || conflictB) {
    return {
      ok: false,
      reason: "occupied",
      info: { conflictA, conflictB, cells }
    };
  }

  return { ok: true };
}

// ------------------------------------------------------------
// Commit (atomic)
// ------------------------------------------------------------
export function commitPlacement(state, proposal) {
  const v = validatePlacementProposal(state, proposal);
  if (!v.ok) {
    return { accepted: false, reason: v.reason, info: v.info };
  }

  const dominoId = String(proposal.dominoId);
  const d = resolveDomino(state, dominoId);
  const g = state.grid;

  // Clear any existing occupancy for this domino
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[0].length; c++) {
      if (g[r][c]?.dominoId === dominoId) g[r][c] = null;
    }
  }

  // Removal
  if (proposal.cells === null) {
    d.cells = null;
    return { accepted: true };
  }

  // Placement
  const [a, b] = proposal.cells;
  g[a.row][a.col] = { dominoId, half: 0 };
  g[b.row][b.col] = { dominoId, half: 1 };
  d.cells = [
    { row: a.row, col: a.col },
    { row: b.row, col: b.col }
  ];

  return { accepted: true };
}
