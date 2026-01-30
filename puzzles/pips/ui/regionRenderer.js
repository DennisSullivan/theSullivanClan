// ============================================================
// FILE: regionRenderer.js
// PURPOSE: Draws region overlays on the board using regionMap.
// NOTES:
//   - Pure UI: reads regionMap, never mutates engine state.
//   - Each region gets a CSS class like .region-0, .region-1, etc.
//   - Regions can be styled with background colors or outlines.
// ============================================================


// ------------------------------------------------------------
// renderRegions(regionMap, boardEl)
// Draws region overlays on the board.
// INPUTS:
//   regionMap - 2D array of region IDs
//   boardEl   - DOM element for the board container
// NOTES:
//   - Assumes boardEl already contains .board-cell elements.
//   - Adds region classes to each cell.
// ------------------------------------------------------------
export function renderRegions(regionMap, boardEl) {
  const cells = boardEl.querySelectorAll(".board-cell");

  for (const cell of cells) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    const regionId = regionMap[row][col];

    // Remove any previous region-* classes
    cell.classList.forEach(cls => {
      if (cls.startsWith("region-")) {
        cell.classList.remove(cls);
      }
    });

    // Apply region class if valid
    if (regionId >= 0) {
      cell.classList.add(`region-${regionId}`);
    }
  }
}

