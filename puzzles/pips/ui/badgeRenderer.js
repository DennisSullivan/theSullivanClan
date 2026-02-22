// badgeRenderer.js
// Renders region badges by anchoring the badge's visual center
// to the top-left corner of the anchor cell.
//
// Contract:
// - Badge center aligns with anchor cell top-left.
// - No transforms.
// - No overlap percentages.
// - Geometry is explicit and visually stable.

const BADGE_DEBUG = false;

export function renderBadges({
  boardEl,
  regions,
  cellSize,
  cellGap
}) {
  const stride = cellSize + cellGap;

  if (BADGE_DEBUG) {
    console.log("BADGES: globals", { cellSize, cellGap, stride });
  }

  // Ensure a single badge layer
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

  // Clear existing badges
  badgeLayer.innerHTML = "";

  regions.forEach((region, regionId) => {
    const { anchor } = region;
    if (!anchor) return;

    const { row, col } = anchor;

    // Create badge
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = regionId;

    badgeLayer.appendChild(badge);

    // Measure badge AFTER insertion
    const bw = badge.offsetWidth;
    const bh = badge.offsetHeight;

    // Anchor cell top-left (grid truth)
    const cellLeft = col * stride;
    const cellTop  = row * stride;

    // Center-anchor the badge on the cell corner
    const left = cellLeft - bw / 2;
    const top  = cellTop  - bh / 2;

    badge.style.position = "absolute";
    badge.style.left = `${left}px`;
    badge.style.top  = `${top}px`;

    if (BADGE_DEBUG) {
      console.group(`BADGE DIAG region ${regionId}`);
      console.log("anchor", { row, col });
      console.log("cell", { cellLeft, cellTop });
      console.log("badge size", { bw, bh });
      console.log("placed at", { left, top });
      console.groupEnd();
    }
  });
}
