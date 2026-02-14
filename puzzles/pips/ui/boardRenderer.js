// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Render all placed dominos and the board background.
// NOTES:
//   - Pure renderer: no state mutation.
//   - Uses CSS variables (--row, --col, --angle) for geometry.
//   - Assumes board.css owns wrapper footprint + rotation.
// ============================================================

/**
 * renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)
 * Renders the full board:
 *  - Background cells (with region + blocked classes).
 *  - One wrapper per placed domino.
 *  - Each wrapper gets CSS variables for row/col/angle.
 * Expects:
 *  - dominos: Map or array of domino objects with row0/col0/row1/col1/pip0/pip1.
 *  - grid: 2D array defining board size.
 *  - regionMap: 2D array of region ids (or null).
 *  - blocked: 2D boolean array of blocked cells (optional).
 *  - regions: currently unused here but kept for future overlays.
 *  - boardEl: DOM element that will contain the board.
 */
export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  // Defensive guard: boardEl must exist.
  if (!boardEl) {
    console.error("renderBoard: boardEl is null/undefined. Cannot render board.");
    return;
  }

  // Ensure board is positioned for absolutely positioned wrappers.
  if (!boardEl.style.position) {
    boardEl.style.position = "relative";
  }

  // Defensive guard: grid must be a non-empty 2D array.
  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
    console.error("renderBoard: invalid grid structure", grid);
    boardEl.innerHTML = "";
    return;
  }

  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // ------------------------------------------------------------
  // 1. Render board background cells
  // ------------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    // Defensive: if a row is missing, log and skip.
    if (!Array.isArray(grid[r])) {
      console.warn("renderBoard: grid row is not an array; skipping row", { rowIndex: r, row: grid[r] });
      continue;
    }

    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);

      // Region coloring if regionMap is present.
      if (regionMap && regionMap[r] && regionMap[r][c] != null) {
        cell.classList.add(`region-${regionMap[r][c]}`);
      }

      // Blocked cells if blocked map is present.
      if (blocked && blocked[r] && blocked[r][c]) {
        cell.classList.add("blocked");
      }

      boardEl.appendChild(cell);
    }
  }

  // Helper: create seven pip elements inside a pip-grid container.
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
  const list = dominos && dominos.values ? Array.from(dominos.values()) : dominos;

  if (!Array.isArray(list)) {
    console.error("renderBoard: dominos is neither a Map nor an array", dominos);
    return;
  }

  for (const d of list) {
    // Skip dominos that are not on the board.
    if (d.row0 == null || d.col0 == null || d.row1 == null || d.col1 == null) {
      continue;
    }

    // Defensive: ensure required fields exist.
    if (d.id == null) {
      console.warn("renderBoard: domino missing id; skipping", d);
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";
    wrapper.dataset.dominoId = String(d.id);

    // ----------------------------------------------------------
    // Orientation + bounding box
    // ----------------------------------------------------------
    const vertical = (d.col0 === d.col1);

    let cssRow;
    let cssCol;
    let angle;

    if (vertical) {
      // Vertical: same column, rows differ.
      angle = 90;
      cssRow = Math.min(d.row0, d.row1);
      cssCol = d.col0;
    } else {
      // Horizontal: same row, columns differ.
      angle = 0;
      cssRow = d.row0;
      cssCol = Math.min(d.col0, d.col1);
    }

    // Defensive: if geometry is inconsistent, log it.
    if (d.row0 !== d.row1 && d.col0 !== d.col1) {
      console.warn("renderBoard: domino is not strictly horizontal or vertical", {
        id: d.id,
        row0: d.row0,
        col0: d.col0,
        row1: d.row1,
        col1: d.col1
      });
    }

    wrapper.style.setProperty("--row", String(cssRow));
    wrapper.style.setProperty("--col", String(cssCol));
    wrapper.style.setProperty("--angle", `${angle}deg`);

    // ----------------------------------------------------------
    // Inner domino + halves
    // ----------------------------------------------------------
    const inner = document.createElement("div");
    inner.className = "domino on-board";

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
