// ============================================================
// FILE: syncCheck.js
// PURPOSE: Development-only diagnostics to verify that the
//          engine state is internally consistent.
// NOTES:
//   - Not used in gameplay.
//   - Pure logic, no DOM.
//   - Helps catch bugs in placement, rotation, loader, UI sync.
// ============================================================


// ------------------------------------------------------------
// runSyncCheck(dominos, grid)
// Runs all consistency checks and returns an array of messages.
// INPUTS:
//   dominos - Map<id,Domino>
//   grid    - occupancy map
// RETURNS:
//   Array of strings describing problems (empty if clean)
// NOTES:
//   - Does NOT throw; caller decides how to display results.
// ------------------------------------------------------------
export function runSyncCheck(dominos, grid) {
  const errors = [];

  checkDominoCoordinates(dominos, errors);
  checkGridConsistency(dominos, grid, errors);
  checkAdjacency(dominos, errors);

  return errors;
}


// ------------------------------------------------------------
// checkDominoCoordinates(dominos, errors)
// Ensures each domino has valid coordinate state.
// NOTES:
//   - If on board: all coords must be non-null.
//   - If in tray: all coords must be null.
//   - pivotHalf must be null in tray, 0 or 1 on board.
// ------------------------------------------------------------
function checkDominoCoordinates(dominos, errors) {
  for (const [id, d] of dominos) {
    const onBoard =
      d.row0 !== null &&
      d.col0 !== null &&
      d.row1 !== null &&
      d.col1 !== null;

    const inTray =
      d.row0 === null &&
      d.col0 === null &&
      d.row1 === null &&
      d.col1 === null;

    if (!onBoard && !inTray) {
      errors.push(`Domino ${id} has partial coordinates`);
      continue;
    }

    if (inTray && d.pivotHalf !== null) {
      errors.push(`Domino ${id} is in tray but pivotHalf is not null`);
    }

    if (onBoard && (d.pivotHalf !== 0 && d.pivotHalf !== 1)) {
      errors.push(`Domino ${id} is on board but pivotHalf is invalid`);
    }
  }
}


// ------------------------------------------------------------
// checkGridConsistency(dominos, grid, errors)
// Ensures grid ↔ domino state matches exactly.
// NOTES:
//   - Every domino half on board must appear exactly once in grid.
//   - No grid cell may reference a domino not on board.
//   - No grid cell may reference an invalid half.
// ------------------------------------------------------------
function checkGridConsistency(dominos, grid, errors) {
  // Track expected occupancy from domino objects
  const expected = new Map(); // id -> {half0:false, half1:false}

  for (const [id, d] of dominos) {
    expected.set(id, { half0: false, half1: false });

    const onBoard =
      d.row0 !== null &&
      d.col0 !== null &&
      d.row1 !== null &&
      d.col1 !== null;

    if (onBoard) {
      expected.get(id).half0 = true;
      expected.get(id).half1 = true;
    }
  }

  // Track actual occupancy from grid
  const actual = new Map(); // id -> {half0:false, half1:false}

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const cell = grid[r][c];
      if (!cell) continue;

      const { dominoId, half } = cell;

      if (!dominos.has(dominoId)) {
        errors.push(`Grid cell (${r},${c}) references unknown domino ${dominoId}`);
        continue;
      }

      if (half !== 0 && half !== 1) {
        errors.push(`Grid cell (${r},${c}) has invalid half ${half}`);
        continue;
      }

      if (!actual.has(dominoId)) {
        actual.set(dominoId, { half0: false, half1: false });
      }

      if (half === 0) actual.get(dominoId).half0 = true;
      if (half === 1) actual.get(dominoId).half1 = true;
    }
  }

  // Compare expected vs actual
  for (const [id, exp] of expected) {
    const act = actual.get(id) || { half0: false, half1: false };

    if (exp.half0 !== act.half0) {
      errors.push(`Domino ${id} half0 mismatch (expected ${exp.half0}, got ${act.half0})`);
    }
    if (exp.half1 !== act.half1) {
      errors.push(`Domino ${id} half1 mismatch (expected ${exp.half1}, got ${act.half1})`);
    }
  }
}


// ------------------------------------------------------------
// checkAdjacency(dominos, errors)
// Ensures every on-board domino has adjacent halves.
// NOTES:
//   - This catches illegal states caused by UI bugs or engine bugs.
// ------------------------------------------------------------
function checkAdjacency(dominos, errors) {
  for (const [id, d] of dominos) {
    const onBoard =
      d.row0 !== null &&
      d.col0 !== null &&
      d.row1 !== null &&
      d.col1 !== null;

    if (!onBoard) continue;

    const dr = Math.abs(d.row0 - d.row1);
    const dc = Math.abs(d.col0 - d.col1);

    if (dr + dc !== 1) {
      errors.push(`Domino ${id} halves are not adjacent`);
    }
  }
}

