// ============================================================
// FILE: badgeRenderer.js
// PURPOSE: Render region badges.
// CONTRACT:
//   - Called as: renderRegionBadges(regions, regionMap, boardEl)
//   - Badge visual center is anchored to the top-left corner
//     of the region's anchor cell.
// ============================================================

const BADGE_DEBUG = false;

export function renderRegionBadges(regions, regionMap, boardEl) {
  if (!boardEl || !Array.isArray(regions) || !regionMap) return;

  // Grid geometry from CSS
  const rootStyle = getComputedStyle(document.documentElement);
  const cellSize = parseFloat(rootStyle.getPropertyValue("--cell-size"));
  const cellGap  = parseFloat(rootStyle.getPropertyValue("--cell-gap"));
  const stride   = cellSize + cellGap;

  // Ensure badge layer
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
  // Derive anchor cell for each region from regionMap
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
  regions.forEach((_, regionId) => {
    const anchor = anchors.get(regionId);
    if (!anchor) return;

    const { row, col } = anchor;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = regionId;
    badgeLayer.appendChild(badge);

    // Measure after insertion
    const bw = badge.offsetWidth;
    const bh = badge.offsetHeight;

    const cellLeft = col * stride;
    const cellTop  = row * stride;

    // Center-anchor badge on cell corner
    const left = cellLeft - bw / 2;
    const top  = cellTop  - bh / 2;

    badge.style.position = "absolute";
    badge.style.left = `${left}px`;
    badge.style.top  = `${top}px`;

    if (BADGE_DEBUG) {
      console.group(`BADGE DIAG region ${regionId}`);
      console.log("anchor", anchor);
      console.log("badge size", { bw, bh });
      console.log("placed at", { left, top });
      console.groupEnd();
    }
  });
}
