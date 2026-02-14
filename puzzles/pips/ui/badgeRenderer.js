// ============================================================
// FILE: badgeRenderer.js
// PURPOSE: Render region rule badges at the top-left corner of
//          each region's bounding box.
// NOTES:
//   - Pure UI: reads regions array, never mutates engine state.
//   - Each region with a rule gets a floating badge.
//   - Badge position is computed from region.cells.
//   - Medium diagnostics for impossible branches.
// ============================================================

/**
 * renderRegionBadges(regions, boardEl)
 * Draws rule badges for each region that defines a rule.
 *
 * EXPECTS:
 *   - regions: array of region objects, each with:
 *       { id, rule, cells: [{row, col}, ...] }
 *   - boardEl: DOM element containing the board.
 *
 * BEHAVIOR:
 *   - Removes old .badge-layer elements.
 *   - Computes bounding box for each region.
 *   - Places a badge at the top-left cell of that box.
 *   - Applies region color via CSS variables.
 *
 * PURE FUNCTION:
 *   - Does not mutate regions or engine state.
 *   - Only updates DOM elements inside boardEl.
 */
export function renderRegionBadges(regions, boardEl) {
  // Defensive: boardEl must exist.
  if (!boardEl) {
    console.error("renderRegionBadges: boardEl is null/undefined.");
    return;
  }

  // Defensive: regions must be an array.
  if (!Array.isArray(regions)) {
    console.error("renderRegionBadges: regions is not an array", regions);
    return;
  }

  // Remove any existing badges.
  const oldLayers = boardEl.querySelectorAll(".badge-layer");
  oldLayers.forEach((el) => el.remove());

  for (const region of regions) {
    // Skip regions without rules.
    if (!region.rule) continue;

    // Defensive: region.cells must exist and be an array.
    if (!Array.isArray(region.cells) || region.cells.length === 0) {
      console.error("renderRegionBadges: region has no cells", region);
      continue;
    }

    // Compute bounding box.
    let minRow = Infinity;
    let minCol = Infinity;

    for (const cell of region.cells) {
      if (typeof cell.row !== "number" || typeof cell.col !== "number") {
        console.error("renderRegionBadges: invalid cell in region", { region, cell });
        continue;
      }
      if (cell.row < minRow) minRow = cell.row;
      if (cell.col < minCol) minCol = cell.col;
    }

    if (!Number.isFinite(minRow) || !Number.isFinite(minCol)) {
      console.error("renderRegionBadges: could not compute bounding box", region);
      continue;
    }

    // Create badge layer.
    const layer = document.createElement("div");
    layer.className = "badge-layer";

    // Position using CSS variables.
    layer.style.left = `calc(${minCol} * var(--cell-size))`;
    layer.style.top = `calc(${minRow} * var(--cell-size))`;

    // Create badge.
    const badge = document.createElement("div");
    badge.className = "badge";

    // region.rule may be an object {op, value} or a string/number.
    if (typeof region.rule === "object" && region.rule.op && region.rule.value != null) {
      badge.textContent = `${region.rule.op}${region.rule.value}`;
    } else {
      badge.textContent = String(region.rule);
    }

    // Apply region color via CSS variable.
    if (region.id != null) {
      badge.style.background = `var(--color-region-${region.id})`;
      badge.style.borderColor = `var(--color-region-${region.id})`;
    } else {
      console.warn("renderRegionBadges: region missing id; badge will use default colors", region);
    }

    layer.appendChild(badge);
    boardEl.appendChild(layer);
  }

  console.log("BADGES: region badges rendered");
}
