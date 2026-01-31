// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Renders the tray with fixed home slots for all dominos.
// NOTES:
//   - Always renders all 28 slots in MASTER_TRAY order.
//   - If a domino is in the tray, it appears in its home slot.
//   - If a domino is on the board, its slot remains empty.
//   - Pure UI: reads domino state, never mutates it.
// ============================================================

import { MASTER_TRAY } from "../engine/domino.js";
import { renderDomino } from "./dominoRenderer.js";


// ------------------------------------------------------------
// renderTray(dominos, trayEl)
// Renders all 28 fixed tray slots in canonical order.
// Each slot corresponds to MASTER_TRAY[index].
// If the domino is in the tray, it is rendered in that slot.
// If the domino is on the board, the slot remains empty.
// ------------------------------------------------------------
export function renderTray(dominos, trayEl) {
  trayEl.innerHTML = ""; // full redraw

  for (const id of MASTER_TRAY) {
    const d = dominos.get(id);

    // Create the fixed slot
    const slotEl = createTraySlot(id);
    trayEl.appendChild(slotEl);

    // If the domino is in the tray, render it
    if (d && d.row0 === null) {
      const wrapper = document.createElement("div");
      wrapper.className = "domino-wrapper";
      slotEl.appendChild(wrapper);

      renderDomino(d, wrapper);
    }
  }
}


// ------------------------------------------------------------
// createTraySlot(id)
// Creates a DOM container for a single tray slot.
// Slot positioning is handled by CSS (grid or flex).
// ------------------------------------------------------------
function createTraySlot(id) {
  const slot = document.createElement("div");
  slot.className = "tray-slot";
  slot.dataset.id = id;
  return slot;
}


// ------------------------------------------------------------
// updateTrayOrientation(dominoEl, domino)
// Applies trayOrientation to a domino element.
// Called by dominoRenderer, not trayRenderer.
// ------------------------------------------------------------
export function updateTrayOrientation(dominoEl, domino) {
  dominoEl.style.transform = `rotate(${domino.trayOrientation}deg)`;
}
