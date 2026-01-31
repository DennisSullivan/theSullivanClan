// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Render the tray using fixed 14‑column NYT‑style grid.
// NOTES:
//   - Always renders all 28 tray slots in MASTER_TRAY order.
//   - Only dominos with row0 === null appear in the tray.
//   - Wrapper uses .domino-wrapper.in-tray for natural sizing.
// ============================================================

import { MASTER_TRAY } from "../engine/domino.js";
import { renderDomino } from "./dominoRenderer.js";


// ------------------------------------------------------------
// renderTray(dominos, trayEl)
// Renders the entire tray: 28 fixed slots, dominos in place.
// ------------------------------------------------------------
export function renderTray(dominos, trayEl) {
  trayEl.innerHTML = ""; // full redraw

  for (const id of MASTER_TRAY) {
    const d = dominos.get(id);

    // Create the fixed slot
    const slotEl = document.createElement("div");
    slotEl.className = "tray-slot";
    slotEl.dataset.id = id;
    trayEl.appendChild(slotEl);

    // If domino is not in the tray, leave slot empty
    if (!d || d.row0 !== null) continue;

    // Create wrapper for the domino
    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper in-tray";
    wrapper.style.transform = ""; // ensure clean state
    slotEl.appendChild(wrapper);

    // Render the domino inside the wrapper
    renderDomino(d, wrapper);
  }
}
