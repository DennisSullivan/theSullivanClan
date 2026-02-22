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
 * renderRegionBadges(regions, regionMap, boardEl)
 *
 * EXPECTS:
 *   - regions: [{ id, rule, cells:[{row,col},...] }]
 *   - boardEl: board DOM element
 */
export function renderRegionBadges(regions, regionMap, boardEl) {
  if (!boardEl || !Array.isArray(regions)) return;

  // Remove existing badges
  boardEl.querySelectorAll(".badge-layer").forEach(el => el.remove());

  const rootStyle = getComputedStyle(document.documentElement);
  const cellSize = parseFloat(rootStyle.getPropertyValue("--cell-size"));
  const cellGap  = parseFloat(rootStyle.getPropertyValue("--cell-gap"));

  const regionColorMap = computeRegionColorMap(regionMap);

  for (const region of regions) {
    // Allow rule "=0" and other truthy strings
    if (region.rule == null || !Array.isArray(region.cells) || region.cells.length === 0) {
      continue;
    }

    // --------------------------------------------------------
    // Visual anchor cell: top-leftmost region cell
    // --------------------------------------------------------
    const anchor = region.cells
      .slice()
      .sort((a, b) => a.row - b.row || a.col - b.col)[0];

    const anchorCell = boardEl.querySelector(
      `.board-cell[data-row="${anchor.row}"][data-col="${anchor.col}"]`
    );

    if (!anchorCell) continue;

    // --------------------------------------------------------
    // Badge element
    // --------------------------------------------------------
    const badge = document.createElement("div");
    badge.className = "badge";

    if (typeof region.rule === "object" && region.rule.op) {
      badge.textContent = `${region.rule.op}${region.rule.value}`;
    } else {
      badge.textContent = String(region.rule);
    }

    const colorIndex = regionColorMap.get(region.id);
    badge.style.background = `var(--color-region-${colorIndex})`;
    badge.style.borderColor = `var(--color-region-${colorIndex})`;

    // --------------------------------------------------------
    // Measure badge in board context
    // --------------------------------------------------------
    boardEl.appendChild(badge);
    const bw = badge.offsetWidth;
    const bh = badge.offsetHeight;
    badge.remove();

    // --------------------------------------------------------
    // Placement using DOM truth
    // --------------------------------------------------------
    const cellRect  = anchorCell.getBoundingClientRect();
    const boardRect = boardEl.getBoundingClientRect();

    const overlapX = Math.min(bw * 0.25, cellSize * 0.25);
    const overlapY = Math.min(bh * 0.25, cellSize * 0.25);

    const left = (cellRect.left - boardRect.left) - (bw - overlapX);
    const top  = (cellRect.top  - boardRect.top)  - (bh - overlapY);

    const layer = document.createElement("div");
    layer.className = "badge-layer";
    layer.style.left = `${left}px`;
    layer.style.top  = `${top}px`;

    layer.appendChild(badge);
    boardEl.appendChild(layer);
  }
}
