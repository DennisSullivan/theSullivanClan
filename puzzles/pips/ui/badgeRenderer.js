// ============================================================
// FILE: badgeRenderer.js
// PURPOSE: Renders region rule badges at the top-left corner
//          of each region's bounding box.
// ============================================================

export function renderRegionBadges(regions, boardEl) {
  // Remove any existing badges
  const oldLayers = boardEl.querySelectorAll(".badge-layer");
  oldLayers.forEach(el => el.remove());

  for (const region of regions) {
    if (!region.rule) continue; // no rule → no badge

    // Compute bounding box
    let minRow = Infinity, minCol = Infinity;

    for (const cell of region.cells) {
      if (cell.row < minRow) minRow = cell.row;
      if (cell.col < minCol) minCol = cell.col;
    }

    // Create badge layer
    const layer = document.createElement("div");
    layer.className = "badge-layer";

    // Position using CSS variables
    layer.style.left = `calc(${minCol} * var(--cell-size))`;
    layer.style.top  = `calc(${minRow} * var(--cell-size))`;

    // Create badge
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = region.rule;

    layer.appendChild(badge);
    boardEl.appendChild(layer);
  }
}
