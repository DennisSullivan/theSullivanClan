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
  if (!boardEl.style.position) boardEl.style.position = "relative";

  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // Create grid cells
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

  // Helper: create pip grid inside a half
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

  // Render dominos using CSS-variable anchoring expected by board.css
  for (const domino of dominos.values ? dominos.values() : dominos) {
    if (domino.row0 == null || domino.col0 == null) continue;

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = domino.id;

    // Orientation from geometry
    const isVertical = domino.col0 === domino.col1;
    const angle = isVertical ? 90 : 0;
    wrapper.style.setProperty("--angle", `${angle}deg`);

    // Anchor at the minimum row/col of the two halves (CSS uses --row/--col)
    const anchorRow = Math.min(domino.row0, domino.row1);
    const anchorCol = Math.min(domino.col0, domino.col1);
    wrapper.style.setProperty("--row", String(anchorRow));
    wrapper.style.setProperty("--col", String(anchorCol));

    // Inner domino and halves
    const inner = document.createElement("div");
    inner.className = "domino on-board";

    const half0 = document.createElement("div");
    half0.className = "half half0";
    half0.dataset.pip = String(domino.value0 ?? domino.half0 ?? 0);
    half0.appendChild(createPips());

    const half1 = document.createElement("div");
    half1.className = "half half1";
    half1.dataset.pip = String(domino.value1 ?? domino.half1 ?? 0);
    half1.appendChild(createPips());

    inner.appendChild(half0);
    inner.appendChild(half1);
    wrapper.appendChild(inner);

    boardEl.appendChild(wrapper);
  }
}
