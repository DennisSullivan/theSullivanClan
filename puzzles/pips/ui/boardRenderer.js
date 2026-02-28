// ============================================================
// FILE: ui/boardRenderer.js
// PURPOSE: Render board cells and dominos (two‑element DOM model).
// NOTES:
//   - Grid is authoritative for logical placement.
//   - rotationGhost is a visual-only override for one domino.
//   - HARD INVARIANT: wrapper origin is ALWAYS half0.
// ============================================================

import { createDominoElement } from "./dominoFactory.js";
import { findDominoCells } from "../engine/grid.js";
import { getRotationGhost } from "./rotation.js";

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) return;

  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  boardEl.style.position = "relative";
  boardEl.style.gridTemplateColumns =
    `repeat(${cols}, calc(var(--cell-size) + var(--cell-gap)))`;
  boardEl.style.gridTemplateRows =
    `repeat(${rows}, calc(var(--cell-size) + var(--cell-gap)))`;

  // ----------------------------------------------------------
  // 1. Render background cells
  // ----------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);

      if (blocked?.has(`${r},${c}`)) {
        cell.classList.add("blocked");
      }

      boardEl.appendChild(cell);
    }
  }

  // ----------------------------------------------------------
  // 2. Render dominos (grid-derived, ghost-aware)
  // ----------------------------------------------------------
  const ghost = getRotationGhost();
  const ghostId = ghost ? String(ghost.id) : null;

  for (const [id, d] of dominos) {
    let cells;

    if (ghost && String(id) === ghostId) {
      // Visual-only ghost geometry
      cells = [
        { row: ghost.row0, col: ghost.col0, half: 0 },
        { row: ghost.row1, col: ghost.col1, half: 1 }
      ];
    } else {
      cells = findDominoCells(grid, String(d.id));
    }

    if (cells.length === 0) continue;

    const cell0 = cells.find(c => c.half === 0);
    const cell1 = cells.find(c => c.half === 1);
    if (!cell0 || !cell1) continue;

    // Determine orientation from geometry
    let half0Side = "left";
    if (cell0.row === cell1.row) {
      half0Side = cell0.col < cell1.col ? "left" : "right";
    } else {
      half0Side = cell0.row < cell1.row ? "top" : "bottom";
    }

    // ----------------------------------------------------------
    // Create canonical two‑element DOM
    // ----------------------------------------------------------
    const wrapper = createDominoElement(d.half0, d.half1);
    wrapper.classList.add("domino-wrapper", "on-board");
    wrapper.dataset.dominoId = String(d.id);
    wrapper.dataset.half0Side = half0Side;

    // HARD INVARIANT: wrapper origin is always half0
    wrapper.style.setProperty("--row", String(cell0.row));
    wrapper.style.setProperty("--col", String(cell0.col));

    if (ghost && String(id) === ghostId) {
      wrapper.classList.add("ghost");
    }

    boardEl.appendChild(wrapper);
  }
}
