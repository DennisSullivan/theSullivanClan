// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Robust, geometry-driven renderer for dominos.
// NOTES:
//  - Orientation derived from geometry (row/col pairs).
//  - Uses pixel positioning with an explicit positioning context.
//  - Wrapper is absolutely positioned and centered on the domino center.
//  - Wrapper size and inner layout adapt to horizontal/vertical dominos.
// ============================================================

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) return;

  // Ensure board provides a positioning context for absolute children
  if (!boardEl.style.position) boardEl.style.position = "relative";

  // Clear board
  boardEl.innerHTML = "";

  // Render each cell
  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;

      // Region coloring (optional)
      if (regionMap && regionMap[r] && regionMap[r][c] != null) {
        const regionId = regionMap[r][c];
        cell.classList.add(`region-${regionId}`);
      }

      // Blocked cells
      if (blocked && blocked[r] && blocked[r][c]) {
        cell.classList.add("blocked");
      }

      boardEl.appendChild(cell);
    }
  }

  // Determine cell size (pixel). Use first cell if available.
  const sampleCell = boardEl.querySelector(".board-cell");
  const cellSize = (sampleCell && (sampleCell.offsetWidth || sampleCell.clientWidth)) || 40;

  // Render dominos on top of the grid
  for (const domino of dominos.values ? dominos.values() : dominos) {
    // Skip dominos not placed on the board
    if (domino.row0 == null || domino.col0 == null) continue;

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper";
    wrapper.dataset.dominoId = domino.id;

    // ------------------------------------------------------------
    // ORIENTATION FROM GEOMETRY
    // ------------------------------------------------------------
    // Horizontal: same row -> angle = 0
    // Vertical:   same col -> angle = 90
    const isVertical = domino.col0 === domino.col1;
    const angle = isVertical ? 90 : 0;

    // Keep CSS var for compatibility; we'll also set transform explicitly below
    wrapper.style.setProperty("--angle", `${angle}deg`);

    // ------------------------------------------------------------
    // POSITIONING & SIZE (pixel-accurate, centered)
    // ------------------------------------------------------------
    const minRow = Math.min(domino.row0, domino.row1);
    const minCol = Math.min(domino.col0, domino.col1);

    // Size: domino spans two cells in its long axis
    const width = isVertical ? cellSize : cellSize * 2;
    const height = isVertical ? cellSize * 2 : cellSize;

    // Center coordinates (relative to boardEl)
    const centerLeft = minCol * cellSize + (width / 2);
    const centerTop = minRow * cellSize + (height / 2);

    // Make wrapper absolutely positioned and sized
    wrapper.style.position = "absolute";
    wrapper.style.left = `${centerLeft}px`;
    wrapper.style.top = `${centerTop}px`;
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
    wrapper.style.zIndex = "10";
    wrapper.style.boxSizing = "border-box";

    // Use transform to center and rotate. This matches the drag clone behavior.
    wrapper.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    // ------------------------------------------------------------
    // DOMINO INNER CONTENT (layout adapts to orientation)
    // ------------------------------------------------------------
    const inner = document.createElement("div");
    inner.className = "domino";
    inner.dataset.id = domino.id;

    // Ensure inner fills wrapper
    inner.style.width = "100%";
    inner.style.height = "100%";
    inner.style.display = "flex";
    inner.style.flexDirection = isVertical ? "column" : "row";
    inner.style.alignItems = "stretch";
    inner.style.justifyContent = "stretch";
    inner.style.boxSizing = "border-box";

    // Two halves
    const half0 = document.createElement("div");
    half0.className = "half half0";
    half0.textContent = domino.value0;
    half0.style.flex = "1 1 50%";
    half0.style.display = "flex";
    half0.style.alignItems = "center";
    half0.style.justifyContent = "center";
    half0.style.boxSizing = "border-box";

    const half1 = document.createElement("div");
    half1.className = "half half1";
    half1.textContent = domino.value1;
    half1.style.flex = "1 1 50%";
    half1.style.display = "flex";
    half1.style.alignItems = "center";
    half1.style.justifyContent = "center";
    half1.style.boxSizing = "border-box";

    inner.appendChild(half0);
    inner.appendChild(half1);
    wrapper.appendChild(inner);

    boardEl.appendChild(wrapper);
  }
}
