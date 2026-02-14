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

/**
 * renderTray(puzzleJson, dominos, trayEl)
 * Renders the tray:
 *  - Creates one fixed slot per puzzleJson.dominos entry.
 *  - Places each tray domino into its homeSlot.
 * Expects:
 *  - puzzleJson.dominos: array with at least id/homeSlot per domino.
 *  - dominos: Map of domino objects keyed by id.
 *  - trayEl: DOM element that will contain the tray.
 */
export function renderTray(puzzleJson, dominos, trayEl) {
  // Defensive: trayEl must exist.
  if (!trayEl) {
    console.error("renderTray: trayEl is null or undefined. Ensure the tray container exists in the DOM.");
    return;
  }

  // Defensive: puzzleJson.dominos must be an array.
  if (!puzzleJson || !Array.isArray(puzzleJson.dominos)) {
    console.error("renderTray: invalid puzzleJson.dominos", puzzleJson);
    trayEl.innerHTML = "";
    return;
  }

  trayEl.innerHTML = "";

  // ----------------------------------------------------------
  // 1. Create fixed tray slots (one per domino definition)
  // ----------------------------------------------------------
  const slotCount = puzzleJson.dominos.length;

  for (let i = 0; i < slotCount; i++) {
    const slot = document.createElement("div");
    slot.className = "tray-slot";
    slot.dataset.slot = String(i);
    trayEl.appendChild(slot);
  }

  // Defensive: dominos should be a Map.
  if (!(dominos instanceof Map)) {
    console.warn("renderTray: dominos is not a Map; attempting to iterate anyway", dominos);
  }

  // ----------------------------------------------------------
  // 2. Place dominos into their stable homeSlot
  // ----------------------------------------------------------
  for (const [id, d] of dominos) {
    // Skip dominos that are on the board.
    if (d.row0 !== null && d.col0 !== null) continue;

    // Skip dominos without a valid homeSlot.
    if (typeof d.homeSlot !== "number") {
      console.error("renderTray: domino missing homeSlot; skipping", { id, domino: d });
      continue;
    }

    const slot = trayEl.querySelector(`.tray-slot[data-slot="${d.homeSlot}"]`);

    // If the slot is missing, this indicates a mismatch between loader and tray.
    if (!slot) {
      console.error("renderTray: no tray-slot found for homeSlot", {
        id,
        homeSlot: d.homeSlot,
        slotCount
      });
      continue;
    }

    // Render domino into its wrapper.
    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper in-tray";
    wrapper.dataset.dominoId = String(d.id);

    renderDomino(d, wrapper);

    // Apply tray orientation if present.
    if (typeof d.trayOrientation === "number") {
      wrapper.style.setProperty("--angle", `${d.trayOrientation}deg`);

      // Medium diagnostics: confirm rotation is applied.
      setTimeout(() => {
        const cs = getComputedStyle(wrapper);
        const rect = wrapper.getBoundingClientRect();
        console.log("TRAY: rotation applied", {
          id: d.id,
          angle: d.trayOrientation,
          transform: cs.transform,
          width: rect.width.toFixed(1),
          height: rect.height.toFixed(1)
        });
      }, 0);
    }

    slot.appendChild(wrapper);
  }
}
