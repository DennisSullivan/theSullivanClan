// ============================================================
// FILE: badgeRenderer.js
// PURPOSE: Render region rule badges using a deterministic
//          visual anchor cell and strict placement geometry.
// NOTES:
//   - Pure UI: no engine mutation.
//   - Visual anchor cell = top-leftmost region cell.
//   - Badge overlaps ≤25% of anchor cell (upper-left quadrant).
//   - Badge never overlaps any other cell.
//   - Badge color identity is solid and never blended.
// ============================================================

import { computeRegionColorMap } from "./regionColorAssigner.js";

/**
 * renderRegionBadges(regions, boardEl)
 *
 * EXPECTS:
 *   - regions: [{ id, rule, cells:[{row,col},...] }]
 *   - boardEl: board DOM element
 *
 * BEHAVIOR:
 *   - Removes existing badge layers.
 *   - Selects a deterministic visual anchor cell per region.
 *   - Places badge partially overlapping anchor cell only.
 *   - Never overlaps other cells or dominos.
 */
export function renderRegionBadges(regions, regionMap, boardEl) {
  if (!boardEl || !Array.isArray(regions)) return;

  boardEl.querySelectorAll(".badge-layer").forEach(el => el.remove());

  const cellSize = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue("--cell-size"));
  const cellGap = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue("--cell-gap"));

  const stride = cellSize + cellGap;
  const regionColorMap = computeRegionColorMap(regionMap);

  for (const region of regions) {
    if (!region.rule || !Array.isArray(region.cells) || region.cells.length === 0) {
      continue;
    }

    // --------------------------------------------------------
    // Visual anchor cell: top-leftmost region cell
    // --------------------------------------------------------
    const anchor = region.cells
      .slice()
      .sort((a, b) => a.row - b.row || a.col - b.col)[0];

    // --------------------------------------------------------
    // Badge geometry
    // --------------------------------------------------------
    const badge = document.createElement("div");
    badge.className = "badge";

    if (typeof region.rule === "object" && region.rule.op) {
      badge.textContent = `${region.rule.op}${region.rule.value}`;
    } else {
      badge.textContent = String(region.rule);
    }

    // Solid region color identity (no blending)
    const colorIndex = regionColorMap.get(region.id);
    badge.style.background = `var(--color-region-${colorIndex})`;
    badge.style.borderColor = `var(--color-region-${colorIndex})`;

    // Measure badge (must be in board context)
    boardEl.appendChild(badge);
    const bw = badge.offsetWidth;
    const bh = badge.offsetHeight;
    badge.remove();

    // --------------------------------------------------------
    // Placement math
    //   - ≤25% overlap with anchor cell
    //   - overlap in upper-left quadrant only
    // --------------------------------------------------------
    const overlapX = Math.min(bw * 0.25, cellSize * 0.25);
    const overlapY = Math.min(bh * 0.25, cellSize * 0.25);

    const left =
      anchor.col * stride - (bw - overlapX);
    const top =
      anchor.row * stride - (bh - overlapY);

    const layer = document.createElement("div");
    layer.className = "badge-layer";
    layer.style.left = `${left}px`;
    layer.style.top = `${top}px`;

    layer.appendChild(badge);
    boardEl.appendChild(layer);
  }
}
