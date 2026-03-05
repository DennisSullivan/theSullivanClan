// ============================================================
// FILE: engine/placement.js
// PURPOSE:
//   Provide the single, contract-compliant commit boundary for all
//   engine geometry + occupancy changes.
//
// CONTRACT SUMMARY (authoritative):
//   - The engine mutates logical state ONLY at explicit commit points.
//   - The engine does NOT track drag or rotation sessions.
//   - The engine does NOT store pivot, snapshots, angles, or transforms.
//   - The engine accepts/rejects a final PlacementProposal atomically.
//   - Rejection has zero side effects.
//   - Starting dominos are immutable for the duration of the puzzle.
//
// REQUIRED ENGINE STATE SHAPE (from loader.js):
//   state = {
//     boardRows, boardCols,
//     dominos: Map(id -> domino),
//     grid: 2D array grid[row][col] = null | { dominoId, half },
//     blocked: Set("r,c"),
//     regionMap,
//     regions,
//     startingDominoIds: Set(id)
//   }
//
// PROPOSAL SHAPE:
//   proposal = { dominoId, row0, col0, row1, col1 }
//
// NOTES:
//   - This module is engine-only: no DOM, no UI heuristics.
//   - Legacy exports removed. Callers must use commitPlacement().
// ============================================================

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
export function resolveDomino(state, id) {
  if (!state || !state.dominos) return undefined;
  const key = String(id);
  if (state.dominos instanceof Map) return state.dominos.get(key);
  return undefined;
}

function isOnBoard(domino) {
  return (
    domino &&
    domino.row0 !== null &&
    domino.col0 !== null &&
    domino.row1 !== null &&
    domino.col1 !== null
  );
}

function isBlocked(state, r, c) {
  return !!(state.blocked && state.blocked.has && state.blocked.has(`${r},${c}`));
}

function inBounds(state, r, c) {
  const rows = state.grid.length;
  const cols = state.grid[0]?.length || 0;
  return r >= 0 && c >= 0 && r < rows && c < cols;
}

function isInt(n) {
  return Number.isInteger(n);
}

function areAdjacent(r0, c0, r1, c1) {
  return Math.abs(r0 - r1) + Math.abs(c0 - c1) === 1;
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

  // Starting domino immutability
  if (!state.startingDominoIds || !state.startingDominoIds.has) {
    return { ok: false, reason: "missing-startingDominoIds" };
  }
  if (state.startingDominoIds.has(dominoId)) {
    return {
      ok: false,
      reason: "starting-domino-immutable",
      info: { dominoId }
    };
  }

  const r0 = proposal.row0, c0 = proposal.col0;
  const r1 = proposal.row1, c1 = proposal.col1;

  // ------------------------------------------------------------
  // REMOVAL PROPOSAL (all coordinates null)
  // ------------------------------------------------------------
  const isRemoval =
    r0 === null && c0 === null &&
    r1 === null && c1 === null;

  if (isRemoval) {
    return { ok: true, info: { removal: true } };
  }

  // ------------------------------------------------------------
  // PLACEMENT VALIDATION
  // ------------------------------------------------------------
  if (![r0, c0, r1, c1].every(isInt)) {
    return {
      ok: false,
      reason: "invalid-coordinates",
      info: { proposal: { dominoId, row0: r0, col0: c0, row1: r1, col1: c1 } }
    };
  }

  if (r0 === r1 && c0 === c1) {
    return {
      ok: false,
      reason: "identical-cells",
      info: { proposal: { dominoId, row0: r0, col0: c0, row1: r1, col1: c1 } }
    };
  }

  if (!areAdjacent(r0, c0, r1, c1)) {
    return {
      ok: false,
      reason: "non-adjacent",
      info: { proposal: { dominoId, row0: r0, col0: c0, row1: r1, col1: c1 } }
    };
  }

  const in0 = inBounds(state, r0, c0);
  const in1 = inBounds(state, r1, c1);
  if (!in0 || !in1) {
    return {
      ok: false,
      reason: "out-of-bounds",
      info: {
        proposal: { dominoId, row0: r0, col0: c0, row1: r1, col1: c1 },
        bounds: { in0, in1 }
      }
    };
  }

  const blocked0 = isBlocked(state, r0, c0);
  const blocked1 = isBlocked(state, r1, c1);
  if (blocked0 || blocked1) {
    return {
      ok: false,
      reason: "blocked",
      info: {
        proposal: { dominoId, row0: r0, col0: c0, row1: r1, col1: c1 },
        blocked: { cell0: blocked0, cell1: blocked1 }
      }
    };
  }

  const grid = state.grid;
  const cell0 = grid[r0][c0];
  const cell1 = grid[r1][c1];

  const conflict0 = cell0 && String(cell0.dominoId) !== dominoId;
  const conflict1 = cell1 && String(cell1.dominoId) !== dominoId;

  if (conflict0 || conflict1) {
    return {
      ok: false,
      reason: "occupied",
      info: {
        proposal: { dominoId, row0: r0, col0: c0, row1: r1, col1: c1 },
        occupancy: { cell0, cell1, conflict0, conflict1 }
      }
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
  const grid = state.grid;

  const r0 = proposal.row0, c0 = proposal.col0;
  const r1 = proposal.row1, c1 = proposal.col1;

  const isRemoval =
    r0 === null && c0 === null &&
    r1 === null && c1 === null;

  // ------------------------------------------------------------
  // REMOVAL COMMIT
  // ------------------------------------------------------------
  if (isRemoval) {
    // Clear any existing occupancy
    for (let rr = 0; rr < grid.length; rr++) {
      for (let cc = 0; cc < grid[0].length; cc++) {
        const occ = grid[rr][cc];
        if (occ && String(occ.dominoId) === dominoId) {
          grid[rr][cc] = null;
        }
      }
    }

    // Null geometry
    if (d) {
      d.row0 = null; d.col0 = null;
      d.row1 = null; d.col1 = null;
    }

    return { accepted: true };
  }

  // ------------------------------------------------------------
  // NORMAL PLACEMENT COMMIT
  // ------------------------------------------------------------
  // Clear old occupancy
  for (let rr = 0; rr < grid.length; rr++) {
    for (let cc = 0; cc < grid[0].length; cc++) {
      const occ = grid[rr][cc];
      if (occ && String(occ.dominoId) === dominoId) {
        grid[rr][cc] = null;
      }
    }
  }

  // Write new occupancy
  grid[r0][c0] = { dominoId, half: 0 };
  grid[r1][c1] = { dominoId, half: 1 };

  // Update geometry
  d.row0 = r0; d.col0 = c0;
  d.row1 = r1; d.col1 = c1;

  return { accepted: true };
}
