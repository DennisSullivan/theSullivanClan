// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Render the tray area using grid truth as the sole
//          authority for whether a domino is in the tray.
// NOTES:
//   - The tray has fixed, non-collapsing slots.
//   - A domino appears in the tray if and only if it does NOT
//     occupy any grid cells.
//   - Tray rotation is visual-only (CSS animated).
//   - Canonical geometry is derived at drag start, not here.
//   - This module is pure rendering: it never mutates state.
// ============================================================

import { createDominoElement } from "./createDominoElement.js";
import { renderDomino } from "./dominoRenderer.js";
import { findDominoCells } from "../engine/grid.js";

// ------------------------------------------------------------
// renderTray(puzzleJson, dominos, trayEl, grid)
// ------------------------------------------------------------
export function renderTray(puzzleJson, dominos, trayEl, grid) {
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
  // 2. Render dominos NOT present in the grid
  // ----------------------------------------------------------
  const list = dominos instanceof Map ? dominos : new Map(dominos);

  for (const [id, d] of list) {
    const cells = findDominoCells(grid, String(d.id));
    if (cells.length > 0) continue; // skip dominos on board

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

    // --------------------------------------------------------
    // Create wrapper + canonical inner DOM
    // --------------------------------------------------------
    const wrapper = document.createElement("div");
    wrapper.classList.add("domino-wrapper", "in-tray");
    wrapper.dataset.dominoId = String(d.id);
    wrapper.dataset.half0Side = "left"; // tray default

    // --------------------------------------------------------
    // VISUAL-ONLY ORIENTATION
    // --------------------------------------------------------
    const trayOrientation =
      ((d.trayOrientation ?? 0) % 360 + 360) % 360;

    wrapper.dataset.trayOrientation = String(trayOrientation);
    wrapper.style.setProperty("--tray-orientation", `${trayOrientation}deg`);

    // --------------------------------------------------------
    // CRITICAL: CLEAR BOARD GEOMETRY ATTRIBUTES
    // (Tray dominos must never present fake board geometry.)
    // --------------------------------------------------------
    delete wrapper.dataset.row0;
    delete wrapper.dataset.col0;
    delete wrapper.dataset.row1;
    delete wrapper.dataset.col1;

    const inner = createDominoElement();
    wrapper.appendChild(inner);

    renderDomino(d, wrapper);

    slot.appendChild(wrapper);
  }
}
