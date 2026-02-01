// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Render tray dominos using canonical domino model.
// NOTES:
//   - Uses renderDomino() for pip grid + structure
//   - Tray layout is a fixed CSS grid (28 slots)
//   - Tray rotation uses domino.trayOrientation
// ============================================================

import { renderDomino } from "./dominoRenderer.js";

export function renderTray(dominos, trayEl) {
  trayEl.innerHTML = "";

  // Create 28 tray slots
  for (let i = 0; i < 28; i++) {
    const slot = document.createElement("div");
    slot.className = "tray-slot";
    trayEl.appendChild(slot);
  }

  const slots = trayEl.querySelectorAll(".tray-slot");
  let index = 0;

  for (const [id, d] of dominos) {
    if (d.row0 !== null) continue; // only tray dominos

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper in-tray";

    // Render domino inside wrapper
    renderDomino(d, wrapper);

    // Apply tray rotation
    const domEl = wrapper.querySelector(".domino");
    domEl.style.transform = `rotate(${d.trayOrientation}deg)`;

    // Place into next slot
    if (index < slots.length) {
      slots[index].appendChild(wrapper);
    }
    index++;
  }
}
