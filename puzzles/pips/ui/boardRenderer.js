// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Render board background + wrapper positions only.
// NOTES:
//   - Pure renderer: no state mutation.
//   - No angle transforms; geometry is canonical.
//   - Delegates all domino visuals to dominoRenderer.js.
// ============================================================

import { renderDomino } from "./dominoRenderer.js";

/**
 * renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
 * Renders:
 *   1. Background cells (region + blocked classes)
 *   2. One wrapper per placed domino
 *   3. Delegates domino visuals to renderDomino()
 *
 * PURE FUNCTION:
 *   - Does not mutate engine state.
 *   - Only updates DOM inside boardEl.
 */
export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) {
    console.error("renderBoard: boardEl is null/undefined.");
    return;
  }

  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
    console.error("renderBoard: invalid grid structure", grid);
    boardEl.innerHTML = "";
    return;
  }

  // Ensure absolute positioning context
  if (!boardEl.style.position) {
    boardEl.style.position = "relative";
  }

  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // ------------------------------------------------------------
  // 1. Render background cells
  // ------------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);

      // Region coloring
      if (regionMap && regionMap[r] && regionMap[r][c] != null) {
        cell.classList.add(`region-${regionMap[r][c]}`);
      }

      // Blocked cells
      if (blocked && blocked.has && blocked.has(`${r},${c}`)) {
        cell.classList.add("blocked");
      }

      boardEl.appendChild(cell);
    }
  }

  // ------------------------------------------------------------
  // 2. Render each placed domino wrapper
  // ------------------------------------------------------------
  const list = dominos && dominos.values ? Array.from(dominos.values()) : dominos;

  if (!Array.isArray(list)) {
    console.error("renderBoard: dominos is neither a Map nor an array", dominos);
    return;
  }

  for (const d of list) {
    // Skip tray dominos
    if (d.row0 == null || d.col0 == null || d.row1 == null || d.col1 == null) {
      continue;
    }

    if (d.id == null) {
      console.error("renderBoard: domino missing id; skipping", d);
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = String(d.id);

    // ----------------------------------------------------------
    // Position wrapper at the top-left of the domino's bounding box
    // ----------------------------------------------------------
    const cssRow = Math.min(d.row0, d.row1);
    const cssCol = Math.min(d.col0, d.col1);

    wrapper.style.setProperty("--row", String(cssRow));
    wrapper.style.setProperty("--col", String(cssCol));

    // ----------------------------------------------------------
    // Delegate visual rendering to dominoRenderer.js
    // ----------------------------------------------------------
    renderDomino(d, wrapper);

    boardEl.appendChild(wrapper);
  }
}
