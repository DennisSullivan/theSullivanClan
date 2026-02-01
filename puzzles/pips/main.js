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
import { enableDrag } from "./ui/dragDrop.js";
import { syncCheck } from "./engine/syncCheck.js";


// ------------------------------------------------------------
// startPuzzle(puzzleJson)
// Initializes the entire puzzle system.
// INPUTS:
//   puzzleJson - parsed puzzle definition
// NOTES:
//   - Returns the engine state for debugging.
// ------------------------------------------------------------
export function startPuzzle(puzzleJson) {
  console.log("startPuzzle() called");
  // Load engine state
  const state = loadPuzzle(puzzleJson);

  const {
    dominos,
    grid,
    regionMap,
    blocked,
    regions,
    rules,
    history
  } = state;
  console.log("STATE:", state);

  // DOM containers
  const boardEl = document.getElementById("board");
  const trayEl = document.getElementById("tray");

  // Initial render (delayed to ensure CSS variables are applied)
  await Promise.resolve();
  renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
  renderTray(dominos, trayEl);

  // Enable interactions
  enableDrag(dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
 
  // Initial sync check
  syncCheck(dominos, grid);

  return state; // useful for debugging in console
}


// ------------------------------------------------------------
// loadAndStart(url)
// Convenience helper: fetches a puzzle file and starts it.
// NOTES:
//   - Optional helper for real deployments.
// ------------------------------------------------------------
export async function loadAndStart(url) {
  console.log("loadAndStart() fetching:", url);
  const response = await fetch(url);
  const json = await response.json();
  return startPuzzle(json);
}
