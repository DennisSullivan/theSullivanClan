// ============================================================
// FILE: boardRenderer.js
// PURPOSE: Canonical board renderer using geometry‑first model
// NOTES:
//   - Uses renderDomino() for pip grids
//   - One wrapper per domino (created at half0 only)
//   - Wrapper positioned via CSS variables (--row, --col)
//   - Rotation is set via CSS custom property (--angle) by renderDomino
//   - Board cells rendered first, dominos layered on top
//   - After render, a small helper composes the visual nudge into any inline transforms
//     so the nudge is visible immediately even if other renderers write inline transforms.
// ============================================================

import { renderDomino } from "./dominoRenderer.js";

/**
 * Compose the CSS nudge into any inline transforms on wrappers/children.
 * This is idempotent and safe to call after each render.
 */
function applyNudgeToRenderedWrappers() {
  const nudgeX = (getComputedStyle(document.documentElement).getPropertyValue('--domino-nudge-x') || '2px').trim();
  const nudgeY = (getComputedStyle(document.documentElement).getPropertyValue('--domino-nudge-y') || '2px').trim();

  document.querySelectorAll('.domino-wrapper.on-board').forEach(wrapper => {
    // Only prepend if the wrapper's inline style does not already start with a translate(...)
    const existingWrapper = wrapper.style.transform || '';
    if (!/^\s*translate\(/.test(existingWrapper)) {
      // Prepend the visual nudge to any existing inline transform (safe if empty)
      wrapper.style.transform = `translate(${nudgeX}, ${nudgeY}) ${existingWrapper}`.trim();
    }

    // Also compose into inner .domino in case some renderer set transform on the child.
    const domino = wrapper.querySelector('.domino');
    if (domino) {
      const existingChild = domino.style.transform || '';
      if (!/^\s*translate\(/.test(existingChild)) {
        domino.style.transform = `translate(${nudgeX}, ${nudgeY}) ${existingChild}`.trim();
      }
    }
  });
}

export function renderBoard(dominos, grid, regionMap, blocked, regions, boardEl) {
  boardEl.innerHTML = "";

  const rows = grid.length;
  const cols = grid[0].length;

  // ------------------------------------------------------------
  // 1. Render board cells (background grid)
  // ------------------------------------------------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "board-cell";
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;

      // Region class
      const regionId = regionMap[r][c];
      cellEl.classList.add(`region-${regionId}`);

      // Blocked?
      if (blocked.has(`${r},${c}`)) {
        cellEl.classList.add("blocked");
      }

      boardEl.appendChild(cellEl);
    }
  }

  // ------------------------------------------------------------
  // 2. Render dominos (one wrapper per domino)
  //    - Create wrapper, set position vars and dataset, append to DOM,
  //      then call renderDomino so it can set --angle and toggle 'vertical'.
  // ------------------------------------------------------------
  for (const [id, d] of dominos) {
    if (d.row0 === null) continue; // tray dominos not shown here

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper on-board";

    // Keep dataset for debugging/inspection
    wrapper.dataset.row = String(d.row0);
    wrapper.dataset.col = String(d.col0);

    // Position via CSS variables (canonical)
    wrapper.style.setProperty("--row", String(d.row0));
    wrapper.style.setProperty("--col", String(d.col0));

    // Append wrapper to DOM before rendering inner domino so renderDomino
    // can rely on computed styles and toggle classes immediately.
    boardEl.appendChild(wrapper);

    // Render the domino inside the wrapper (renderDomino sets --angle and vertical)
    renderDomino(d, wrapper);
  }

  // ------------------------------------------------------------
  // 3. Ensure the visual nudge is composed into any inline transforms
  //    This makes the nudge visible immediately even if some renderer
  //    writes inline style.transform after render.
  // ------------------------------------------------------------
  applyNudgeToRenderedWrappers();
}
