// ============================================================
// FILE: regionRules.js
// PURPOSE: Evaluates region constraints using the canonical
//          rule format { op, value }.
// NOTES:
//   - Uses regionMap[row][col] for fast lookup.
//   - Uses grid occupancy to sum pip values.
//   - No orientation logic.
//   - No legacy rule formats.
// ============================================================

import { getPipsFromId } from "./domino.js";


// ------------------------------------------------------------
// evaluateAllRegions(grid, regionMap, regions)
// Computes the current value and satisfaction state for each
// region in the puzzle.
// INPUTS:
//   grid      - occupancy map
//   regionMap - 2D array of region IDs
//   regions   - array of region definitions from puzzle file
// RETURNS:
//   Array of:
//     {
//       id,
//       currentValue,
//       satisfied,
//       rule: { op, value }
//     }
// NOTES:
//   - currentValue is the sum of all pips in the region.
//   - satisfied is boolean based on rule.op and rule.value.
// ------------------------------------------------------------
export function evaluateAllRegions(grid, regionMap, regions) {
  const results = [];

  for (const region of regions) {
    const { id, rule } = region;

    const sum = computeRegionSum(grid, regionMap, id);
    const satisfied = applyRule(sum, rule);

    results.push({
      id,
      currentValue: sum,
      satisfied,
      rule
    });
  }

  return results;
}


// ------------------------------------------------------------
// computeRegionSum(grid, regionMap, regionId)
// Computes the sum of all pips in a region.
// INPUTS:
//   grid      - occupancy map
//   regionMap - 2D array of region IDs
//   regionId  - integer
// RETURNS:
//   integer sum of pip values
// NOTES:
//   - Each domino contributes pip0 or pip1 depending on half.
// ------------------------------------------------------------
export function computeRegionSum(grid, regionMap, regionId) {
  let total = 0;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (regionMap[r][c] !== regionId) continue;

      const cell = grid[r][c];
      if (!cell) continue;

      const { dominoId, half } = cell;
      const { pip0, pip1 } = getPipsFromId(dominoId);

      total += (half === 0 ? pip0 : pip1);
    }
  }

  return total;
}


// ------------------------------------------------------------
// applyRule(sum, rule)
// Applies a region rule to a computed sum.
// INPUTS:
//   sum  - integer
//   rule - { op, value }
// RETURNS:
//   true/false
// NOTES:
//   - Supports =, <, >, <=, >=, !=
// ------------------------------------------------------------
export function applyRule(sum, rule) {
  const { op, value } = rule;

  switch (op) {
    case "=":  return sum === value;
    case "<":  return sum < value;
    case ">":  return sum > value;
    case "<=": return sum <= value;
    case ">=": return sum >= value;
    case "!=": return sum !== value;
    default:
      console.warn("Unknown region rule operator:", op);
      return false;
  }
}
