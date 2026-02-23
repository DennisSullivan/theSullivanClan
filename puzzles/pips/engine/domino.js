// ============================================================
// FILE: domino.js
// PURPOSE: Define the canonical Domino model and helpers.
// NOTES:
//   - Pure data module: no DOM, no UI.
//   - Domino geometry is always row0/col0 and row1/col1.
//   - MASTER_TRAY defines canonical tray ordering.
//   - Medium diagnostics for impossible branches.
// ============================================================

// Canonical tray ordering for 0–6 domino set.
export const MASTER_TRAY = [
  "00","01","02","03","04","05","06",
  "11","12","13","14","15","16",
  "22","23","24","25","26",
  "33","34","35","36",
  "44","45","46",
  "55","56",
  "66"
];

/**
 * isValidDominoId(id)
 * Returns true if id is a valid "ab" string with 0 ≤ a ≤ b ≤ 6.
 */
export function isValidDominoId(id) {
  if (typeof id !== "string" || !/^[0-6][0-6]$/.test(id)) return false;
  const a = Number(id[0]);
  const b = Number(id[1]);
  return a <= b;
}

/**
 * getPipsFromId(id)
 * Returns { pip0, pip1 } for a valid domino id.
 */
export function getPipsFromId(id) {
  return {
    pip0: Number(id[0]),
    pip1: Number(id[1])
  };
}

/**
 * getHomeSlot(id)
 * Returns the index of the domino in MASTER_TRAY.
 */
export function getHomeSlot(id) {
  return MASTER_TRAY.indexOf(id);
}

/**
 * createDomino(id)
 * Constructs a canonical domino model object.
 *
 * RETURNS:
 *   {
 *     id, pip0, pip1,
 *     row0, col0, row1, col1,
 *     trayOrientation,
 *   }
 *
 * DIAGNOSTICS:
 *   - Throws if id is invalid.
 */
export function createDomino(id) {
  if (!isValidDominoId(id)) {
    throw new Error(`Invalid domino ID: ${id}`);
  }

  const { pip0, pip1 } = getPipsFromId(id);

  return {
    id,
    pip0,
    pip1,
    row0: null,
    col0: null,
    row1: null,
    col1: null,
    trayOrientation: 0
  };
}

/**
 * isOnBoard(domino)
 * Returns true if both halves have non-null coordinates.
 */
export function isOnBoard(domino) {
  return (
    domino.row0 !== null &&
    domino.col0 !== null &&
    domino.row1 !== null &&
    domino.col1 !== null
  );
}

/**
 * clearBoardState(domino, grid)
 * Removes the domino from the grid and resets geometry.
 */
export function clearBoardState(domino, grid) {
  if (isOnBoard(domino)) {
    grid[domino.row0][domino.col0] = null;
    grid[domino.row1][domino.col1] = null;
  }

  domino.row0 = null;
  domino.col0 = null;
  domino.row1 = null;
  domino.col1 = null;
}

/**
 * setCells(domino, r0, c0, r1, c1, grid)
 * Writes the domino into the grid at the given coordinates.
 * WARNING:
 *   - Does not validate occupancy or bounds.
 *   - Caller must ensure correctness.
 */
export function setCells(domino, r0, c0, r1, c1, grid) {
  if (isOnBoard(domino)) {
    grid[domino.row0][domino.col0] = null;
    grid[domino.row1][domino.col1] = null;
  }

  domino.row0 = r0;
  domino.col0 = c0;
  domino.row1 = r1;
  domino.col1 = c1;

  grid[r0][c0] = { dominoId: domino.id, half: 0 };
  grid[r1][c1] = { dominoId: domino.id, half: 1 };
}

/**
 * getCells(domino)
 * Returns an array of the two cell coordinates.
 */
export function getCells(domino) {
  return [
    { row: domino.row0, col: domino.col0 },
    { row: domino.row1, col: domino.col1 }
  ];
}

/**
 * cloneDomino(domino)
 * Deep‑clones a domino object.
 */
export function cloneDomino(domino) {
  return JSON.parse(JSON.stringify(domino));
}
