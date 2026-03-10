// ============================================================
// FILE: ui/boardRenderer.js
// PURPOSE: Render board cells and dominos (two‑element DOM model).
// CONTRACT:
//   - Board grid owns inter‑cell spacing (cell-gap).
//   - Domino geometry uses cell-size only.
//   - Wrapper origin is top‑left of bounding box.
//   - No renderer may double‑count cell-gap.
// ============================================================

import { createDominoElement } from "./createDominoElement.js";
import { renderDomino } from "./dominoRenderer.js";
import { findDominoCells } from "../engine/grid.js";
import { getRotationGhost } from "./rotation.js";

// ------------------------------------------------------------
// renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
// ------------------------------------------------------------
export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) return;

  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // ----------------------------------------------------------
  // Board grid — authoritative geometry owner
  // ----------------------------------------------------------
  boardEl.style.position = "relative";
  boardEl.style.display = "grid";
  boardEl.style.gridTemplateColumns =
    `repeat(${cols}, var(--cell-size))`;
  boardEl.style.gridTemplateRows =
    `repeat(${rows}, var(--cell-size))`;
  boardEl.style.gap = "var(--cell-gap)";

  // ----------------------------------------------------------
  // Precompute cell size (NO gap math here)
  // ----------------------------------------------------------
  const cs = parseFloat(
    getComputedStyle(boardEl).getPropertyValue("--cell-size")
  );

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
  const ghost = getRotationGhost();
  const ghostId = ghost ? String(ghost.id) : null;

  for (const [id, d] of dominos) {
    let cells;

    if (ghost && String(id) === ghostId) {
      cells = [
        { row: ghost.row0, col: ghost.col0, half: 0 },
        { row: ghost.row1, col: ghost.col1, half: 1 }
      ];
    } else {
      cells = findDominoCells(grid, String(d.id));
    }

    if (!cells || cells.length !== 2) continue;

    const cell0 = cells.find(c => c.half === 0);
    const cell1 = cells.find(c => c.half === 1);
    if (!cell0 || !cell1) continue;

    // ----------------------------------------------------------
    // Create wrapper
    // ----------------------------------------------------------
    const wrapper = document.createElement("div");
    wrapper.classList.add("domino-wrapper", "on-board");
    wrapper.dataset.dominoId = String(d.id);

    wrapper.dataset.row0 = String(cell0.row);
    wrapper.dataset.col0 = String(cell0.col);
    wrapper.dataset.row1 = String(cell1.row);
    wrapper.dataset.col1 = String(cell1.col);

    // ----------------------------------------------------------
    // Anchor wrapper at bounding‑box top‑left (cell origin)
    // ----------------------------------------------------------
    const minRow = Math.min(cell0.row, cell1.row);
    const minCol = Math.min(cell0.col, cell1.col);

    wrapper.style.left = `${minCol * cs}px`;
    wrapper.style.top  = `${minRow * cs}px`;

    // ----------------------------------------------------------
    // Geometry‑driven wrapper sizing (NO gap)
    // ----------------------------------------------------------
    const sameRow = (cell0.row === cell1.row);
    const sameCol = (cell0.col === cell1.col);

    wrapper.style.setProperty("--row-span", sameCol ? "2" : "1");
    wrapper.style.setProperty("--col-span", sameRow ? "2" : "1");

    if (ghost && String(id) === ghostId) {
      wrapper.classList.add("ghost");
    }

    const inner = createDominoElement();
    wrapper.appendChild(inner);

    renderDomino(d, wrapper);
    boardEl.appendChild(wrapper);
  }
}
