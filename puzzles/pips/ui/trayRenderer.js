// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Render the tray area using grid truth as the sole
//          authority for whether a domino is in the tray.
// NOTES:
//   - The tray has fixed, non-collapsing slots.
//   - A domino appears in the tray if and only if it does NOT
//     occupy any grid cells.
//   - The grid is canonical; domino metadata is not trusted
//     for tray/board membership decisions.
//   - This module is pure rendering: it never mutates state.
// ============================================================

import { renderDomino } from "./dominoRenderer.js";
import { findDominoCells } from "../engine/grid.js";

// ------------------------------------------------------------
// renderTray(puzzleJson, dominos, trayEl, grid)
// Renders all tray slots and places dominos that are not
// currently present in the grid into their fixed home slots.
//
// This function deliberately derives tray membership from
// grid occupancy rather than domino fields like row0 or
// location. If a domino occupies any grid cell, it is
// considered "on the board" and must not appear in the tray.
//
// INPUTS:
//   puzzleJson - original puzzle definition (for slot count)
//   dominos    - Map or iterable of canonical domino objects
//   trayEl     - DOM element that owns the tray
//   grid       - canonical grid occupancy structure
//
// GUARANTEES:
//   - Tray slots never collapse or shift.
//   - Dominos on the board never appear in the tray.
//   - Rendering reflects engine truth exactly.
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
  // Each domino has a stable homeSlot assigned at load time.
  // Slots are always rendered, even if empty.
  // ----------------------------------------------------------
  const slotCount = puzzleJson.dominos.length;

  for (let i = 0; i < slotCount; i++) {
    const slot = document.createElement("div");
    slot.className = "tray-slot";
    slot.dataset.slot = String(i);
    trayEl.appendChild(slot);
  }

  // ----------------------------------------------------------
  // 2. Render dominos that are NOT present in the grid
  // Grid occupancy is the sole authority for tray membership.
  // ----------------------------------------------------------
  const list = dominos instanceof Map ? dominos : new Map(dominos);

  for (const [id, d] of list) {
    // Ask the grid whether this domino occupies any cells.
    // If it does, it belongs on the board and must not
    // appear in the tray.
    const cells = findDominoCells(grid, String(d.id));
    if (cells.length > 0) continue;

    if (typeof d.homeSlot !== "number") {
      console.error("renderTray: domino missing homeSlot", { id, domino: d });
      continue;
    }

    const slot = trayEl.querySelector(
      `.tray-slot[data-slot="${d.homeSlot}"]`
    );

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
    wrapper.dataset.trayOrientation = String(d.trayOrientation ?? 0);

    // Pass tray orientation through a CSS variable so the
    // domino renderer remains geometry-agnostic.
    if (typeof d.trayOrientation === "number") {
      wrapper.style.setProperty(
        "--tray-orientation",
        `${d.trayOrientation}deg`
      );
    }

    const trayOrientation = ((d.trayOrientation ?? 0) % 360 + 360) % 360;
    
    let half0Side;
    switch (trayOrientation) {
      case 0:
        half0Side = "left";
        break;
      case 180:
        half0Side = "right";
        break;
      case 90:
        half0Side = "top";
        break;
      case 270:
        half0Side = "bottom";
        break;
      default:
        half0Side = "left";
    }
    
    wrapper.dataset.half0Side = half0Side;

    renderDomino(d, wrapper);
    slot.appendChild(wrapper);
  }
}
