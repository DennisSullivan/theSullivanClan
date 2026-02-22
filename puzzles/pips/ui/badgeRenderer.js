// ============================================================
// FILE: badgeRenderer.js
// PURPOSE: Render region rule badges using a deterministic
//          visual anchor cell and strict placement geometry.
// NOTES:
//   - Pure UI: no engine mutation.
//   - Visual anchor cell = top-leftmost region cell.
//   - Badge overlaps ≤25% of anchor cell (upper-left quadrant).
//   - Badge color identity is solid and never blended.
// ============================================================

import { computeRegionColorMap } from "./regionColorAssigner.js";

const BADGE_DEBUG = true; // set false to silence logs + markers

export function renderRegionBadges(regions, regionMap, boardEl) {
  if (!boardEl || !Array.isArray(regions)) return;

  // Remove existing badges + debug markers
  boardEl.querySelectorAll(".badge-layer").forEach(el => el.remove());
  boardEl.querySelectorAll(".badge-debug-marker").forEach(el => el.remove());

  const rootStyle = getComputedStyle(document.documentElement);
  const cellSize = parseFloat(rootStyle.getPropertyValue("--cell-size"));
  const cellGap  = parseFloat(rootStyle.getPropertyValue("--cell-gap"));
  const stride   = cellSize + cellGap;

  const nudgeX = parseFloat(rootStyle.getPropertyValue("--domino-nudge-x")) || 0;
  const nudgeY = parseFloat(rootStyle.getPropertyValue("--domino-nudge-y")) || 0;

  const regionColorMap = computeRegionColorMap(regionMap);

  if (BADGE_DEBUG) {
    console.log("BADGES: globals", { cellSize, cellGap, stride, nudgeX, nudgeY });
  }

  for (const region of regions) {
    if (region.rule == null || !Array.isArray(region.cells) || region.cells.length === 0) continue;

    // Visual anchor cell: top-leftmost region cell
    const anchor = region.cells
      .slice()
      .sort((a, b) => a.row - b.row || a.col - b.col)[0];

    const anchorCell = boardEl.querySelector(
      `.board-cell[data-row="${anchor.row}"][data-col="${anchor.col}"]`
    );
    if (!anchorCell) {
      if (BADGE_DEBUG) console.warn("BADGES: missing anchorCell", { regionId: region.id, anchor });
      continue;
    }

    // Badge element
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

    // Measure badge in board context
    boardEl.appendChild(badge);
    const bw = badge.offsetWidth;
    const bh = badge.offsetHeight;
    badge.remove();

    // Overlap contract
    const overlapX = Math.min(bw * 0.25, cellSize * 0.25);
    const overlapY = Math.min(bh * 0.25, cellSize * 0.25);

    // --------------------------------------------------------
    // A) CURRENT (math-based) placement
    // --------------------------------------------------------
    const left_math = anchor.col * stride - (bw - overlapX);
    const top_math  = anchor.row * stride - (bh - overlapY);

    // --------------------------------------------------------
    // B) DOM-truth placement (what the grid actually did)
    //    Anchor to the real cell box inside the board.
    // --------------------------------------------------------
    const cellLeft_dom = anchorCell.offsetLeft;
    const cellTop_dom  = anchorCell.offsetTop;

    const left_dom = cellLeft_dom - (bw - overlapX);
    const top_dom  = cellTop_dom  - (bh - overlapY);

    // --------------------------------------------------------
    // C) Apply (choose one) — for now, keep YOUR math so we can diff
    // --------------------------------------------------------
    const left = left_math;
    const top  = top_math;

    const layer = document.createElement("div");
    layer.className = "badge-layer";
    layer.style.left = `${left}px`;
    layer.style.top  = `${top}px`;

    layer.appendChild(badge);
    boardEl.appendChild(layer);

    if (BADGE_DEBUG) {
      const dx = left_math - left_dom;
      const dy = top_math - top_dom;

      console.log("BADGES: region", {
        regionId: region.id,
        anchor,
        bw, bh,
        overlapX, overlapY,
        cellLeft_dom, cellTop_dom,
        left_math, top_math,
        left_dom, top_dom,
        dx, dy
      });

      // Optional visual marker at computed origin (top-left of badge layer)
      const m = document.createElement("div");
      m.className = "badge-debug-marker";
      m.style.position = "absolute";
      m.style.left = `${left}px`;
      m.style.top = `${top}px`;
      m.style.width = "0";
      m.style.height = "0";
      m.style.zIndex = "9999";
      m.style.pointerEvents = "none";
      m.style.borderLeft = "8px solid rgba(255,0,0,0.8)";
      m.style.borderTop = "8px solid rgba(255,0,0,0.8)";
      boardEl.appendChild(m);
    }
  }
}
