// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Render dominos on the board using geometry-only rules.
// NOTES:
//   - Orientation is derived from geometry (row/col pairs).
//   - No legacy orientation flags.
//   - UI is pure: no mutation of engine state.
//   - Wrapper transform uses CSS var --angle.
// ============================================================

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) return;

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

  // Render dominos on top of the grid
  for (const domino of dominos.values ? dominos.values() : dominos) {
    if (domino.row0 == null || domino.col0 == null) continue;

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper";
    wrapper.dataset.dominoId = domino.id;

    // ------------------------------------------------------------
    // ⭐ ORIENTATION FROM GEOMETRY
    // ------------------------------------------------------------
    // Horizontal: row0 == row1 → angle = 0°
    // Vertical:   col0 == col1 → angle = 90°
    let angle = 0;
    if (domino.col0 === domino.col1) {
      angle = 90;
    }

    wrapper.style.setProperty("--angle", `${angle}deg`);

    // ------------------------------------------------------------
    // POSITIONING
    // ------------------------------------------------------------
    // Compute top-left cell of the domino (the min of row0/row1, col0/col1)
    const minRow = Math.min(domino.row0, domino.row1);
    const minCol = Math.min(domino.col0, domino.col1);

    // Each cell is 1 unit; wrapper is centered on the first half
    wrapper.style.left = `${minCol * 100}%`;
    wrapper.style.top = `${minRow * 100}%`;

    // ------------------------------------------------------------
    // DOMINO INNER CONTENT
    // ------------------------------------------------------------
    const inner = document.createElement("div");
    inner.className = "domino";
    inner.dataset.id = domino.id;

    // Two halves
    const half0 = document.createElement("div");
    half0.className = "half half0";
    half0.textContent = domino.value0;

    const half1 = document.createElement("div");
    half1.className = "half half1";
    half1.textContent = domino.value1;

    inner.appendChild(half0);
    inner.appendChild(half1);
    wrapper.appendChild(inner);

    boardEl.appendChild(wrapper);
  }
}
