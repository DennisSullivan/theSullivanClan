// ============================================================
// FILE: badgeRenderer.js
// PURPOSE: Render region rule badges.
// CONTRACT:
//   - Rendering only; no engine mutation.
//   - Exactly one badge per region.
//   - Badge color MUST match region color.
//   - Badge text displays the region rule token.
//   - Visual center of badge is anchored to the
//     top-left corner of the anchor cell.
// ============================================================

import { computeRegionColorMap } from "./regionColorAssigner.js";

// ------------------------------------------------------------
// renderRegionBadges
// ------------------------------------------------------------
// Renders one informational badge per region.
// Badges consume the same region color assignment used by
// regionRenderer to guarantee visual alignment.
// ------------------------------------------------------------
export function renderRegionBadges(regions, regionMap, boardEl) {
  if (!boardEl || !Array.isArray(regions) || !regionMap) return;

  // Ensure single badge layer
  let badgeLayer = boardEl.querySelector(".badge-layer");
  if (!badgeLayer) {
    badgeLayer = document.createElement("div");
    badgeLayer.className = "badge-layer";
    badgeLayer.style.position = "absolute";
    badgeLayer.style.left = "0";
    badgeLayer.style.top = "0";
    badgeLayer.style.pointerEvents = "none";
    badgeLayer.style.zIndex = "30";
    boardEl.appendChild(badgeLayer);
  }

  badgeLayer.innerHTML = "";

  // Shared color authority
  const regionColorMap = computeRegionColorMap(regionMap);

  // ------------------------------------------------------------
  // Derive deterministic anchor cell per region
  // (top-leftmost cell encountered in regionMap scan)
  // ------------------------------------------------------------
  const anchors = new Map();

  for (let r = 0; r < regionMap.length; r++) {
    for (let c = 0; c < regionMap[r].length; c++) {
      const regionId = regionMap[r][c];
      if (regionId == null) continue;
      if (!anchors.has(regionId)) {
        anchors.set(regionId, { row: r, col: c });
      }
    }
  }

  // ------------------------------------------------------------
  // Render badges
  // ------------------------------------------------------------
  regions.forEach(region => {
    const anchor = anchors.get(region.id);
    if (!anchor) return;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = String(region.rule ?? "");

    // Apply region-assigned color
    const colorIndex = regionColorMap.get(region.id);
    if (colorIndex != null) {
      const color = `var(--color-region-${colorIndex})`;
      badge.style.background = color;
      badge.style.borderColor = color;
    }

    badgeLayer.appendChild(badge);

    // Measure after insertion
    const bw = badge.offsetWidth;
    const bh = badge.offsetHeight;

    // Grid geometry from CSS
    const rootStyle = getComputedStyle(document.documentElement);
    const cellSize = parseFloat(rootStyle.getPropertyValue("--cell-size"));
    const cellGap  = parseFloat(rootStyle.getPropertyValue("--cell-gap"));
    const stride   = cellSize + cellGap;

    const cellLeft = anchor.col * stride;
    const cellTop  = anchor.row * stride;

    // Visual-center anchor
    badge.style.position = "absolute";
    badge.style.left = `${cellLeft - bw / 2}px`;
    badge.style.top  = `${cellTop  - bh / 2}px`;
  });
}
