// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Render the board using canonical grid format:
//          grid[r][c] = { dominoId, half }
// ============================================================

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {

      const cellEl = document.createElement("div");
      cellEl.className = "board-cell";

      cellEl.dataset.row = r;
      cellEl.dataset.col = c;

      // Region styling
      const regionId = regionMap[r][c];
      cellEl.classList.add(`region-${regionId}`);

      // Blocked cells
      if (blocked.has(`${r},${c}`)) {
        cellEl.classList.add("blocked");
        boardEl.appendChild(cellEl);
        continue;
      }

      const cell = grid[r][c];
      if (!cell) {
        boardEl.appendChild(cellEl);
        continue;
      }

      const { dominoId, half } = cell;
      const domino = dominos.get(dominoId);

      // Create wrapper only for half0
      if (half === 0) {
        const wrapper = document.createElement("div");
        wrapper.className = "domino-wrapper";
        wrapper.style.position = "absolute";

        // Position wrapper at half0 cell
        wrapper.style.left = `${c * 1}em`;
        wrapper.style.top = `${r * 1}em`;

        // Domino element
        const domEl = document.createElement("div");
        domEl.className = "domino";
        domEl.dataset.id = dominoId;

        // Half0
        const h0 = document.createElement("div");
        h0.className = "half half0";
        h0.textContent = domino.pips0;

        // Half1
        const h1 = document.createElement("div");
        h1.className = "half half1";
        h1.textContent = domino.pips1;

        domEl.appendChild(h0);
        domEl.appendChild(h1);
        wrapper.appendChild(domEl);
        boardEl.appendChild(wrapper);
      }

      boardEl.appendChild(cellEl);
    }
  }
}
