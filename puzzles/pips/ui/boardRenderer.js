// boardRenderer.js
// Renders the board’s current state into the DOM.
// Committed dominos use grid‑authoritative placement.
// Transient dominos (ghosts) use overlay‑authoritative placement.

import { createDominoElement } from "./createDominoElement.js";
import { renderDomino } from "./dominoRenderer.js";

export function renderBoard(boardEl, boardState, options = {}) {
  const { ghost = false, ghostId = null } = options;
console.log("renderBoard dominos:", [...boardState.dominos.values()]);

  // 1. Clear board
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

  // 2A. Mini‑puzzle outlines (§11.4A)
  if (boardState.miniPuzzles) {
    const cellToPuzzle = new Map();

    for (const puzzle of boardState.miniPuzzles) {
      for (const cell of puzzle.cells) {
        cellToPuzzle.set(`${cell.row},${cell.col}`, puzzle.id);
      }
    }

    const samePuzzle = (r1, c1, r2, c2) =>
      cellToPuzzle.get(`${r1},${c1}`) === cellToPuzzle.get(`${r2},${c2}`);

    const edgeFlags = (r, c) => ({
      top:    r === 0 || !samePuzzle(r, c, r - 1, c),
      right:  c === boardState.boardCols - 1 || !samePuzzle(r, c, r, c + 1),
      bottom: r === boardState.boardRows - 1 || !samePuzzle(r, c, r + 1, c),
      left:   c === 0 || !samePuzzle(r, c, r, c - 1),
    });

    for (let row = 0; row < boardState.boardRows; row++) {
      for (let col = 0; col < boardState.boardCols; col++) {
        const key = `${row},${col}`;
        if (!cellToPuzzle.has(key)) continue;

        const cellEl = boardEl.querySelector(
          `.board-cell[data-row="${row}"][data-col="${col}"]`
        );
        if (!cellEl) continue;

        const { top, right, bottom, left } = edgeFlags(row, col);

        // ---- Edges ----
        if (top) {
          const e = document.createElement("div");
          e.className = "subgrid-edge edge-top";
          cellEl.appendChild(e);
        }
        if (right) {
          const e = document.createElement("div");
          e.className = "subgrid-edge edge-right";
          cellEl.appendChild(e);
        }
        if (bottom) {
          const e = document.createElement("div");
          e.className = "subgrid-edge edge-bottom";
          cellEl.appendChild(e);
        }
        if (left) {
          const e = document.createElement("div");
          e.className = "subgrid-edge edge-left";
          cellEl.appendChild(e);
        }

        // ---- Gap bridges ----
        if (col < boardState.boardCols - 1 && samePuzzle(row, col, row, col + 1)) {
          const n = edgeFlags(row, col + 1);

          if (top && n.top) {
            const b = document.createElement("div");
            b.className = "subgrid-bridge bridge-top";
            cellEl.appendChild(b);
          }
          if (bottom && n.bottom) {
            const b = document.createElement("div");
            b.className = "subgrid-bridge bridge-bottom";
            cellEl.appendChild(b);
          }
        }

        if (row < boardState.boardRows - 1 && samePuzzle(row, col, row + 1, col)) {
          const n = edgeFlags(row + 1, col);

          if (left && n.left) {
            const b = document.createElement("div");
            b.className = "subgrid-bridge bridge-left";
            cellEl.appendChild(b);
          }
          if (right && n.right) {
            const b = document.createElement("div");
            b.className = "subgrid-bridge bridge-right";
            cellEl.appendChild(b);
          }
        }

        // ---- Corners ----
        if (top && left) {
          const c = document.createElement("div");
          c.className = "subgrid-corner corner-tl";
          cellEl.appendChild(c);
        }
        if (top && right) {
          const c = document.createElement("div");
          c.className = "subgrid-corner corner-tr";
          cellEl.appendChild(c);
        }
        if (bottom && right) {
          const c = document.createElement("div");
          c.className = "subgrid-corner corner-br";
          cellEl.appendChild(c);
        }
        if (bottom && left) {
          const c = document.createElement("div");
          c.className = "subgrid-corner corner-bl";
          cellEl.appendChild(c);
        }
      }
    }
  }

  // 3. Render dominos
  for (const d of boardState.dominos.values()) {
    if (!d.cells) continue;

    const [cell0, cell1] = d.cells;
    const minRow = Math.min(cell0.row, cell1.row);
    const minCol = Math.min(cell0.col, cell1.col);

    const sameRow = cell0.row === cell1.row;
    const sameCol = cell0.col === cell1.col;

    const wrapper = document.createElement("div");
    wrapper.classList.add("domino-wrapper", "on-board");
    wrapper.dataset.dominoId = String(d.id);

    wrapper.style.setProperty("--row-span", sameCol ? "2" : "1");
    wrapper.style.setProperty("--col-span", sameRow ? "2" : "1");

    const isTransient = ghost && String(d.id) === ghostId;

    if (isTransient) {
      const cs = parseFloat(getComputedStyle(boardEl).getPropertyValue("--cell-size"));
      const cg = parseFloat(getComputedStyle(boardEl).getPropertyValue("--cell-gap"));
      const span = cs + cg;

      wrapper.style.position = "absolute";
      wrapper.style.left = `${minCol * span}px`;
      wrapper.style.top  = `${minRow * span}px`;
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
    boardEl.querySelector(".board-dominos").appendChild(wrapper);
  }
}
