// ============================================================
// FILE: regionRules.js
// PURPOSE: Evaluate region constraints using canonical rules
//          of the form { op, value }.
// NOTES:
//   - Pure engine logic: no DOM, no UI, no side effects.
//   - Uses regionMap[row][col] to determine region membership.
//   - Uses grid occupancy to sum pip values.
//   - getPipsFromId(dominoId) must return { pip0, pip1 }.
//   - Medium diagnostics for impossible branches.
// ============================================================

import { getPipsFromId } from "./domino.js";

// ------------------------------------------------------------
// evaluateAllRegions(grid, regionMap, regions)
// ------------------------------------------------------------

/**
 * evaluateAllRegions(grid, regionMap, regions)
 * Computes the current pip-sum and satisfaction state for each region.
 *
 * EXPECTS:
 *   - grid: 2D occupancy array where each cell is:
 *       null OR { dominoId, half }
 *   - regionMap: 2D array of region IDs (numbers or null)
 *   - regions: array of region definitions:
 *       { id, rule: { op, value }, cells: [...] }
 *
 * RETURNS:
 *   Array of:
 *     {
 *       id,
 *       currentValue,
 *       satisfied,
 *       rule: { op, value }
 *     }
 *
 * BEHAVIOR:
 *   - Computes pip sum via computeRegionSum().
 *   - Applies rule via applyRule().
 *   - Never mutates grid or regions.
 */
export function evaluateAllRegions(grid, regionMap, regions) {
  if (!Array.isArray(regions)) {
    console.error("evaluateAllRegions: regions is not an array", regions);
    return [];
  }

  const results = [];

  for (const region of regions) {
    if (!region || typeof region.id === "undefined") {
      console.error("evaluateAllRegions: region missing id", region);
      continue;
    }

    if (!region.rule || typeof region.rule.op !== "string" || typeof region.rule.value !== "number") {
      console.error("evaluateAllRegions: region has invalid rule", region);
      continue;
    }

    const sum = computeRegionSum(grid, regionMap, region.id);
    const satisfied = applyRule(sum, region.rule);

    results.push({
      id: region.id,
      currentValue: sum,
      satisfied,
      rule: region.rule
    });
  }

  return results;
}

// ------------------------------------------------------------
// computeRegionSum(grid, regionMap, regionId)
// ------------------------------------------------------------

/**
 * computeRegionSum(grid, regionMap, regionId)
 * Computes the sum of pip values for all cells belonging to regionId.
 *
 * EXPECTS:
 *   - grid: 2D occupancy array
 *   - regionMap: 2D array of region IDs
 *   - regionId: number
 *
 * RETURNS:
 *   - integer sum of pip values
 *
 * BEHAVIOR:
 *   - For each cell in regionId:
 *       - If occupied, fetch pip0/pip1 via getPipsFromId(dominoId)
 *       - Add pip0 if half==0, pip1 if half==1
 *   - Logs diagnostics for impossible states (invalid half, missing pips).
 */
export function computeRegionSum(grid, regionMap, regionId) {
  if (!Array.isArray(grid) || !Array.isArray(regionMap)) {
    console.error("computeRegionSum: invalid grid or regionMap", { grid, regionMap });
    return 0;
  }

  let total = 0;

  for (let r = 0; r < grid.length; r++) {
    if (!Array.isArray(regionMap[r])) {
      console.error("computeRegionSum: regionMap row missing", { row: r, regionMap });
      continue;
    }

    for (let c = 0; c < grid[0].length; c++) {
      if (regionMap[r][c] !== regionId) continue;

      const cell = grid[r][c];
      if (!cell) continue;

      const { dominoId, half } = cell;

      if (half !== 0 && half !== 1) {
        console.error("computeRegionSum: invalid half value", { r, c, cell });
        continue;
      }

      const pips = getPipsFromId(dominoId);
      if (!pips || typeof pips.pip0 !== "number" || typeof pips.pip1 !== "number") {
        console.error("computeRegionSum: getPipsFromId returned invalid pips", {
          dominoId,
          pips
        });
        continue;
      }

      total += half === 0 ? pips.pip0 : pips.pip1;
    }
  }

  return total;
}

// ------------------------------------------------------------
// applyRule(sum, rule)
// ------------------------------------------------------------

/**
 * applyRule(sum, rule)
 * Applies a region rule to a computed sum.
 *
 * EXPECTS:
 *   - sum: integer
 *   - rule: { op, value }
 *
 * SUPPORTED OPS:
 *   =, <, >, <=, >=, !=
 *
 * RETURNS:
 *   true or false
 *
 * DIAGNOSTICS:
 *   - Logs if operator is unknown.
 */
export function applyRule(sum, rule) {
  if (!rule || typeof rule.op !== "string" || typeof rule.value !== "number") {
    console.error("applyRule: invalid rule object", rule);
    return false;
  }

  const { op, value } = rule;

  switch (op) {
    case "=":
      return sum === value;
    case "<":
      return sum < value;
    case ">":
      return sum > value;
    case "<=":
      return sum <= value;
    case ">=":
      return sum >= value;
    case "!=":
      return sum !== value;

    default:
      console.error("applyRule: unknown operator", { op, rule });
      return false;
  }
}
