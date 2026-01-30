// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Renders the tray and positions dominos in their
//          canonical home slots.
// NOTES:
//   - Pure UI: reads domino state, never mutates it.
//   - trayOrientation controls visual rotation only.
//   - Home slot index comes from MASTER_TRAY order.
// ============================================================

import { MASTER_TRAY } from "../engine/domino.js";
import { renderDomino } from "./dominoRenderer.js";


// ------------------------------------------------------------
// renderTray(dominos, trayEl)
// Renders all dominos that are currently in the tray.
// INPUTS:
//   dominos - Map<id,Domino>
//   trayEl  - DOM element representing the tray container
// NOTES:
//   - Clears trayEl and re-renders all tray dominos.
//   - Board dominos are ignored here.
// ------------------------------------------------------------
export function renderTray(dominos, trayEl) {
  trayEl.innerHTML = ""; // full redraw for simplicity

  for (const id of MASTER_TRAY) {
    const d = dominos.get(id);
    if (!d) continue;

    // Only render dominos that are actually in the tray
    if (d.row0 === null) {
      const slotEl = createTraySlot(id);
      trayEl.appendChild(slotEl);
      renderDomino(d, slotEl);
    }
  }
}


// ------------------------------------------------------------
// createTraySlot(id)
// Creates a DOM container for a single tray slot.
// INPUTS:
//   id - domino ID (string "XY")
// RETURNS:
//   DOM element representing the slot
// NOTES:
//   - Slot positioning is handled by CSS grid or flexbox.
//   - This function only creates the wrapper.
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
// INPUTS:
//   dominoEl - DOM element for the domino
//   domino   - canonical Domino object
// NOTES:
//   - Called by dominoRenderer, not trayRenderer.
//   - Included here for clarity of responsibility.
// ------------------------------------------------------------
export function updateTrayOrientation(dominoEl, domino) {
  dominoEl.style.transform = `rotate(${domino.trayOrientation}deg)`;
}

