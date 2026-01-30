// ============================================================
// FILE: history.js
// PURPOSE: Implements undo/redo for all domino actions.
// NOTES:
//   - Pure data, no DOM logic.
//   - Each action is explicit and self-contained.
//   - Supports: place, move, rotate, return-to-tray.
// ============================================================


// ------------------------------------------------------------
// createHistory()
// Creates a new history stack.
// RETURNS:
//   { undoStack: [], redoStack: [] }
// ------------------------------------------------------------
export function createHistory() {
  return {
    undoStack: [],
    redoStack: []
  };
}


// ------------------------------------------------------------
// recordAction(history, action)
// Pushes an action onto the undo stack and clears redo.
// INPUTS:
//   history - { undoStack, redoStack }
//   action  - explicit action object
// NOTES:
//   - action must contain enough info to reverse itself.
// ------------------------------------------------------------
export function recordAction(history, action) {
  history.undoStack.push(action);
  history.redoStack.length = 0; // clear redo
}


// ------------------------------------------------------------
// undo(history, dominos, grid)
// Undoes the most recent action.
// INPUTS:
//   history - history object
//   dominos - Map<id,Domino>
//   grid    - occupancy map
// RETURNS:
//   true if undo succeeded, false if nothing to undo
// ------------------------------------------------------------
export function undo(history, dominos, grid) {
  if (history.undoStack.length === 0) return false;

  const action = history.undoStack.pop();
  applyInverseAction(action, dominos, grid);

  history.redoStack.push(action);
  return true;
}


// ------------------------------------------------------------
// redo(history, dominos, grid)
// Re-applies the most recently undone action.
// ------------------------------------------------------------
export function redo(history, dominos, grid) {
  if (history.redoStack.length === 0) return false;

  const action = history.redoStack.pop();
  applyForwardAction(action, dominos, grid);

  history.undoStack.push(action);
  return true;
}


// ------------------------------------------------------------
// applyForwardAction(action, dominos, grid)
// Executes an action normally.
// ------------------------------------------------------------
function applyForwardAction(action, dominos, grid) {
  const d = dominos.get(action.id);

  switch (action.type) {

    // ----------------------------------------
    // place: tray → board
    // { type:"place", id, r0,c0,r1,c1, prevTrayOrientation }
    // ----------------------------------------
    case "place":
      d.row0 = action.r0;
      d.col0 = action.c0;
      d.row1 = action.r1;
      d.col1 = action.c1;
      d.pivotHalf = 0;
      break;

    // ----------------------------------------
    // move: board → board
    // { type:"move", id, r0,c0,r1,c1 }
    // ----------------------------------------
    case "move":
      d.row0 = action.r0;
      d.col0 = action.c0;
      d.row1 = action.r1;
      d.col1 = action.c1;
      break;

    // ----------------------------------------
    // rotate: pivot-based rotation
    // { type:"rotate", id, prev: {r0,c0,r1,c1}, next:{r0,c0,r1,c1} }
    // ----------------------------------------
    case "rotate":
      d.row0 = action.next.r0;
      d.col0 = action.next.c0;
      d.row1 = action.next.r1;
      d.col1 = action.next.c1;
      break;

    // ----------------------------------------
    // return: board → tray
    // { type:"return", id, prev:{r0,c0,r1,c1,pivotHalf} }
    // ----------------------------------------
    case "return":
      d.row0 = null;
      d.col0 = null;
      d.row1 = null;
      d.col1 = null;
      d.pivotHalf = null;
      break;
  }
}


// ------------------------------------------------------------
// applyInverseAction(action, dominos, grid)
// Reverses an action for undo.
// ------------------------------------------------------------
function applyInverseAction(action, dominos, grid) {
  const d = dominos.get(action.id);

  switch (action.type) {

    // ----------------------------------------
    // undo place → return to tray
    // ----------------------------------------
    case "place":
      d.row0 = null;
      d.col0 = null;
      d.row1 = null;
      d.col1 = null;
      d.pivotHalf = null;
      break;

    // ----------------------------------------
    // undo move → restore previous coords
    // { prev:{r0,c0,r1,c1} }
    // ----------------------------------------
    case "move":
      d.row0 = action.prev.r0;
      d.col0 = action.prev.c0;
      d.row1 = action.prev.r1;
      d.col1 = action.prev.c1;
      break;

    // ----------------------------------------
    // undo rotate → restore previous coords
    // ----------------------------------------
    case "rotate":
      d.row0 = action.prev.r0;
      d.col0 = action.prev.c0;
      d.row1 = action.prev.r1;
      d.col1 = action.prev.c1;
      break;

    // ----------------------------------------
    // undo return → restore previous board coords
    // ----------------------------------------
    case "return":
      d.row0 = action.prev.r0;
      d.col0 = action.prev.c0;
      d.row1 = action.prev.r1;
      d.col1 = action.prev.c1;
      d.pivotHalf = action.prev.pivotHalf;
      break;
  }
}

