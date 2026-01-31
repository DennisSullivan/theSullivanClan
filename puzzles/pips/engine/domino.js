// ============================================================
// FILE: domino.js
// PURPOSE: Defines the canonical Domino object and helpers.
// ============================================================

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
  if (!/^[0-6][0-6]$/.test(id)) return false;
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
    row0: null,
    col0: null,
    row1: null,
    col1: null,
    trayOrientation: 0,
    pivotHalf: null
  };
}

export function isOnBoard(domino) {
  return (
    domino.row0 !== null &&
    domino.col0 !== null &&
    domino.row1 !== null &&
    domino.col1 !== null
  );
}

export function clearBoardState(domino, grid) {
  if (domino.row0 !== null) {
    grid[domino.row0][domino.col0] = null;
    grid[domino.row1][domino.col1] = null;
  }

  domino.row0 = null;
  domino.col0 = null;
  domino.row1 = null;
  domino.col1 = null;
  domino.pivotHalf = null;
}

export function setCells(domino, r0, c0, r1, c1, grid) {
  if (domino.row0 !== null) {
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

export function getCells(domino) {
  return [
    { row: domino.row0, col: domino.col0 },
    { row: domino.row1, col: domino.col1 }
  ];
}

export function cloneDomino(domino) {
  return JSON.parse(JSON.stringify(domino));
}
