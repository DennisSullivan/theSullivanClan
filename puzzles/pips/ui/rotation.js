// ============================================================
// FILE: ui/boardRenderer.js
// PURPOSE: Render board cells and dominos.
// NOTES:
//   - Grid is authoritative for logical placement.
//   - During rotation preview, wrapper is visually anchored
//     to the pivot half so the pivot appears fixed.
// ============================================================

import { renderDomino } from "./dominoRenderer.js";
import { findDominoCells } from "../engine/grid.js";
import { getRotationGhost, getRotatingDominoId } from "./rotation.js";

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
  // 2. Render dominos (grid‑derived, ghost‑aware)
  // ----------------------------------------------------------
  const rotatingId = getRotatingDominoId();
  const ghost = getRotationGhost();

  for (const [id, d] of dominos) {
    let cells;

    if (id === rotatingId && ghost) {
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

    let half0Side = "left";
    if (cell0 && cell1) {
      if (cell0.row === cell1.row) {
        half0Side = cell0.col < cell1.col ? "left" : "right";
      } else {
        half0Side = cell0.row < cell1.row ? "top" : "bottom";
      }
    }

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = String(d.id);
    wrapper.dataset.half0Side = half0Side;

    // ----------------------------------------------------------
    // Rotation Preview Visual Anchor:
    //   - Normal: anchor to half0
    //   - Rotation preview: anchor to pivot half (half1)
    // ----------------------------------------------------------
    const anchor =
      (id === rotatingId && ghost)
        ? cell1
        : cell0;

    wrapper.style.setProperty("--row", String(anchor.row));
    wrapper.style.setProperty("--col", String(anchor.col));

    if (id === rotatingId && ghost) {
      wrapper.classList.add("ghost");
    }

    renderDomino(d, wrapper);
    boardEl.appendChild(wrapper);
  }
}
