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

  // Clear the board before re‑rendering all dominos.
  boardEl.innerHTML = "";

console.log("boardState.dominos =", boardState.dominos);
  for (const d of boardState.dominos) {
    const cell0 = d.cells[0];
    const cell1 = d.cells[1];

    // Create the outer wrapper that will either participate in the grid
    // (committed) or act as an absolute overlay (transient).
    const wrapper = document.createElement("div");
    wrapper.classList.add("domino-wrapper", "on-board");
    wrapper.dataset.dominoId = String(d.id);

    // Persist logical cell coordinates on the wrapper so orientation and
    // appearance renderers can remain geometry‑agnostic.
    wrapper.dataset.row0 = String(cell0.row);
    wrapper.dataset.col0 = String(cell0.col);
    wrapper.dataset.row1 = String(cell1.row);
    wrapper.dataset.col1 = String(cell1.col);

    // Derive the logical bounding box for the domino from its occupied cells.
    const minRow = Math.min(cell0.row, cell1.row);
    const minCol = Math.min(cell0.col, cell1.col);

    const sameRow = (cell0.row === cell1.row);
    const sameCol = (cell0.col === cell1.col);

    // Expose logical spans as CSS variables so sizing and orientation can be
    // handled declaratively without recomputing geometry.
    wrapper.style.setProperty("--row-span", sameCol ? "2" : "1");
    wrapper.style.setProperty("--col-span", sameRow ? "2" : "1");

    // === Placement Expression Phase (Chapter 3A): select grid‑authoritative
    //     (committed) or overlay‑authoritative (transient) geometry ===

    const isTransient = ghost && String(d.id) === ghostId;

    if (isTransient) {
      // Transient dominos are rendered as absolute overlays so they can move
      // freely, animate smoothly, and layer above committed content.
      const cs = parseFloat(
        getComputedStyle(boardEl).getPropertyValue("--cell-size")
      );
      const cg = parseFloat(
        getComputedStyle(boardEl).getPropertyValue("--cell-gap")
      );
      const cellSpan = cs + cg;

      wrapper.style.position = "absolute";
      wrapper.style.left = `${minCol * cellSpan}px`;
      wrapper.style.top  = `${minRow * cellSpan}px`;
      wrapper.classList.add("ghost");
    } else {
      // Committed dominos are rendered as grid children so the grid owns all
      // spacing, rounding, and alignment decisions.
      wrapper.style.position = "relative";
      wrapper.style.gridRowStart = minRow + 1;
      wrapper.style.gridColumnStart = minCol + 1;
      wrapper.style.gridRowEnd = `span ${sameCol ? 2 : 1}`;
      wrapper.style.gridColumnEnd = `span ${sameRow ? 2 : 1}`;
    }

    // Create and render the inner domino structure, which handles appearance
    // and orientation but never placement.
    const inner = createDominoElement();
    wrapper.appendChild(inner);
    renderDomino(d, wrapper);

    boardEl.appendChild(wrapper);
  }
}
