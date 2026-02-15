// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Render tray dominos into fixed home slots.
// NOTES:
//   - Each domino has d.homeSlot assigned in loader.js.
//   - Tray has fixed slots: no collapsing, no shifting.
//   - If a domino is on the board, its slot stays empty.
//   - Pure rendering: no state mutation.
// ============================================================

import { renderDomino } from "./dominoRenderer.js";

export function renderTray(puzzleJson, dominos, trayEl) {
  if (!trayEl) {
    console.error("renderTray: trayEl is null or undefined.");
    return;
  }

  if (!puzzleJson || !Array.isArray(puzzleJson.dominos)) {
    console.error("renderTray: invalid puzzleJson.dominos", puzzleJson);
    trayEl.innerHTML = "";
    return;
  }

  trayEl.innerHTML = "";

  // ----------------------------------------------------------
  // 1. Create fixed tray slots
  // ----------------------------------------------------------
  const slotCount = puzzleJson.dominos.length;

  for (let i = 0; i < slotCount; i++) {
    const slot = document.createElement("div");
    slot.className = "tray-slot";
    slot.dataset.slot = String(i);
    trayEl.appendChild(slot);
  }

  // ----------------------------------------------------------
  // 2. Place dominos into their stable homeSlot
  // ----------------------------------------------------------
  const list = dominos instanceof Map ? dominos : new Map(dominos);

  for (const [id, d] of list) {
    // Skip dominos that are on the board.
    if (d.row0 !== null && d.col0 !== null) continue;

    if (typeof d.homeSlot !== "number") {
      console.error("renderTray: domino missing homeSlot", { id, domino: d });
      continue;
    }

    const slot = trayEl.querySelector(`.tray-slot[data-slot="${d.homeSlot}"]`);
    if (!slot) {
      console.error("renderTray: no tray-slot found for homeSlot", {
        id,
        homeSlot: d.homeSlot,
        slotCount
      });
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper in-tray";
    wrapper.dataset.dominoId = String(d.id);

    // Pass tray orientation to dominoRenderer via CSS variable
    if (typeof d.trayOrientation === "number") {
      wrapper.style.setProperty("--tray-orientation", `${d.trayOrientation}deg`);
    }

    renderDomino(d, wrapper);
    slot.appendChild(wrapper);
  }
}
