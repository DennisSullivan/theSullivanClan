// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Renders the puzzle board, including:
//          - grid cells
//          - blocked cells
//          - region overlays
//          - dominos in board positions
// NOTES:
//   - Pure UI: reads engine state, never mutates it.
//   - Board orientation is derived from geometry only.
//   - Delegates domino visuals to dominoRenderer.
// ============================================================

import { renderDomino } from "./dominoRenderer.js";
import { renderBlockedCells } from "./blockedRenderer.js";
import { renderRegions } from "./regionRenderer.js";
import { renderRegionBadges } from "./badgeRenderer.js";


// ------------------------------------------------------------
// renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
// ------------------------------------------------------------
export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  boardEl.innerHTML = ""; // full redraw

  const rows = grid.length;
  const cols = grid[0].length;

  // Configure CSS grid
  boardEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // Base grid
  drawGridCells(boardEl, rows, cols);

  // Blocked cells
  renderBlockedCells(blocked, boardEl);

  // Region overlays + badges
  renderRegions(regionMap, boardEl);
  renderRegionBadges(regions, boardEl);

  // Dominos
  renderBoardDominos(dominos, boardEl);
}


// ------------------------------------------------------------
// drawGridCells
// ------------------------------------------------------------
function drawGridCells(boardEl, rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
    }
  }
}


// ------------------------------------------------------------
// renderBoardDominos
// ------------------------------------------------------------
function renderBoardDominos(dominos, boardEl) {
  for (const [id, d] of dominos) {
    if (d.row0 === null) continue; // still in tray

    const wrapper = createDominoWrapper(d);
    boardEl.appendChild(wrapper);

    renderDomino(d, wrapper);
  }
}


// ------------------------------------------------------------
// createDominoWrapper
// ------------------------------------------------------------
function createDominoWrapper(domino) {
  const wrapper = document.createElement("div");
  wrapper.className = "domino-wrapper";

  // Position at half0's cell using stride = size + gap
  wrapper.style.position = "absolute";
  wrapper.style.left = `calc(${domino.col0} * (var(--cell-size) + var(--cell-gap)))`;
  wrapper.style.top  = `calc(${domino.row0} * (var(--cell-size) + var(--cell-gap)))`;

  // Optional: attach ID for debugging
  wrapper.dataset.id = domino.id;

  return wrapper;
}
