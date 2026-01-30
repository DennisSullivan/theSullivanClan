// ============================================================
// FILE: blockedRenderer.js
// PURPOSE: Visually marks blocked cells on the board.
// NOTES:
//   - Pure UI: reads blocked Set, never mutates engine state.
//   - Blocked cells get a .blocked class for styling.
// ============================================================


// ------------------------------------------------------------
// renderBlockedCells(blocked, boardEl)
// Applies the .blocked class to all blocked cells.
// INPUTS:
//   blocked - Set of "row,col" strings
//   boardEl - DOM element for the board container
// NOTES:
//   - Assumes boardEl already contains .board-cell elements.
//   - Clears previous .blocked classes before applying new ones.
// ------------------------------------------------------------
export function renderBlockedCells(blocked, boardEl) {
  const cells = boardEl.querySelectorAll(".board-cell");

  for (const cell of cells) {
    // Remove any previous blocked state
    cell.classList.remove("blocked");

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    const key = `${row},${col}`;

    if (blocked.has(key)) {
      cell.classList.add("blocked");
    }
  }
}

