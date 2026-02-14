// ============================================================
// FILE: history.js
// PURPOSE: Implements undo/redo for all domino actions.
// NOTES:
//   - Pure data module: no DOM, no UI, no rendering.
//   - Each action is explicit and self-contained.
//   - Supports: place, move, rotate, return.
//   - Medium diagnostics for impossible branches.
// ============================================================

// ------------------------------------------------------------
// initHistory()
// ------------------------------------------------------------

/**
 * initHistory()
 * Creates a fresh history object with empty undo/redo stacks.
 *
 * RETURNS:
 *   { undoStack: [], redoStack: [] }
 *
 * NOTES:
 *   - This is the canonical initializer used by puzzle loader.
 */
export function initHistory() {
  return {
    undoStack: [],
    redoStack: []
  };
}

// ------------------------------------------------------------
// createHistory() — alias of initHistory()
// ------------------------------------------------------------

/**
 * createHistory()
 * Backwards-compatible alias for initHistory().
 */
export function createHistory() {
  return initHistory();
}

// ------------------------------------------------------------
// recordAction(history, action)
// ------------------------------------------------------------

/**
 * recordAction(history, action)
 * Pushes an action onto the undo stack and clears redo.
 *
 * EXPECTS:
 *   - history: { undoStack, redoStack }
 *   - action: explicit object describing the change
 *
 * BEHAVIOR:
 *   - Adds action to undoStack.
 *   - Clears redoStack (standard undo/redo semantics).
 *
 * DIAGNOSTICS:
 *   - Logs if history object is malformed.
 */
export function recordAction(history, action) {
  if (!history || !Array.isArray(history.undoStack) || !Array.isArray(history.redoStack)) {
    console.error("recordAction: invalid history object", history);
    return;
  }

  history.undoStack.push(action);
  history.redoStack.length = 0;

  console.log("HISTORY: recorded action", action);
}

// ------------------------------------------------------------
// undo(history, dominos, grid)
// ------------------------------------------------------------

/**
 * undo(history, dominos, grid)
 * Undoes the most recent action.
 *
 * EXPECTS:
 *   - history: { undoStack, redoStack }
 *   - dominos: Map<id,Domino>
 *   - grid: occupancy map
 *
 * RETURNS:
 *   true  → undo succeeded
 *   false → nothing to undo
 *
 * DIAGNOSTICS:
 *   - Logs if action refers to missing domino.
 */
export function undo(history, dominos, grid) {
  if (!history || history.undoStack.length === 0) {
    console.warn("HISTORY: undo requested but stack is empty");
    return false;
  }

  const action = history.undoStack.pop();
  applyInverseAction(action, dominos, grid);

  history.redoStack.push(action);

  console.log("HISTORY: undo applied", action);
  return true;
}

// ------------------------------------------------------------
// redo(history, dominos, grid)
// ------------------------------------------------------------

/**
 * redo(history, dominos, grid)
 * Re-applies the most recently undone action.
 *
 * RETURNS:
 *   true  → redo succeeded
 *   false → nothing to redo
 */
export function redo(history, dominos, grid) {
  if (!history || history.redoStack.length === 0) {
    console.warn("HISTORY: redo requested but stack is empty");
    return false;
  }

  const action = history.redoStack.pop();
  applyForwardAction(action, dominos, grid);

  history.undoStack.push(action);

  console.log("HISTORY: redo applied", action);
  return true;
}

// ------------------------------------------------------------
// applyForwardAction(action, dominos, grid)
// ------------------------------------------------------------

/**
 * applyForwardAction(action, dominos, grid)
 * Applies an action in the forward direction (redo or initial apply).
 *
 * SUPPORTED ACTION TYPES:
 *   - place
 *   - move
 *   - rotate
 *   - return
 *
 * DIAGNOSTICS:
 *   - Logs if domino is missing.
 *   - Logs if action type is unknown.
 */
function applyForwardAction(action, dominos, grid) {
  const d = dominos.get(action.id);

  if (!d) {
    console.error("applyForwardAction: domino not found", action);
    return;
  }

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
    // { type:"rotate", id, prev:{...}, next:{...} }
    // ----------------------------------------
    case "rotate":
      d.row0 = action.next.r0;
      d.col0 = action.next.c0;
      d.row1 = action.next.r1;
      d.col1 = action.next.c1;
      break;

    // ----------------------------------------
    // return: board → tray
    // { type:"return", id, prev:{...} }
    // ----------------------------------------
    case "return":
      d.row0 = null;
      d.col0 = null;
      d.row1 = null;
      d.col1 = null;
      d.pivotHalf = null;
      break;

    default:
      console.error("applyForwardAction: unknown action type", action);
      break;
  }
}

// ------------------------------------------------------------
// applyInverseAction(action, dominos, grid)
// ------------------------------------------------------------

/**
 * applyInverseAction(action, dominos, grid)
 * Reverses an action for undo.
 *
 * SUPPORTED ACTION TYPES:
 *   - place
 *   - move
 *   - rotate
 *   - return
 *
 * DIAGNOSTICS:
 *   - Logs if domino is missing.
 *   - Logs if action type is unknown.
 */
function applyInverseAction(action, dominos, grid) {
  const d = dominos.get(action.id);

  if (!d) {
    console.error("applyInverseAction: domino not found", action);
    return;
  }

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

    default:
      console.error("applyInverseAction: unknown action type", action);
      break;
  }
}
