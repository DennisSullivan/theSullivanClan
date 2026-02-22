// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Render the board background and all placed dominos
//          using grid occupancy as the sole source of truth.
// NOTES:
//   - Pure renderer: never mutates engine state.
//   - Board membership is derived from the grid, not domino fields.
//   - Exactly one wrapper is rendered per domino present in the grid.
//   - Visual details are delegated to dominoRenderer.js.
// ============================================================

import { renderDomino } from "./dominoRenderer.js";
import { findDominoCells } from "../engine/grid.js";

// ------------------------------------------------------------
// renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
// ------------------------------------------------------------
export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) {
    console.error("renderBoard: boardEl is null or undefined.");
    return;
  }

  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
    console.error("renderBoard: invalid grid structure", grid);
    boardEl.innerHTML = "";
    return;
  }

  // Ensure absolute positioning context for wrappers.
  if (!boardEl.style.position) {
    boardEl.style.position = "relative";
  }

  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;
  boardEl.style.gridTemplateColumns =
    `repeat(${cols}, calc(var(--cell-size) + var(--cell-gap)))`;
  
  boardEl.style.gridTemplateRows =
    `repeat(${rows}, calc(var(--cell-size) + var(--cell-gap)))`;
  boardEl.style.width =
    `calc(${cols} * (var(--cell-size) + var(--cell-gap)))`;
  
  boardEl.style.height =
    `calc(${rows} * (var(--cell-size) + var(--cell-gap)))`;

  // ----------------------------------------------------------
  // 1. Render background board cells
  // ----------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);

      if (regionMap && regionMap[r] && regionMap[r][c] != null) {
        cell.classList.add(`region-${regionMap[r][c]}`);
      }

      if (blocked && blocked.has && blocked.has(`${r},${c}`)) {
        cell.classList.add("blocked");
      }

      boardEl.appendChild(cell);
    }
  }

  // ----------------------------------------------------------
  // 2. Render one wrapper per domino present in the grid
  // ----------------------------------------------------------
  const list = dominos instanceof Map ? dominos : new Map(dominos);

  for (const [id, d] of list) {
    const cells = findDominoCells(grid, String(d.id));
    if (cells.length === 0) continue;

    if (d.id == null) {
      console.error("renderBoard: domino missing id; skipping", d);
      continue;
    }

    // --------------------------------------------------------
    // Anchor wrapper to HALF 0 (engine truth)
    // --------------------------------------------------------
    const half0 = cells.find(c => c.half === 0) || cells[0];

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = String(d.id);

    // Derive orientation from grid truth
    const isVertical =
      cells.length === 2 && cells[0].col === cells[1].col;

    const cell0 = cells.find(c => c.half === 0);
    const cell1 = cells.find(c => c.half === 1);
    
    let half0Side;
    
    if (cell0 && cell1) {
      if (cell0.row === cell1.row) {
        half0Side = cell0.col < cell1.col ? "left" : "right";
      } else {
        half0Side = cell0.row < cell1.row ? "top" : "bottom";
      }
    } else {
      half0Side = "left"; // defensive fallback
    }
    
    wrapper.dataset.half0Side = half0Side;
   
    wrapper.dataset.half0Side = half0Side;

    wrapper.style.setProperty("--row", String(half0.row));
    wrapper.style.setProperty("--col", String(half0.col));

    // Delegate visual construction
    renderDomino(d, wrapper);

    boardEl.appendChild(wrapper);
  }
}
