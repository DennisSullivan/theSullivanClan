// engine/placementValidator.js
// Centralized placement/rotation validator and history wiring.

import {
  placeDomino,
  moveDomino,
  rotateDominoOnBoard,
  commitRotation,
  removeDominoToTray
} from "./placement.js";

import { evaluateAllRegions } from "./regionRules.js";
import { recordAction } from "./history.js";

/**
 * parseRuleString(ruleStr)
 * Accepts strings like "6", "=2", "<3", ">12", "<=5", "!=7"
 * Returns { op, value } or null on failure.
 */
function parseRuleString(ruleStr) {
  if (ruleStr == null) return null;
  const s = String(ruleStr).trim();
  const m = s.match(/^(\<=|\>=|!=|=|<|>){0,1}\s*(-?\d+)$/);
  if (!m) return null;
  const op = m[1] || "=";
  const value = Number(m[2]);
  return { op, value };
}

/**
 * normalizeRegionRules(regions)
 * Ensures each region.rule is an object {op, value}.
 */
function normalizeRegionRules(regions) {
  if (!Array.isArray(regions)) return;
  for (const region of regions) {
    if (!region.rule) continue;
    if (typeof region.rule === "object" && typeof region.rule.op === "string" && typeof region.rule.value === "number") {
      continue;
    }
    if (typeof region.rule === "number" || /^\s*-?\d+\s*$/.test(String(region.rule))) {
      region.rule = { op: "=", value: Number(region.rule) };
      continue;
    }
    if (typeof region.rule === "string") {
      const parsed = parseRuleString(region.rule);
      if (parsed) {
        region.rule = parsed;
      } else {
        // leave as-is; evaluateAllRegions will warn if invalid
      }
    }
  }
}

/**
 * attachPlacementValidator(appRoot, puzzle)
 * - appRoot: DOM element to listen for events on (usually document or app root)
 * - puzzle: { dominos: Map, grid, regionMap, blocked: Set, regions: Array, history }
 */
