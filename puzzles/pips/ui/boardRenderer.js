// boardRenderer.js
// This file is responsible for rendering the board’s current state into the DOM.
// It renders committed dominos using grid‑authoritative placement so alignment is
// deterministic and drift‑free, and it renders transient dominos (such as ghosts)
// using overlay‑authoritative pixel placement for smooth interaction and layering.

import { createDominoElement } from "./createDominoElement.js";
import { renderDomino } from "./dominoRenderer.js";

// renderBoard renders all dominos for the current board state into the given board
// element. It derives logical geometry from the board state, then enters the
// Placement Expression Phase (Chapter 3A) to decide whether each domino is rendered
// as committed (grid‑authoritative) or transient (overlay‑authoritative). Callers
// may pass options to indicate transient rendering such as ghost previews.
export function renderBoard(boardEl, boardState, options = {}) {
  const { ghost = false, ghostId = null } = options;

  // 1. Clear the board FIRST
  boardEl.innerHTML = "";

  // 2. Render board cells
  for (let row = 0; row < boardState.boardRows; row++) {
    for (let col = 0; col < boardState.boardCols; col++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      boardEl.appendChild(cell);
    }
  }

  // 3. Render dominos
  for (const d of boardState.dominos.values()) {
    if (!d.cells) continue;

    const cell0 = d.cells[0];
    const cell1 = d.cells[1];

    const wrapper = document.createElement("div");
    wrapper.classList.add("domino-wrapper", "on-board");
    wrapper.dataset.dominoId = String(d.id);

    wrapper.dataset.row0 = String(cell0.row);
    wrapper.dataset.col0 = String(cell0.col);
    wrapper.dataset.row1 = String(cell1.row);
    wrapper.dataset.col1 = String(cell1.col);

    const minRow = Math.min(cell0.row, cell1.row);
    const minCol = Math.min(cell0.col, cell1.col);

    const sameRow = cell0.row === cell1.row;
    const sameCol = cell0.col === cell1.col;

    wrapper.style.setProperty("--row-span", sameCol ? "2" : "1");
    wrapper.style.setProperty("--col-span", sameRow ? "2" : "1");

    const isTransient = ghost && String(d.id) === ghostId;

    if (isTransient) {
      const cs = parseFloat(getComputedStyle(boardEl).getPropertyValue("--cell-size"));
      const cg = parseFloat(getComputedStyle(boardEl).getPropertyValue("--cell-gap"));
      const cellSpan = cs + cg;

      wrapper.style.position = "absolute";
      wrapper.style.left = `${minCol * cellSpan}px`;
      wrapper.style.top  = `${minRow * cellSpan}px`;
      wrapper.classList.add("ghost");
    } else {
      wrapper.style.position = "relative";
      wrapper.style.gridRowStart = minRow + 1;
      wrapper.style.gridColumnStart = minCol + 1;
      wrapper.style.gridRowEnd = `span ${sameCol ? 2 : 1}`;
      wrapper.style.gridColumnEnd = `span ${sameRow ? 2 : 1}`;
    }

    const inner = createDominoElement();
    wrapper.appendChild(inner);
    renderDomino(d, wrapper);

    boardEl.appendChild(wrapper);
  }
}
