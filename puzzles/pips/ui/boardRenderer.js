// FILE: ui/boardRenderer.js
// PURPOSE: Render placed dominos on the board with pip DOM and CSS variables.
// NOTES (conversational): This renderer builds the exact DOM structure and attributes
// the CSS expects: .domino-wrapper.on-board, --row/--col/--angle, .half[data-pip],
// and seven .pip elements inside each half. It is defensive about property names
// (value0/value1 or half0/half1) and logs a small diagnostic if a domino lacks pip data.

/**
 * renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
 * Purpose: Rebuild the board DOM from model geometry.
 * Use: Call after any placement/mutation. This function is pure rendering only;
 * it does not mutate model state.
 */
export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) return;
  if (!boardEl.style.position) boardEl.style.position = "relative";

  // Clear board
  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // Build grid cells (visual background)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      if (regionMap && regionMap[r] && regionMap[r][c] != null) {
        cell.classList.add(`region-${regionMap[r][c]}`);
      }
      if (blocked && blocked[r] && blocked[r][c]) cell.classList.add("blocked");
      boardEl.appendChild(cell);
    }
  }

  // Helper: create seven pip elements (p1..p7)
  function createPips() {
    const container = document.createElement("div");
    container.className = "pip-grid";
    // Keep layout minimal; CSS will position .pip elements.
    for (let i = 1; i <= 7; i++) {
      const p = document.createElement("div");
      p.className = `pip p${i}`;
      container.appendChild(p);
    }
    return container;
  }

  // Render each placed domino
  const list = dominos.values ? Array.from(dominos.values()) : dominos;
  for (const domino of list) {
    // Skip tray dominos
    if (domino.row0 == null || domino.col0 == null) continue;

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = domino.id;

    // Orientation from geometry
    const isVertical = domino.col0 === domino.col1;
    const angle = isVertical ? 90 : 0;
    wrapper.style.setProperty("--angle", `${angle}deg`);

    // Anchor at the minimum row/col of the two halves (board.css expects this)
    const anchorRow = Math.min(domino.row0, domino.row1);
    const anchorCol = Math.min(domino.col0, domino.col1);
    wrapper.style.setProperty("--row", String(anchorRow));
    wrapper.style.setProperty("--col", String(anchorCol));

    // Inner domino and halves
    const inner = document.createElement("div");
    inner.className = "domino on-board";

    const pip0 = domino.pip0;
    const pip1 = domino.pip1;

    // Half 0
    const half0 = document.createElement("div");
    half0.className = "half half0";
    // Ensure data-pip is a string (CSS attribute selectors expect strings)
    half0.dataset.pip = String(pip0);
    half0.appendChild(createPips());
    // Optional visible label for debugging (hidden by default in CSS)
    const lbl0 = document.createElement("div");
    lbl0.className = "pip-label";
    lbl0.textContent = String(pip0);
    lbl0.style.display = "none";
    half0.appendChild(lbl0);

    // Half 1
    const half1 = document.createElement("div");
    half1.className = "half half1";
    half1.dataset.pip = String(pip1);
    half1.appendChild(createPips());
    const lbl1 = document.createElement("div");
    lbl1.className = "pip-label";
    lbl1.textContent = String(pip1);
    lbl1.style.display = "none";
    half1.appendChild(lbl1);

    inner.appendChild(half0);
    inner.appendChild(half1);
    wrapper.appendChild(inner);

    // Append wrapper to board; CSS positions/rotates using --row/--col/--angle
    boardEl.appendChild(wrapper);

    // Small diagnostic if both halves are zero (helps find model naming mismatches)
    if ((String(pip0) === "0" && String(pip1) === "0") && (domino.value0 == null && domino.value1 == null && domino.half0 == null && domino.half1 == null)) {
      // eslint-disable-next-line no-console
      console.debug(`boardRenderer: domino ${domino.id} has no pip fields (value0/value1/half0/half1).`, domino);
    }
  }
}
