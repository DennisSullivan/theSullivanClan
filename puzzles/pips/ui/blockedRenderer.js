// ============================================================
// FILE: blockedRenderer.js
// PURPOSE: Visually mark blocked cells on the board.
// NOTES:
//   - Pure UI: reads blocked Set, never mutates engine state.
//   - Blocked cells get a .blocked class for styling.
//   - Medium diagnostics for impossible branches.
// ============================================================

export function renderBlockedCells(blocked, boardEl) {
  if (!boardEl || !(blocked instanceof Set)) return;

  // Remove previous blocked overlays
  boardEl.querySelectorAll(".blocked-overlay").forEach(el => el.remove());

  for (const key of blocked) {
    const [row, col] = key.split(",").map(Number);

    const cell = boardEl.querySelector(
      `.board-cell[data-row="${row}"][data-col="${col}"]`
    );

    if (!cell) continue;

    const overlay = document.createElement("div");
    overlay.className = "blocked-overlay";

    cell.appendChild(overlay);
  }
}
