// ============================================================
// FILE: regionMapBuilder.js
// PURPOSE: Build a 2D regionMap array from puzzle region data.
// NOTES:
//   - regionMap[row][col] = regionId (integer) or -1 for none.
//   - Supports explicit cell lists OR rectangle definitions.
//   - Pure engine logic: no DOM, no UI.
//   - Medium diagnostics for impossible branches.
// ============================================================

/**
 * buildRegionMap(width, height, regions)
 * Constructs a 2D regionMap array.
 *
 * EXPECTS:
 *   - width, height: puzzle dimensions
 *   - regions: array of region definitions:
 *       { id, cells:[{row,col},...] }
 *       OR
 *       { id, top, left, width, height }
 *
 * RETURNS:
 *   regionMap: 2D array of region IDs (or -1)
 *
 * DIAGNOSTICS:
 *   - Logs invalid region definitions.
 *   - Logs out‑of‑bounds cells.
 */
export function buildRegionMap(width, height, regions) {
  // Initialize all cells to -1 (no region)
  const regionMap = Array.from({ length: height }, () => new Array(width).fill(-1));

  if (!Array.isArray(regions)) {
    console.error("buildRegionMap: regions is not an array", regions);
    return regionMap;
  }

  for (const region of regions) {
    if (!region || typeof region.id === "undefined") {
      console.error("buildRegionMap: region missing id", region);
      continue;
    }

    const { id } = region;

    // ----------------------------------------------------------
    // Case 1: explicit cell list
    // ----------------------------------------------------------
    if (Array.isArray(region.cells)) {
      for (const cell of region.cells) {
        const { row, col } = cell;

        if (
          typeof row !== "number" ||
          typeof col !== "number" ||
          Number.isNaN(row) ||
          Number.isNaN(col)
        ) {
          console.error("buildRegionMap: invalid cell coordinates", { region, cell });
          continue;
        }

        if (row < 0 || row >= height || col < 0 || col >= width) {
          console.warn("buildRegionMap: cell out of bounds", { region, cell });
          continue;
        }

        regionMap[row][col] = id;
      }
      continue;
    }

    // ----------------------------------------------------------
    // Case 2: rectangle definition
    // ----------------------------------------------------------
    if (
      typeof region.top === "number" &&
      typeof region.left === "number" &&
      typeof region.width === "number" &&
      typeof region.height === "number"
    ) {
      const { top, left, width: w, height: h } = region;

      for (let r = top; r < top + h; r++) {
        for (let c = left; c < left + w; c++) {
          if (r < 0 || r >= height || c < 0 || c >= width) {
            console.warn("buildRegionMap: rectangle cell out of bounds", {
              region,
              r,
              c
            });
            continue;
          }
          regionMap[r][c] = id;
        }
      }
      continue;
    }

    // ----------------------------------------------------------
    // Unknown region format
    // ----------------------------------------------------------
    console.error("buildRegionMap: region has no recognized format", region);
  }

  return regionMap;
}
