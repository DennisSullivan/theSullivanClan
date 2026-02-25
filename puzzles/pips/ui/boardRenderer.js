// ============================================================
// FILE: ui/boardRenderer.js
// PURPOSE: Render the board grid and placed dominos.
// NOTES:
//   - Canonical board render is authoritative
//   - Session visuals (rotation ghost) are rendered last
// ============================================================

import { getRotationGhost, getRotatingDominoId } from "./rotation.js";
import { renderBoardDomino } from "./dominoRenderer.js";

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  // Clear board
  boardEl.innerHTML = "";

  // ------------------------------------------------------------
  // Render board grid cells
  // ------------------------------------------------------------
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
    }
  }

  // ------------------------------------------------------------
  // Render canonical board dominos
  // Suppress the domino currently in a rotation session
  // ------------------------------------------------------------
  const rotatingId = getRotatingDominoId();

  for (const domino of dominos.values()) {
    if (domino.row0 === null) continue;
    if (domino.id === rotatingId) continue;

    renderBoardDomino(domino, boardEl);
  }

  // ------------------------------------------------------------
  // Render rotation ghost LAST (session visual)
  // ------------------------------------------------------------
  const ghost = getRotationGhost();
  if (ghost) {
    const d = dominos.get(ghost.id);
    if (d) {
      renderBoardDomino(
        {
          ...d,
          row0: ghost.row0,
          col0: ghost.col0,
          row1: ghost.row1,
          col1: ghost.col1
        },
        boardEl,
        { ghost: true }
      );
    }
  }
}
