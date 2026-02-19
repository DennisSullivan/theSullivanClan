// ============================================================
// FILE: regionRenderer.js
// PURPOSE: Apply region overlay classes to board cells.
// NOTES:
//   - Pure UI: reads regionMap, never mutates engine state.
//   - Each region gets a CSS class like .region-0, .region-1, etc.
//   - Assumes boardRenderer has already created .board-cell elements.
//   - Medium diagnostics for unexpected or impossible branches.
// ============================================================

/**
 * renderRegions(regionMap, boardEl)
 * Applies region classes to each board cell.
 *
 * EXPECTS:
 *   - regionMap: 2D array of region IDs (numbers or null).
 *   - boardEl: DOM element containing .board-cell elements.
 *
 * BEHAVIOR:
 *   - Removes any existing region-* classes from each cell.
 *   - Adds region-N class if regionMap[row][col] is a valid number.
 *   - Logs diagnostics for out-of-range coordinates or missing rows.
 *
 * PURE FUNCTION:
 *   - Does not mutate regionMap or engine state.
 *   - Only updates DOM classes on existing board cells.
 */
export function renderRegions(regionMap, boardEl) {
  // Defensive: boardEl must exist.
  if (!boardEl) {
    console.error("renderRegions: boardEl is null/undefined. Cannot apply region overlays.");
    return;
  }

  // Defensive: regionMap must be a 2D array.
  if (!Array.isArray(regionMap) || regionMap.length === 0 || !Array.isArray(regionMap[0])) {
    console.error("renderRegions: invalid regionMap structure", regionMap);
    return;
  }

  const cells = boardEl.querySelectorAll(".board-cell");

  // If no cells exist, this indicates boardRenderer hasn't run yet.
  if (cells.length === 0) {
    console.warn("renderRegions: no .board-cell elements found. Did renderBoard run first?");
    return;
  }

  for (const cell of cells) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    // Defensive: ensure row/col are valid numbers.
    if (Number.isNaN(row) || Number.isNaN(col)) {
      console.error("renderRegions: cell has invalid row/col dataset", cell);
      continue;
    }

    // Defensive: ensure regionMap has this row.
    if (!regionMap[row]) {
      console.error("renderRegions: regionMap missing row", { row, regionMap });
      continue;
    }

    const regionId = regionMap[row][col];

    // Remove any previous region-* classes.
    cell.classList.forEach((cls) => {
      if (cls.startsWith("region-")) {
        cell.classList.remove(cls);
      }
    });

    // Apply region class if regionId is a valid non-negative number.
    if (typeof regionId === "number" && regionId >= 0) {
      cell.classList.add(`region-${regionId}`);
    } else if (typeof regionId !== "number") {
      console.error("renderRegions: invalid regionId value", {
        row,
        col,
        regionId
      });
    }
  }

  console.log("REGIONS: applied region classes to board cells");
}
