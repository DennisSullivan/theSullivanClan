// ============================================================
// FILE: regionMapBuilder.js
// PURPOSE: Builds the regionMap 2D array from puzzle regions.
// NOTES:
//   - regionMap[row][col] = regionId (integer)
//   - Regions are defined as rectangles in puzzle JSON.
//   - No DOM logic, no rule logic.
// ============================================================


// ------------------------------------------------------------
// buildRegionMap(width, height, regions)
// Creates a 2D array mapping each cell to a region ID.
// INPUTS:
//   width, height - puzzle dimensions
//   regions       - array of { id, cells:[{row,col},...] } OR
//                   array of { id, top, left, width, height }
// RETURNS:
//   regionMap - 2D array of integers
// NOTES:
//   - Supports both explicit cell lists and rectangles.
//   - Unassigned cells get regionId = -1.
// ------------------------------------------------------------
export function buildRegionMap(width, height, regions) {
  // Initialize all cells to -1 (no region)
  const regionMap = [];
  for (let r = 0; r < height; r++) {
    const row = new Array(width).fill(-1);
    regionMap.push(row);
  }

  // Fill regions
  for (const region of regions) {
    const { id } = region;

    // Case 1: explicit cell list
    if (region.cells) {
      for (const cell of region.cells) {
        const { row, col } = cell;
        if (row >= 0 && row < height && col >= 0 && col < width) {
          regionMap[row][col] = id;
        }
      }
      continue;
    }

    // Case 2: rectangle definition
    if (
      typeof region.top === "number" &&
      typeof region.left === "number" &&
      typeof region.width === "number" &&
      typeof region.height === "number"
    ) {
      const top = region.top;
      const left = region.left;
      const w = region.width;
      const h = region.height;

      for (let r = top; r < top + h; r++) {
        for (let c = left; c < left + w; c++) {
          if (r >= 0 && r < height && c >= 0 && c < width) {
            regionMap[r][c] = id;
          }
        }
      }
      continue;
    }

    console.warn("Region has no recognized format:", region);
  }

  return regionMap;
}

