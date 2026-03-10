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

  console.log("Blocked called");
  // Remove previous blocked overlays
  boardEl.querySelectorAll(".blocked-overlay").forEach(el => el.remove());

  for (const key of blocked) {
    const [row, col] = key.split(",").map(Number);

    const el = document.createElement("div");
    el.className = "blocked-overlay";

    el.style.left = `calc(${col} * (var(--cell-size) - (var(--cell-gap) / 2))`;
    el.style.top  = `calc(${row} * (var(--cell-size) - (var(--cell-gap) / 2))`;

    boardEl.appendChild(el);
  }
}

