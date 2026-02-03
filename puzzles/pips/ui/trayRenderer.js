// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Render tray dominos using stable homeSlot order.
// NOTES:
//   - Each domino has d.homeSlot assigned in loader.js
//   - Tray has fixed slots: no collapsing, no shifting
//   - If a domino is on the board, its slot stays empty
//   - Pure rendering: no state mutation
// ============================================================

import { renderDomino } from "./dominoRenderer.js";

export function renderTray(puzzleJson, dominos, trayEl) {
  // Defensive guards
  if (!trayEl) {
    console.error("renderTray: trayEl is null or undefined. Ensure the tray container exists in the DOM.");
    return;
  }

  if (!puzzleJson || !Array.isArray(puzzleJson.dominos)) {
    console.error("renderTray: invalid puzzleJson.dominos", puzzleJson);
    trayEl.innerHTML = "";
    return;
  }

  trayEl.innerHTML = "";

  // ----------------------------------------------------------
  // 1. Create fixed tray slots (one per domino)
  // ----------------------------------------------------------
  const slotCount = puzzleJson.dominos.length;

  for (let i = 0; i < slotCount; i++) {
    const slot = document.createElement("div");
    slot.className = "tray-slot";
    slot.dataset.slot = i;
    trayEl.appendChild(slot);
  }

  // ----------------------------------------------------------
  // 2. Place dominos into their stable homeSlot
  // ----------------------------------------------------------
  for (const [id, d] of dominos) {
    // Skip dominos that are on the board
    if (d.row0 !== null) continue;

    // Skip dominos without a valid homeSlot
    if (typeof d.homeSlot !== "number") {
      console.warn(`renderTray: Domino ${id} missing homeSlot`);
      continue;
    }

    const slot = trayEl.querySelector(`.tray-slot[data-slot="${d.homeSlot}"]`);
    if (!slot) continue;

    // Render domino into its slot
    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper in-tray";

    renderDomino(d, wrapper);

    // Apply tray orientation if present
    const domEl = wrapper.querySelector(".domino");
    if (domEl && typeof d.trayOrientation === "number") {
      wrapper.style.setProperty('--angle', `${d.trayOrientation}deg`);
      // === Instrumentation: verify rotation is applied ===
      setTimeout(() => {
        const cs = getComputedStyle(wrapper);
        const rect = wrapper.getBoundingClientRect();
        console.log(
          `TRAY ROTATION DEBUG — id=${d.id}, angle=${d.trayOrientation}, ` +
          `computedTransform=${cs.transform}, ` +
          `bbox=${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`
        );
      }, 0);
    }

    slot.appendChild(wrapper);
  }
}