export function attachPlacementValidator(appRoot, puzzle) {
  if (!appRoot || !puzzle) throw new Error("attachPlacementValidator: missing args");

  const { dominos, grid, regionMap, blocked, regions, history } = puzzle;

  // Ensure region.rule objects are normalized
  normalizeRegionRules(regions);

  // Helper: run blocked + region checks after grid reflects tentative geometry
  function validateBlockedAndRegions() {
    // blocked cells
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (!grid[r][c]) continue;
        if (blocked && blocked.has(`${r},${c}`)) {
          return { ok: false, reason: "blocked", cell: { r, c } };
        }
      }
    }

    // region rules
    const regionResults = evaluateAllRegions(grid, regionMap, regions);
    for (const rr of regionResults) {
      if (!rr.satisfied) return { ok: false, reason: "region", regionId: rr.id, currentValue: rr.currentValue, rule: rr.rule };
    }

    return { ok: true };
  }

  // ------------------------------------------------------------
  // Drop on board attempt
  // Event: 'pips:drop-attempt-board' with detail { id, targetCell:{row,col}, clickedHalf }
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:drop-attempt-board", (ev) => {
    const { id, targetCell, clickedHalf } = ev.detail || {};
    if (!id || !targetCell) return;

    const d = dominos instanceof Map ? dominos.get(id) : dominos.find(x => String(x.id) === String(id));
    if (!d) {
      ev.target.dispatchEvent(new CustomEvent("pips:drop-reject", { detail: { id, reason: "unknown-domino" } }));
      return;
    }

    // Attempt placement (placeDomino writes to grid on success)
    const placed = placeDomino(d, targetCell.row, targetCell.col, grid, clickedHalf);
    if (!placed) {
      ev.target.dispatchEvent(new CustomEvent("pips:drop-reject", { detail: { id, reason: "no-space" } }));
      return;
    }

    // Validate blocked/regions
    const vr = validateBlockedAndRegions();
    if (!vr.ok) {
      // rollback: remove from board (return to tray)
      removeDominoToTray(d, grid);
      ev.target.dispatchEvent(new CustomEvent("pips:drop-reject", { detail: { id, reason: vr.reason, info: vr } }));
      return;
    }

    // Success: record history and emit commit
    recordAction(history, { type: "place", id: d.id, r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1, prevTrayOrientation: d.trayOrientation });
    ev.target.dispatchEvent(new CustomEvent("pips:drop-commit", { detail: { id: d.id, r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 } }));
  });

  // ------------------------------------------------------------
  // Drop on tray attempt
  // Event: 'pips:drop-attempt-tray' with detail { id, slot }
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:drop-attempt-tray", (ev) => {
    const { id, slot } = ev.detail || {};
    if (!id) return;

    const d = dominos instanceof Map ? dominos.get(id) : dominos.find(x => String(x.id) === String(id));
    if (!d) return;

    // If on board, record previous geometry for history
    if (d.row0 !== null) {
      const prev = { r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1, pivotHalf: d.pivotHalf ?? 0 };
      removeDominoToTray(d, grid);
      recordAction(history, { type: "return", id: d.id, prev });
    }

    // Reset tray orientation per UX rules
    d.trayOrientation = 0;

    ev.target.dispatchEvent(new CustomEvent("pips:drop-commit-tray", { detail: { id: d.id, slot } }));
  });

  // ------------------------------------------------------------
  // Invalid drop (fallback)
  // Event: 'pips:drop-invalid' with detail { id }
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:drop-invalid", (ev) => {
    const { id } = ev.detail || {};
    if (!id) return;
    const d = dominos instanceof Map ? dominos.get(id) : dominos.find(x => String(x.id) === String(id));
    if (!d) return;

    // Ensure domino is returned to tray and orientation reset
    removeDominoToTray(d, grid);
    d.trayOrientation = 0;

    ev.target.dispatchEvent(new CustomEvent("pips:drop-reject", { detail: { id, reason: "invalid" } }));
  });

  // ------------------------------------------------------------
  // Board rotate request (double-click)
  // Event: 'pips:board-rotate-request' with detail { id, pivotHalf }
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:board-rotate-request", (ev) => {
    const { id, pivotHalf } = ev.detail || {};
    if (!id) return;

    const d = dominos instanceof Map ? dominos.get(id) : dominos.find(x => String(x.id) === String(id));
    if (!d) {
      ev.target.dispatchEvent(new CustomEvent("pips:board-rotate-reject", { detail: { id, reason: "unknown-domino" } }));
      return;
    }

    // Snapshot prev geometry for history
    const prev = { r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 };

    // Apply geometry-only rotation (placement.rotateDominoOnBoard does snapshot internally)
    rotateDominoOnBoard(d, pivotHalf);

    // Try to commit rotation (commitRotation validates bounds/occupancy and writes grid)
    const ok = commitRotation(d, grid);
    if (!ok) {
      // commitRotation restores previous geometry; emit reject
      ev.target.dispatchEvent(new CustomEvent("pips:board-rotate-reject", { detail: { id, reason: "illegal-rotation" } }));
      return;
    }

    // Validate blocked/regions after rotation
    const vr = validateBlockedAndRegions();
    if (!vr.ok) {
      // rollback: restore previous geometry by removing and re-placing prev coords
      // Simple approach: remove current occupancy then restore prev coords into grid
      removeDominoToTray(d, grid);
      // restore geometry in object
      d.row0 = prev.r0; d.col0 = prev.c0; d.row1 = prev.r1; d.col1 = prev.c1;
      // write back to grid if prev coords were on-board
      if (typeof prev.r0 === "number" && typeof prev.c0 === "number") {
        grid[prev.r0][prev.c0] = { dominoId: d.id, half: 0 };
      }
      if (typeof prev.r1 === "number" && typeof prev.c1 === "number") {
        grid[prev.r1][prev.c1] = { dominoId: d.id, half: 1 };
      }

      ev.target.dispatchEvent(new CustomEvent("pips:board-rotate-reject", { detail: { id, reason: vr.reason, info: vr } }));
      return;
    }

    // Success: record rotate action
    recordAction(history, { type: "rotate", id: d.id, prev, next: { r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 } });
    ev.target.dispatchEvent(new CustomEvent("pips:board-rotate-commit", { detail: { id: d.id } }));
  });

  // ------------------------------------------------------------
  // Optional: tray rotate event (single click) — already applied by controller
  // Event: 'pips:tray-rotate' with detail { id, from, to }
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:tray-rotate", (ev) => {
    // No-op by default. If you want tray-rotate undo, record here.
    // Example:
    // const { id, from, to } = ev.detail || {};
    // recordAction(history, { type: 'rotate-tray', id, prev: from, next: to });
  });
}
