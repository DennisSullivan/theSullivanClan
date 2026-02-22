// ============================================================
// FILE: badgeRenderer.js
// PURPOSE: Render region rule badges.
// CONTRACT:
//   - Rendering only; no engine mutation.
//   - Exactly one badge per region.
//   - Deterministic anchor cell per region.
//   - Badge text displays the region rule token.
//   - Badge color is assigned deterministically by region id.
//   - Visual center of badge is anchored to the
//     top-left corner of the anchor cell.
// ============================================================

// Fixed palette of region colors (CSS variables)
const REGION_COLORS = [
  "var(--color-region-0)",
  "var(--color-region-1)",
  "var(--color-region-2)",
  "var(--color-region-3)"
];

// ------------------------------------------------------------
// renderRegionBadges
// ------------------------------------------------------------
// Renders one informational badge per region.
// Badges are visually associated with their region by anchoring
// the badge's visual center to the top-left corner of a
// deterministic anchor cell.
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

  // ------------------------------------------------------------
  // Derive deterministic anchor cell for each region
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

    const { row, col } = anchor;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = String(region.rule ?? "");

    // Deterministic color by region id
    const color = REGION_COLORS[region.id % REGION_COLORS.length];
    badge.style.background = color;
    badge.style.borderColor = color;

    badgeLayer.appendChild(badge);

    // Measure after insertion
    const bw = badge.offsetWidth;
    const bh = badge.offsetHeight;

    // Grid geometry from CSS
    const rootStyle = getComputedStyle(document.documentElement);
    const cellSize = parseFloat(rootStyle.getPropertyValue("--cell-size"));
    const cellGap  = parseFloat(rootStyle.getPropertyValue("--cell-gap"));
    const stride   = cellSize + cellGap;

    const cellLeft = col * stride;
    const cellTop  = row * stride;

    // Visual-center anchor:
    // badge center sits on the cell's top-left corner
    const left = cellLeft - bw / 2;
    const top  = cellTop  - bh / 2;

    badge.style.position = "absolute";
    badge.style.left = `${left}px`;
    badge.style.top  = `${top}px`;
  });
}
