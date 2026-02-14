// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Render placed dominos using only their two adjacent
//          cells. No anchor logic. Bounding‑box + orientation.
// ============================================================

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  if (!boardEl) return;
  if (!boardEl.style.position) boardEl.style.position = "relative";

  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // ------------------------------------------------------------
  // 1. Render board background cells
  // ------------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (regionMap && regionMap[r] && regionMap[r][c] != null) {
        cell.classList.add(`region-${regionMap[r][c]}`);
      }
      if (blocked && blocked[r] && blocked[r][c]) {
        cell.classList.add("blocked");
      }

      boardEl.appendChild(cell);
    }
  }

  // Helper: create seven pip elements
  function createPips() {
    const container = document.createElement("div");
    container.className = "pip-grid";
    for (let i = 1; i <= 7; i++) {
      const p = document.createElement("div");
      p.className = `pip p${i}`;
      container.appendChild(p);
    }
    return container;
  }

  // ------------------------------------------------------------
  // 2. Render each placed domino
  // ------------------------------------------------------------
  const list = dominos.values ? Array.from(dominos.values()) : dominos;

  for (const d of list) {
    if (d.row0 == null || d.col0 == null) continue;

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = d.id;

    wrapper.classList.add("debug-box");
    
    // Debug: confirm wrapper classes
    console.log("WRAPPER CLASSES:", wrapper.className);


    // ------------------------------------------------------------
    // Orientation + bounding box
    // ------------------------------------------------------------
    const vertical = (d.col0 === d.col1);

    let cssRow, cssCol, angle;

    if (vertical) {
      angle = 90;
      cssRow = Math.min(d.row0, d.row1);
      cssCol = d.col0; // same column
    } else {
      angle = 0;
      cssRow = d.row0;
      cssCol = Math.min(d.col0, d.col1);
    }

    wrapper.style.setProperty("--row", String(cssRow));
    wrapper.style.setProperty("--col", String(cssCol));
    wrapper.style.setProperty("--angle", `${angle}deg`);

    // ------------------------------------------------------------
    // Inner domino + halves
    // ------------------------------------------------------------
    const inner = document.createElement("div");
    inner.className = "domino on-board";
    
    inner.classList.add("debug-box");

    const half0 = document.createElement("div");
    half0.className = "half half0";
    half0.dataset.pip = String(d.pip0);
    half0.appendChild(createPips());

    const half1 = document.createElement("div");
    half1.className = "half half1";
    half1.dataset.pip = String(d.pip1);
    half1.appendChild(createPips());

    inner.appendChild(half0);
    inner.appendChild(half1);
    wrapper.appendChild(inner);

    boardEl.appendChild(wrapper);
  }
}
