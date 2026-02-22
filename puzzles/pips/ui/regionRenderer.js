// ============================================================
// FILE: regionRenderer.js
// PURPOSE: Apply renderer-assigned region color classes to board cells.
// NOTES:
//   - Pure UI: reads regionMap, never mutates engine state.
//   - Region IDs are NOT color IDs.
//   - Color identity is assigned deterministically by the renderer.
//   - Assumes boardRenderer has already created .board-cell elements.
// ============================================================


import { computeRegionColorMap } from "./regionColorAssigner.js";
const REGION_DEBUG = true;

/**
 * renderRegions(regionMap, boardEl)
 * Applies region classes to each board cell.
 *
 * EXPECTS:
 *   - regionMap: 2D array of region IDs (numbers or null).
 *   - boardEl: DOM element containing .board-cell elements.
 *
 * BEHAVIOR:
 *   - Removes any existing region-color-* classes from each cell.
 *   - Applies renderer-assigned region-color-N class based on adjacency-safe mapping.
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

  const regionColorMap = computeRegionColorMap(regionMap);
  
  for (const cell of cells) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (REGION_DEBUG) {
      const rootStyle = getComputedStyle(document.documentElement);
      const cellSize = parseFloat(rootStyle.getPropertyValue("--cell-size"));
      const cellGap  = parseFloat(rootStyle.getPropertyValue("--cell-gap"));
      const stride   = cellSize + cellGap;
    
      const boardRect = boardEl.getBoundingClientRect();
      const cellRect  = cell.getBoundingClientRect();
    
      const domLeft = cell.offsetLeft;
      const domTop  = cell.offsetTop;
    
      const gridLeft = col * stride;
      const gridTop  = row * stride;
    
      console.group(`REGION DIAG cell (${row}, ${col})`);
      console.log("DOM offset", { domLeft, domTop });
      console.log("Grid math", { gridLeft, gridTop });
      console.log("Delta", {
        dx: domLeft - gridLeft,
        dy: domTop  - gridTop
      });
      console.log("Rect (relative to board)", {
        left: cellRect.left - boardRect.left,
        top:  cellRect.top  - boardRect.top
      });
      console.groupEnd();
    }

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
    if (cls.startsWith("region-color-")) {
      cell.classList.remove(cls);
    }
    });

    // Apply region class if regionId is a valid non-negative number.
    if (typeof regionId === "number" && regionId >= 0) {
      const colorIndex = regionColorMap.get(regionId);
      if (colorIndex != null) {
        cell.classList.add(`region-color-${colorIndex}`);
      }
    } else if (typeof regionId !== "number") {
      console.error("renderRegions: unexpected regionId value", {
        row,
        col,
        regionId
      });
    }
  }

  console.log("REGIONS: applied region classes to board cells");
}
