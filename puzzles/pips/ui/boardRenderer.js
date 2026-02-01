// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Canonical board renderer using geometry‑first model
// NOTES:
//   - Uses renderDomino() for pip grids
//   - One wrapper per domino (created at half0 only)
//   - Wrapper positioned via CSS variables (--row, --col)
//   - Board cells rendered first, dominos layered on top
// ============================================================

import { renderDomino } from "./dominoRenderer.js";

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // ------------------------------------------------------------
  // 1. Render board cells (background grid)
  // ------------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "board-cell";
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;

      // Region class
      const regionId = regionMap[r][c];
      cellEl.classList.add(`region-${regionId}`);

      // Blocked?
      if (blocked.has(`${r},${c}`)) {
        cellEl.classList.add("blocked");
      }

      boardEl.appendChild(cellEl);
    }
  }

  // ------------------------------------------------------------
  // 2. Render dominos (one wrapper per domino)
  // ------------------------------------------------------------
  for (const [id, d] of dominos) {
    if (d.row0 === null) continue; // tray dominos not shown here

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";

    // Position via CSS variables (canonical)
    wrapper.style.setProperty("--row", d.row0);
    wrapper.style.setProperty("--col", d.col0);

    // Render the domino inside the wrapper
    renderDomino(d, wrapper);

    boardEl.appendChild(wrapper);
  }
}
