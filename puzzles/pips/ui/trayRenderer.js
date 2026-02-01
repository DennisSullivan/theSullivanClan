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

    // ------------------------------------------------------------
    // DIAGNOSTIC 1 — wrapper BEFORE renderDomino()
    // ------------------------------------------------------------
    console.log("TRAY DIAG: BEFORE renderDomino", {
      id: d.id,
      classList: [...wrapper.classList],
      inlineStyle: wrapper.getAttribute("style"),
      offsetWidth: wrapper.offsetWidth,
      offsetHeight: wrapper.offsetHeight
    });

    // Render domino inside wrapper
    renderDomino(d, wrapper);

    // Apply tray rotation
    const domEl = wrapper.querySelector(".domino");
    domEl.style.transform = `rotate(${d.trayOrientation}deg)`;

    // ------------------------------------------------------------
    // DIAGNOSTIC 2 — wrapper + domino AFTER renderDomino()
    // ------------------------------------------------------------
    console.log("TRAY DIAG: AFTER renderDomino", {
      id: d.id,
      wrapper: {
        classList: [...wrapper.classList],
        inlineStyle: wrapper.getAttribute("style"),
        offsetWidth: wrapper.offsetWidth,
        offsetHeight: wrapper.offsetHeight
      },
      domino: {
        classList: [...domEl.classList],
        inlineStyle: domEl.getAttribute("style"),
        offsetWidth: domEl.offsetWidth,
        offsetHeight: domEl.offsetHeight
      },
      outerHTML: wrapper.outerHTML
    });

    // Place into next slot
    if (index < slots.length) {
      slots[index].appendChild(wrapper);
    }
    index++;
  }
}
