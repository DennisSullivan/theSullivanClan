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

function validatePuzzle(p) {
  if (!p || typeof p !== "object") return false;
  if (!Array.isArray(p.dominos)) return false;
  // optional: require id or version if you want
  return true;
}

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

  if (!validatePuzzle(puzzleJson)) {
    console.error("startPuzzle: invalid puzzleJson", puzzleJson);
    return null;
  }

  // Preserve an immutable UI copy for tray rendering and UI use
  const puzzleDef = JSON.parse(JSON.stringify(puzzleJson));
  console.log("startPuzzle puzzleDef:", puzzleDef);

  // Load engine state (engine may normalize/mutate the original)
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
  setTimeout(() => {
    renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
    renderTray(puzzleDef, dominos, trayEl);

    // Now that DOM is rendered and puzzleDef is preserved, enable drag
    enableDrag(puzzleDef, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);
  }, 0);

  // Initial sync check
  syncCheck(dominos, grid);

  return state; // useful for debugging in console
}


// ------------------------------------------------------------
// loadAndStart(url)
// Convenience helper: fetches a puzzle file and starts it.
// NOTES:
//   - Validates puzzle JSON before starting.
// ------------------------------------------------------------
export async function loadAndStart(url) {
  console.log("loadAndStart() fetching:", url);
  try {
    const response = await fetch(url);
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
