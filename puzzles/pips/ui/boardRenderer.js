// FILE: ui/boardRenderer.js
// PURPOSE: Geometry-driven renderer for dominos on the board.
// NOTES (conversational): This renderer follows the CSS model in board.css.
// It creates .domino-wrapper.on-board elements, sets --row/--col/--angle,
// and builds .half[data-pip] with .pip children so CSS pip selectors work.

 /**
  * renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
  * Purpose: Render the entire board grid and all placed dominos.
  * Use: Call whenever the engine geometry (domino.row* or col*) or grid changes.
  * The function is intentionally simple: it clears boardEl and rebuilds DOM from geometry.
  */
export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) return;
  if (!boardEl.style.position) boardEl.style.position = "relative";

  // Clear and rebuild
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

  /**
   * createPips()
   * Purpose: Build the seven pip elements used by the CSS pip selectors.
   * Use: appended into each half so CSS rules like .half[data-pip="3"] .p1 { opacity: 1 } work.
   */
  function createPips() {
    const container = document.createElement("div");
    container.className = "pip-grid";
    container.style.display = "grid";
    container.style.gridTemplateRows = "1fr 1fr 1fr";
    container.style.gridTemplateColumns = "1fr 1fr 1fr";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.alignItems = "center";
    container.style.justifyItems = "center";

    for (let i = 1; i <= 7; i++) {
      const p = document.createElement("div");
      p.className = `pip p${i}`;
      container.appendChild(p);
    }
    return container;
  }

  // Render each placed domino from geometry
  for (const domino of dominos.values ? dominos.values() : dominos) {
    // Skip tray dominos
    if (domino.row0 == null || domino.col0 == null) continue;

    // Wrapper: CSS-driven positioning and rotation
    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = domino.id;

    // Orientation derived from geometry
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

    const half0 = document.createElement("div");
    half0.className = "half half0";
    // Use value0/value1 if present; fall back to half0/half1 naming if your model uses that.
    half0.dataset.pip = String(domino.value0 ?? domino.half0 ?? 0);
    half0.appendChild(createPips());

    const half1 = document.createElement("div");
    half1.className = "half half1";
    half1.dataset.pip = String(domino.value1 ?? domino.half1 ?? 0);
    half1.appendChild(createPips());

    inner.appendChild(half0);
    inner.appendChild(half1);
    wrapper.appendChild(inner);

    // Append to board; CSS positions/rotates using --row/--col/--angle
    boardEl.appendChild(wrapper);
  }
}
