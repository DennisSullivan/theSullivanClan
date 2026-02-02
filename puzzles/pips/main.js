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
import { enableDrag, endDrag } from "./ui/dragDrop.js";
import { initRotation } from "./ui/rotation.js";
import { syncCheck } from "./engine/syncCheck.js";

function validatePuzzle(p) {
  if (!p || typeof p !== "object") return false;
  if (!Array.isArray(p.dominos)) return false;
  return true;
}

// ------------------------------------------------------------
// startPuzzle(puzzleJson)
// ------------------------------------------------------------
export function startPuzzle(puzzleJson) {
  console.log("startPuzzle() called");

  if (!validatePuzzle(puzzleJson)) {
    console.error("startPuzzle: invalid puzzleJson", puzzleJson);
    return null;
  }

  const puzzleDef = JSON.parse(JSON.stringify(puzzleJson));
  console.log("startPuzzle puzzleDef:", puzzleDef);

  const state = loadPuzzle(puzzleJson);

  const {
    dominos,
    grid,
    regionMap,
    blocked,
    regions
  } = state;

  console.log("STATE:", state);

  const boardEl = document.getElementById("board");
  const trayEl = document.getElementById("tray");

  // Wrapper for rotation.js
  function renderPuzzle() {
    renderBoard(dominos, grid, regionMap, blocked, regions, boardEl);
    renderTray(puzzleDef, dominos, trayEl);
    syncCheck(dominos, grid);
  }

  // Initial render
  setTimeout(() => {
    renderPuzzle();

    // Enable drag/drop
    enableDrag(puzzleDef, dominos, grid, regionMap, blocked, regions, boardEl, trayEl);

    // Enable rotation mode
    initRotation(dominos, trayEl, boardEl, renderPuzzle, endDrag);
  }, 0);

  syncCheck(dominos, grid);

  return state;
}

// ------------------------------------------------------------
// loadAndStart(url)
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
