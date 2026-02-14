// ============================================================
// FILE: blockedRenderer.js
// PURPOSE: Visually mark blocked cells on the board.
// NOTES:
//   - Pure UI: reads blocked Set, never mutates engine state.
//   - Blocked cells get a .blocked class for styling.
//   - Medium diagnostics for impossible branches.
// ============================================================

/**
 * renderBlockedCells(blocked, boardEl)
 * Applies the .blocked class to all blocked cells.
 *
 * EXPECTS:
 *   - blocked: Set of "row,col" strings.
 *   - boardEl: DOM element containing .board-cell elements.
 *
 * BEHAVIOR:
 *   - Removes previous .blocked classes.
 *   - Adds .blocked to cells whose coordinates appear in the Set.
 *
 * PURE FUNCTION:
 *   - Does not mutate engine state.
 *   - Only updates DOM classes on existing board cells.
 */
export function renderBlockedCells(blocked, boardEl) {
  // Defensive: boardEl must exist.
  if (!boardEl) {
    console.error("renderBlockedCells: boardEl is null/undefined.");
    return;
  }

  // Defensive: blocked must be a Set.
  if (!(blocked instanceof Set)) {
    console.error("renderBlockedCells: blocked is not a Set", blocked);
    return;
  }

  const cells = boardEl.querySelectorAll(".board-cell");

  // If no cells exist, this indicates boardRenderer hasn't run yet.
  if (cells.length === 0) {
    console.warn("renderBlockedCells: no .board-cell elements found. Did renderBoard run first?");
    return;
  }

  for (const cell of cells) {
    // Remove any previous blocked state.
    cell.classList.remove("blocked");

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    // Defensive: ensure row/col are valid numbers.
    if (Number.isNaN(row) || Number.isNaN(col)) {
      console.error("renderBlockedCells: cell has invalid row/col dataset", cell);
      continue;
    }

    const key = `${row},${col}`;

    if (blocked.has(key)) {
      cell.classList.add("blocked");
    }
  }

  console.log("BLOCKED: applied blocked classes to board cells");
}
