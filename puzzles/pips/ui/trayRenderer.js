// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Render tray dominos using puzzle-defined slot order.
// NOTES:
//   - Puzzle.dominos[] defines tray order
//   - If a domino is on the board, its slot stays empty
//   - No collapsing, no shifting
// ============================================================

import { renderDomino } from "./dominoRenderer.js";

export function renderTray(puzzle, dominos, trayEl) {
  trayEl.innerHTML = "";

  const trayOrder = puzzle.dominos;        // <-- the canonical order
  const slotCount = trayOrder.length;

  // Create fixed tray slots
  for (let i = 0; i < slotCount; i++) {
    const slot = document.createElement("div");
    slot.className = "tray-slot";
    slot.dataset.slot = i;
    trayEl.appendChild(slot);
  }

  // Place dominos into their fixed slots
  for (let i = 0; i < slotCount; i++) {
    const id = trayOrder[i];
    const d = dominos.get(id);
    const slot = trayEl.querySelector(`.tray-slot[data-slot="${i}"]`);

    if (!d || !slot) continue;

    // If the domino is on the board, leave the slot empty
    if (d.row0 !== null) continue;

    // Otherwise render it into the slot
    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper in-tray";

    renderDomino(d, wrapper);

    const domEl = wrapper.querySelector(".domino");
    domEl.style.transform = `rotate(${d.trayOrientation}deg)`;

    slot.appendChild(wrapper);
  }
}
