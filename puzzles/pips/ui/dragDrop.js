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


// ------------------------------------------------------------
// renderBoard(dominos, grid, regionMap, blocked, boardEl)
// Renders the entire board state.
// INPUTS:
//   dominos   - Map<id,Domino>
//   grid      - occupancy map
//   regionMap - 2D array of region IDs
//   blocked   - Set of "r,c" strings
//   boardEl   - DOM element for the board container
// NOTES:
//   - Clears boardEl and rebuilds everything.
//   - Board cells are drawn as a CSS grid.
//   - Domino elements are positioned absolutely.
// ------------------------------------------------------------
export function renderBoard(dominos, grid, regionMap, blocked, boardEl) {
  boardEl.innerHTML = ""; // full redraw for simplicity

  const rows = grid.length;
  const cols = grid[0].length;

  // Configure CSS grid
  boardEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // Draw base grid cells
  drawGridCells(boardEl, rows, cols);

  // Draw blocked cells
  renderBlockedCells(blocked, boardEl);

  // Draw region overlays
  renderRegions(regionMap, boardEl);

  // Draw dominos
  renderBoardDominos(dominos, boardEl);
}


// ------------------------------------------------------------
// drawGridCells(boardEl, rows, cols)
// Creates the base grid cell elements.
// NOTES:
//   - These are background-only; dominos are absolutely positioned.
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
// renderBoardDominos(dominos, boardEl)
// Renders all dominos that are currently on the board.
// NOTES:
//   - Each domino is positioned using CSS translate.
//   - Orientation is handled by dominoRenderer.
// ------------------------------------------------------------
function renderBoardDominos(dominos, boardEl) {
  for (const [id, d] of dominos) {
    if (d.row0 === null) continue; // in tray, skip

    const wrapper = createDominoWrapper(d);
    boardEl.appendChild(wrapper);

    // Render the domino inside the wrapper
    renderDomino(d, wrapper);
  }
}


// ------------------------------------------------------------
// createDominoWrapper(domino)
// Creates a positioned wrapper for a board domino.
// NOTES:
//   - Wrapper is absolutely positioned at half0's cell.
//   - dominoRenderer handles rotation.
// ------------------------------------------------------------
function createDominoWrapper(domino) {
  const wrapper = document.createElement("div");
  wrapper.className = "domino-wrapper";

  // Position at half0's cell
  wrapper.style.position = "absolute";
  wrapper.style.left = `calc(${domino.col0} * var(--cell-size))`;
  wrapper.style.top  = `calc(${domino.row0} * var(--cell-size))`;

  return wrapper;
}

