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
// Renders the entire board in three conceptual passes:
//
//   1. Background board cells (regions + blocked markers)
//   2. One wrapper per domino present in the grid
//   3. Delegates domino visuals to ()
//
// This function deliberately derives board membership from
// grid occupancy rather than domino metadata. If a domino
// occupies any grid cell, it is rendered exactly once.
//
// INPUTS:
//   dominos   - Map or iterable of canonical domino objects
//   grid      - canonical grid occupancy structure
//   regionMap - region id per cell (optional)
//   blocked   - Set of blocked cell keys (optional)
//   regions   - region metadata (unused here, passed through)
//   boardEl   - DOM element that owns the board
//
// GUARANTEES:
//   - Board rendering reflects engine truth exactly.
//   - No tray dominos appear on the board.
//   - No duplicate wrappers are created.
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

  // ----------------------------------------------------------
  // 1. Render background board cells
  // ----------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);

      // Apply region coloring if provided.
      if (regionMap && regionMap[r] && regionMap[r][c] != null) {
        cell.classList.add(`region-${regionMap[r][c]}`);
      }

      // Apply blocked marker if present.
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
    // Ask the grid whether this domino occupies any cells.
    // If it does not, it belongs in the tray and must not
    // appear on the board.
    const cells = findDominoCells(grid, String(d.id));
    if (cells.length === 0) continue;

    if (d.id == null) {
      console.error("renderBoard: domino missing id; skipping", d);
      continue;
    }

    // Determine the top-left anchor of the domino's bounding box.
    // This ensures consistent wrapper positioning regardless of
    // orientation.
    let minRow = Infinity;
    let minCol = Infinity;

    for (const cell of cells) {
      minRow = Math.min(minRow, cell.row);
      minCol = Math.min(minCol, cell.col);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = String(d.id);
    
    // Derive orientation from grid truth
    const isVertical = cells.length === 2 && cells[0].col === cells[1].col;
    wrapper.dataset.orientation = isVertical ? "V" : "H";
    
    const isVertical = wrapper.dataset.orientation === "V";
    
    wrapper.style.setProperty("--row", String(minRow));
    wrapper.style.setProperty("--col", String(minCol));
    
    if (isVertical) {
      wrapper.style.setProperty("--domino-nudge-y", "0px");
      wrapper.style.setProperty("--domino-nudge-x", "0px");
    }
    
    // Delegate visual construction to the domino renderer.
    renderDomino(d, wrapper);
    
    boardEl.appendChild(wrapper);
  }
}
