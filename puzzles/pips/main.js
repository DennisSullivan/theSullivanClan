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
import { renderBoard } from "./ui/boardRenderer.js";
import { renderTray } from "./ui/trayRenderer.js";
import { installDragDrop } from "./ui/dragDrop.js";
import { initRotation } from "./ui/rotation.js";
import { syncCheck } from "./engine/syncCheck.js";
import { renderRegions } from "./ui/regionRenderer.js";
import { renderBlockedCells } from "./ui/blockedRenderer.js";
import { renderRegionBadges } from "./ui/badgeRenderer.js";
import { attachPlacementValidator } from "./engine/placementValidator.js";

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

  // Build engine state (dominos Map, grid, regionMap, blocked Set, regions, history)
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
    renderTray(puzzleDef, dominos, trayEl);
    renderRegions(regionMap, boardEl);
    renderBlockedCells(blocked, boardEl);
    renderRegionBadges(regions, boardEl);
    syncCheck(dominos, grid);
  }

  // Initial render + wiring (deferred to allow DOM to settle)
  setTimeout(() => {
    renderPuzzle();

    // Attach placement validator so it can observe pips:* events emitted by dragDrop
    attachPlacementValidator(appRoot, state);

    // Enable drag/drop
    installDragDrop(boardEl, trayEl, dominos, (domino, x, y) => {
      // This is the drop callback: boardRenderer handles placement
      // You already have placementValidator listening to pips:* events
      // so we simply forward the drop coordinates.
      const event = new CustomEvent("pips:drop", {
        detail: { domino, x, y }
      });
      boardEl.dispatchEvent(event);
    });
    
    // Enable rotation mode (rotation no longer depends on dragDrop)
    initRotation(dominos, trayEl, boardEl, renderPuzzle);
  }, 0);

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

    if (!validatePuzzle(json)) {
      console.error("loadAndStart: invalid puzzle JSON", json);
      return null;
    }

    return startPuzzle(json);
  } catch (err) {
    console.error("loadAndStart: fetch or parse error", err);
    return null;
  }
}
