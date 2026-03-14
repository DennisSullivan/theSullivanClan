// ============================================================
// FILE: domino.js
// PURPOSE: Canonical Domino model (pure, cells-based).
// NOTES:
//   - No DOM, no UI, no grid mutation.
//   - Placement authority is d.cells only.
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

export function isValidDominoId(id) {
  if (typeof id !== "string" || !/^[0-6][0-6]$/.test(id)) return false;
  const a = Number(id[0]);
  const b = Number(id[1]);
  return a <= b;
}

export function getPipsFromId(id) {
  return {
    pip0: Number(id[0]),
    pip1: Number(id[1])
  };
}

export function getHomeSlot(id) {
  return MASTER_TRAY.indexOf(id);
}

export function createDomino(id) {
  if (!isValidDominoId(id)) {
    throw new Error(`Invalid domino ID: ${id}`);
  }

  const { pip0, pip1 } = getPipsFromId(id);

  return {
    id,
    pip0,
    pip1,

    // Placement authority:
    // null  → tray
    // [{row,col},{row,col}] → board
    cells: null,

    // Tray-only metadata
    trayOrientation: 0
  };
}

// Pure predicate
export function isOnBoard(domino) {
  return Array.isArray(domino.cells) && domino.cells.length === 2;
}

// Pure accessor
export function getCells(domino) {
  return domino.cells
    ? domino.cells.map(({ row, col }) => ({ row, col }))
    : [];
}

// Structural clone only
export function cloneDomino(domino) {
  return JSON.parse(JSON.stringify(domino));
}
