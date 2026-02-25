// ============================================================
// FILE: ui/boardRenderer.js
// PURPOSE: Render the board grid and placed dominos.
// NOTES:
//   - Canonical board render is authoritative
//   - Session visuals (rotation ghost) are rendered last
// ============================================================

import { renderDomino } from "./dominoRenderer.js";
import { getRotationGhost, getRotatingDominoId } from "./rotation.js";

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // ------------------------------------------------------------
  // 1. Render board cells
  // ------------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "board-cell";
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;

      const regionId = regionMap[r][c];
      cellEl.classList.add(`region-${regionId}`);

      if (blocked.has(`${r},${c}`)) {
        cellEl.classList.add("blocked");
      }

      boardEl.appendChild(cellEl);
    }
  }

  // ------------------------------------------------------------
  // 2. Render canonical dominos (except rotating one)
  // ------------------------------------------------------------
  const rotatingId = getRotatingDominoId();

  for (const [id, d] of dominos) {
    if (d.row0 === null) continue;
    if (id === rotatingId) continue;

    const wrapper = createDominoWrapper(d);
    renderDomino(d, wrapper);
    boardEl.appendChild(wrapper);
  }

  // ------------------------------------------------------------
  // 3. Render rotation ghost LAST
  // ------------------------------------------------------------
  const ghost = getRotationGhost();
  if (ghost) {
    const d = dominos.get(ghost.id);
    if (d) {
      const wrapper = createDominoWrapper({
        ...d,
        row0: ghost.row0,
        col0: ghost.col0,
        row1: ghost.row1,
        col1: ghost.col1
      });

      wrapper.classList.add("ghost");
      renderDomino(d, wrapper);
      boardEl.appendChild(wrapper);
    }
  }
}

// ------------------------------------------------------------
// Helper: create positioned domino wrapper
// ------------------------------------------------------------
function createDominoWrapper(d) {
  const wrapper = document.createElement("div");
  wrapper.className = "domino-wrapper on-board";
  wrapper.dataset.dominoId = String(d.id);

  wrapper.style.setProperty("--row", d.row0);
  wrapper.style.setProperty("--col", d.col0);

  // Canonical half0 orientation
  if (d.row1 === d.row0) {
    wrapper.dataset.half0Side = d.col1 > d.col0 ? "left" : "right";
  } else {
    wrapper.dataset.half0Side = d.row1 > d.row0 ? "top" : "bottom";
  }

  return wrapper;
}
