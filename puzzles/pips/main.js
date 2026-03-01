// ============================================================
// FILE: main.js
// PURPOSE: Wires together the loader, engine, and UI.
// NOTES:
//   - Loads a puzzle JSON.
//   - Initializes engine state.
//   - Renders board + tray.
//   - Enables drag/drop and rotation.
//   - Runs SyncCheck after each action.
// ============================================================

import { loadPuzzle } from "./engine/loader.js";
import { validateStructure } from "./engine/structuralValidator.js";
import { renderBoard } from "./ui/boardRenderer.js";
import { renderTray } from "./ui/trayRenderer.js";
import { installDragDrop } from "./ui/dragDrop.js";
import { initRotation } from "./ui/rotation.js";
import { syncCheck } from "./engine/syncCheck.js";
import { renderRegions } from "./ui/regionRenderer.js";
import { renderBlockedCells } from "./ui/blockedRenderer.js";
import { renderRegionBadges } from "./ui/badgeRenderer.js";
import { installPlacementValidator } from "./ui/interaction/placementValidator.js";

/**
 * validatePuzzle(p)
 * Basic sanity checks for the incoming puzzle JSON.
 */
function validatePuzzle(p) {
  if (!p || typeof p !== "object") return false;
  if (!Array.isArray(p.dominos)) return false;
  if (typeof p.width !== "number" || typeof p.height !== "number") return false;
  return true;
}

// ------------------------------------------------------------
// startPuzzle(puzzleJson)
// Initializes engine state and wires UI + interactions.
// ------------------------------------------------------------
export function startPuzzle(puzzleJson) {
  console.log("startPuzzle() called");

  if (!validatePuzzle(puzzleJson)) {
    console.error("startPuzzle: invalid puzzleJson", puzzleJson);
    return null;
  }

  // Keep an immutable copy of the original JSON for renderers that expect it
  const puzzleDef = JSON.parse(JSON.stringify(puzzleJson));

  // Build engine state (dominos Map, grid, regionMap, blocked Set, regions)
  const state = loadPuzzle(puzzleJson);

  const {
    dominos,
    grid,
    regionMap,
    blocked,
    regions
  } = state;

  // DOM references (ensure these exist in your index.html)
  const boardEl = document.getElementById("board");
  const trayEl = document.getElementById("tray");
  const appRoot = document.getElementById("appRoot") || document;

  if (!boardEl || !trayEl) {
    console.error("startPuzzle: missing #board or #tray elements in DOM");
    return state;
  }

  // renderPuzzle is passed to rotation mode and used for re-renders
  function renderPuzzle() {
    renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
    renderTray(puzzleDef, dominos, trayEl, grid);
    renderRegions(regionMap, boardEl);
    renderBlockedCells(blocked, boardEl);
    renderRegionBadges(regions, regionMap, boardEl);
    syncCheck(dominos, grid);
  }

  // ------------------------------------------------------------
  // Re-render on canonical state updates
  // The engine/validator is the authority; when it says state
  // changed, we redraw board + tray from grid truth.
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:state:update", () => {
    console.log("MAIN: pips:state:update → renderPuzzle()");
    renderPuzzle();
  });

  // Optional: if your validator emits an explicit tray-return event,
  // re-render on that too so the UI always snaps back cleanly.
  appRoot.addEventListener("pips:drop:tray", () => {
    console.log("MAIN: pips:drop:tray → renderPuzzle()");
    renderPuzzle();
  });

  // Initial render + wiring (deferred to allow DOM to settle)
  setTimeout(() => {
    renderPuzzle();
    
    // Install placement validator so it can observe canonical pips:* events
    installPlacementValidator(appRoot, state);

    // Enable drag/drop
    installDragDrop({
      boardEl,
      trayEl,
      rows: puzzleDef.height,
      cols: puzzleDef.width
    });

    // Enable rotation mode (rotation no longer depends on dragDrop)
    initRotation(dominos, grid, trayEl, boardEl, renderPuzzle);
  }, 0);

  document.addEventListener("pips:drop:reject:board", e => {
  const { id, reason, info } = e.detail;

  console.groupCollapsed(
    `%cDROP REJECTED%c — ${reason}`,
    "color:#b00;font-weight:bold;",
    "color:#444;"
  );

  console.log("Domino:", id);
  console.log("Reason:", reason);

  if (info) {
    console.log("Engine info:", info);

    // Optional: break out common subfields if present
    if (info.proposal) console.log("Proposal:", info.proposal);
    if (info.blocked) console.log("Blocked:", info.blocked);
    if (info.bounds) console.log("Bounds:", info.bounds);
    if (info.occupancy) console.log("Occupancy:", info.occupancy);
  }

  console.groupEnd();
});

  /*
  document.addEventListener("pips:drop:reject:board", e => {
    const rej = e.detail;
  
    console.groupCollapsed(
      `%cDROP REJECTED%c — ${rej.reason}`,
      "color:#b00;font-weight:bold;",
      "color:#444;"
    );
  
    console.log("Reason:", rej.reason);
  
    if (rej.proposal) {
      console.log("Proposal:", rej.proposal);
    }
  
    if (rej.dominoId !== undefined) {
      console.log("Domino ID:", rej.dominoId);
    }
  
    if (rej.delta) {
      console.log("Delta (dr,dc):", rej.delta);
    }
  
    if (rej.cells) {
      console.log("Engine cell check:", rej.cells);
    }
  
    if (rej.region) {
      console.log("Region check:", rej.region);
    }
  
    if (rej.bounds) {
      console.log("Bounds check:", rej.bounds);
    }
  
    if (rej.occupancy) {
      console.log("Occupancy check:", rej.occupancy);
    }
  
    if (rej.ghost) {
      console.log("Ghost geometry:", rej.ghost);
    }
  
    console.groupEnd();
  });
  */

  // Expose for debugging and manual re-render
  window.__PIPS = window.__PIPS || {};
  window.__PIPS.puzzleDef = puzzleDef;
  window.__PIPS.state = state;
  window.__PIPS.renderPuzzle = renderPuzzle;

  console.log("startPuzzle: wiring complete");
  return state;
}

// ------------------------------------------------------------
// loadAndStart(url)
// Convenience helper to fetch a puzzle JSON and start it.
// ------------------------------------------------------------
export async function loadAndStart(url) {
  console.log("loadAndStart() fetching:", url);
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);

    const json = await response.json();

    // ------------------------------------------------------------
    // Structural validation — authoritative gate
    // ------------------------------------------------------------
    const validation = validateStructure(json);
    
    if (validation.status === "Rejected") {
      console.error("Structural validation failed:", validation);
      return validation;
    }

return startPuzzle(json);
  } catch (err) {
    console.error("loadAndStart: fetch or parse error", err);
    return null;
  }
}
