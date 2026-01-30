// ============================================================
// FILE: domino.js
// PURPOSE: Defines the canonical Domino object and all helpers
//          used throughout the Pips engine.
// NOTES:
//   - This file contains NO board logic and NO DOM logic.
//   - Everything here is pure data and validation.
// ============================================================


// ------------------------------------------------------------
// MASTER TRAY (canonical 28 dominos, sorted, immutable)
// Each ID is "XY" where X ≤ Y.
// The index in this array is the intrinsic home slot.
// ------------------------------------------------------------
export const MASTER_TRAY = [
  "00","01","02","03","04","05","06",
  "11","12","13","14","15","16",
  "22","23","24","25","26",
  "33","34","35","36",
  "44","45","46",
  "55","56",
  "66"
];


// ------------------------------------------------------------
// isValidDominoId(id)
// Returns true if id is a canonical domino ID ("XY", X ≤ Y).
// ------------------------------------------------------------
export function isValidDominoId(id) {
  // Must be exactly two digits 0–6
  if (!/^[0-6][0-6]$/.test(id)) return false;

  // Must satisfy X ≤ Y
  const a = Number(id[0]);
  const b = Number(id[1]);
  return a <= b;
}


// ------------------------------------------------------------
// getPipsFromId(id)
// Extracts pip0 and pip1 from a canonical ID.
// INPUTS:
//   id - string "XY"
// RETURNS:
//   { pip0, pip1 }
// ------------------------------------------------------------
export function getPipsFromId(id) {
  return {
    pip0: Number(id[0]),
    pip1: Number(id[1])
  };
}


// ------------------------------------------------------------
// getHomeSlot(id)
// Returns the index of this domino in MASTER_TRAY.
// Used when returning a domino to the tray.
// ------------------------------------------------------------
export function getHomeSlot(id) {
  return MASTER_TRAY.indexOf(id); // always stable
}


// ------------------------------------------------------------
// createDomino(id)
// Creates a canonical Domino object.
// INPUTS:
//   id - string "XY" (must be valid)
// RETURNS:
//   Domino object with canonical fields
// NOTES:
//   - Coordinates are null when in tray
//   - pivotHalf is null when in tray
//   - trayOrientation controls tray-only appearance
// ------------------------------------------------------------
export function createDomino(id) {
  if (!isValidDominoId(id)) {
    throw new Error(`Invalid domino ID: ${id}`);
  }

  const { pip0, pip1 } = getPipsFromId(id);

  return {
    id,
    pip0,
    pip1,

    // Board placement (null when in tray)
    row0: null,
    col0: null,
    row1: null,
    col1: null,

    // Tray-only orientation (0/90/180/270)
    trayOrientation: 0,

    // Board-only rotation pivot (0 or 1 when on board)
    pivotHalf: null
  };
}


// ------------------------------------------------------------
// isOnBoard(domino)
// Returns true if the domino has valid board coordinates.
// ------------------------------------------------------------
export function isOnBoard(domino) {
  return (
    domino.row0 !== null &&
    domino.col0 !== null &&
    domino.row1 !== null &&
    domino.col1 !== null
  );
}


// ------------------------------------------------------------
// clearBoardState(domino)
// Removes the domino from the board.
// NOTES:
//   - Coordinates become null
//   - pivotHalf becomes null
//   - trayOrientation is preserved
// ------------------------------------------------------------
export function clearBoardState(domino) {
  domino.row0 = null;
  domino.col0 = null;
  domino.row1 = null;
  domino.col1 = null;
  domino.pivotHalf = null;
}


// ------------------------------------------------------------
// setCells(domino, r0, c0, r1, c1)
// Assigns board coordinates to the domino.
// INPUTS:
//   r0,c0 - coordinates for half 0
//   r1,c1 - coordinates for half 1
// NOTES:
//   - Does NOT validate adjacency (engine handles that)
// ------------------------------------------------------------
export function setCells(domino, r0, c0, r1, c1) {
  domino.row0 = r0;
  domino.col0 = c0;
  domino.row1 = r1;
  domino.col1 = c1;
}


// ------------------------------------------------------------
// getCells(domino)
// Returns the two cell coordinates as an array.
// RETURNS:
//   [ {row, col}, {row, col} ]
// ------------------------------------------------------------
export function getCells(domino) {
  return [
    { row: domino.row0, col: domino.col0 },
    { row: domino.row1, col: domino.col1 }
  ];
}


// ------------------------------------------------------------
// cloneDomino(domino)
// Creates a deep copy of a domino object.
// ------------------------------------------------------------
export function cloneDomino(domino) {
  return JSON.parse(JSON.stringify(domino));
}

