// engine/placementValidator.js
// Centralized placement/rotation validator and history wiring.

import {
  placeDomino,
  moveDomino,
  rotateDominoOnBoard,
  commitRotation as commitRotationFromPlacement,
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
  // If checkRegions is false, only blocked-cell checks are performed.
  function validateBlockedAndRegions(checkRegions = true) {
    // blocked cells
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (!grid[r][c]) continue;
        if (blocked && blocked.has(`${r},${c}`)) {
          return { ok: false, reason: "blocked", cell: { r, c } };
        }
      }
    }

    if (!checkRegions) return { ok: true };

    // region rules
    const regionResults = evaluateAllRegions(grid, regionMap, regions);
    for (const rr of regionResults) {
      if (!rr.satisfied) return { ok: false, reason: "region", regionId: rr.id, currentValue: rr.currentValue, rule: rr.rule };
    }

    return { ok: true };
  }

  // -------------------------
  // Rotation session state
  // -------------------------
  const rotationState = {
    inSession: false,
    activeDominoId: null,
    pivotHalf: null,
    startedAt: null,
    snapshot: null // { row0, col0, row1, col1 }
  };

  function startRotationSession(domino, pivotHalf = 0) {
    if (!domino) return false;
    rotationState.inSession = true;
    rotationState.activeDominoId = String(domino.id);
    rotationState.pivotHalf = pivotHalf;
    rotationState.startedAt = Date.now();
    rotationState.snapshot = { row0: domino.row0, col0: domino.col0, row1: domino.row1, col1: domino.col1 };
    return true;
  }

  function rotateSessionGeometry(pivotHalf) {
    if (!rotationState.inSession) return false;
    const id = rotationState.activeDominoId;
    const d = dominos instanceof Map ? dominos.get(id) : (dominos || []).find(x => String(x.id) === id);
    if (!d) return false;
    if (typeof rotateDominoOnBoard === "function") {
      rotateDominoOnBoard(d, pivotHalf);
    } else {
      // fallback rotation: rotate 90deg clockwise around pivotHalf
      const pivotR = pivotHalf === 0 ? d.row0 : d.row1;
      const pivotC = pivotHalf === 0 ? d.col0 : d.col1;
      const otherR = pivotHalf === 0 ? d.row1 : d.row0;
      const otherC = pivotHalf === 0 ? d.col1 : d.col0;
      const dr = otherR - pivotR;
      const dc = otherC - pivotC;
      const nr = pivotR - dc;
      const nc = pivotC + dr;
      if (pivotHalf === 0) { d.row1 = nr; d.col1 = nc; } else { d.row0 = nr; d.col0 = nc; }
    }
    rotationState.pivotHalf = pivotHalf;
    return true;
  }

  // Atomic commit helper (grid-safe): does not mutate grid until validation passes
  function commitRotationAtomic(domino, gridRef) {
    if (!domino) return { ok: false, reason: "invalid" };
    const rows = gridRef.length;
    const cols = gridRef[0] ? gridRef[0].length : 0;

    const targets = [
      { r: domino.row0, c: domino.col0, half: 0 },
      { r: domino.row1, c: domino.col1, half: 1 }
    ];

    // validate coords
    for (const t of targets) {
      if (typeof t.r !== "number" || typeof t.c !== "number") return { ok: false, reason: "invalid-coords" };
      if (t.r < 0 || t.r >= rows || t.c < 0 || t.c >= cols) return { ok: false, reason: "out-of-bounds" };
    }

    // collect old cells
    const oldCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const g = gridRef[r][c];
        if (g && String(g.dominoId) === String(domino.id)) oldCells.push({ r, c, half: g.half });
      }
    }

    // validate occupancy and blocked
    for (const t of targets) {
      const occ = gridRef[t.r][t.c];
      if (occ && String(occ.dominoId) !== String(domino.id)) {
        return { ok: false, reason: "occupied", cell: { r: t.r, c: t.c, occupant: occ.dominoId } };
      }
      if (typeof blocked !== "undefined" && blocked && blocked.has(`${t.r},${t.c}`)) {
        return { ok: false, reason: "blocked", cell: { r: t.r, c: t.c } };
      }
    }

    // perform atomic swap: clear old then write new
    oldCells.forEach(oc => { gridRef[oc.r][oc.c] = null; });
    targets.forEach(tc => { gridRef[tc.r][tc.c] = { dominoId: domino.id, half: tc.half }; });

    return { ok: true };
  }

  function endRotationSession(trigger) {
    if (!rotationState.inSession) return { ok: false, reason: "no-session" };
    const id = rotationState.activeDominoId;
    const d = dominos instanceof Map ? dominos.get(id) : (dominos || []).find(x => String(x.id) === id);
    if (!d) {
      rotationState.inSession = false;
      rotationState.activeDominoId = null;
      rotationState.snapshot = null;
      rotationState.pivotHalf = null;
      return { ok: false, reason: "missing-domino" };
    }

    const prev = rotationState.snapshot;
    const next = { r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 };

    const res = commitRotationAtomic(d, grid);
    if (!res.ok) {
      // revert geometry to snapshot
      if (prev) {
        d.row0 = prev.row0; d.col0 = prev.col0; d.row1 = prev.row1; d.col1 = prev.col1;
      }
      rotationState.inSession = false;
      rotationState.activeDominoId = null;
      rotationState.snapshot = null;
      rotationState.pivotHalf = null;
      document.dispatchEvent(new CustomEvent("pips:board-rotate-reject", { detail: { id: d.id, reason: res.reason, info: res } }));
      return { ok: false, reason: res.reason };
    }

    // success: record history and emit commit
    recordAction(history, { type: "rotate", id: d.id, prev, next });
    rotationState.inSession = false;
    rotationState.activeDominoId = null;
    rotationState.snapshot = null;
    rotationState.pivotHalf = null;
    document.dispatchEvent(new CustomEvent("pips:board-rotate-commit", { detail: { id: d.id, prev, next } }));
    if (typeof renderPuzzle === "function") renderPuzzle(); else document.dispatchEvent(new CustomEvent("pips:state-updated"));
    return { ok: true, prev, next };
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

    // Validate blocked/regions (only blocked here; region checks deferred if desired)
    const vr = validateBlockedAndRegions(false);
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
    if (d.row0 !== null && typeof d.row0 !== "undefined") {
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
  // session-aware rotate request: do geometry-only here; commit on session end
  // Event: 'pips:board-rotate-request' with detail { id, pivotHalf, prev }
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:board-rotate-request", (ev) => {
    const { id, pivotHalf, prev } = ev.detail || {};
    if (!id) {
      ev.target.dispatchEvent(new CustomEvent("pips:board-rotate-reject", { detail: { id, reason: "missing-id" } }));
      return;
    }
    const d = dominos instanceof Map ? dominos.get(id) : dominos.find(x => String(x.id) === String(id));
    if (!d) {
      ev.target.dispatchEvent(new CustomEvent("pips:board-rotate-reject", { detail: { id, reason: "unknown-domino" } }));
      return;
    }

    // If no session, start one and accept geometry-only rotation (UI already applied geometry)
    if (!rotationState.inSession) {
      startRotationSession(d, pivotHalf ?? 0);
      return;
    }

    // If session active for same domino, just rotate geometry (no commit)
    if (rotationState.activeDominoId === String(d.id)) {
      rotateSessionGeometry(pivotHalf ?? rotationState.pivotHalf ?? 0);
      return;
    }

    // If session active for different domino, end previous session then start new one
    endRotationSession("switch");
    startRotationSession(d, pivotHalf ?? 0);
  });

  // -------------------------
  // Session end triggers
  // End session on click elsewhere, drag-start, or pointerup
  // -------------------------
  appRoot.addEventListener("click", (ev) => {
    const clickedId = ev.detail && ev.detail.id;
    if (rotationState.inSession && String(clickedId) !== String(rotationState.activeDominoId)) endRotationSession("click");
  });

  appRoot.addEventListener("pips:drag-start", () => {
    if (rotationState.inSession) endRotationSession("dragstart");
  });

  appRoot.addEventListener("pointerup", () => {
    if (rotationState.inSession) endRotationSession("pointerup");
  });

  // ------------------------------------------------------------
  // Note: history applyForwardAction / applyInverseAction must update grid occupancy.
  // If you have those functions elsewhere, ensure rotate actions clear old occupancy,
  // update domino geometry, then write new occupancy (atomic pattern).
  // Example pattern (to place in your history module if needed):
  //
  // function applyForwardAction(action) {
  //   if (action.type === "rotate") {
  //     const id = String(action.id);
  //     const d = dominos instanceof Map ? dominos.get(id) : (dominos || []).find(x => String(x.id) === id);
  //     if (!d) return;
  //     // clear old occupancy
  //     for (let r=0;r<grid.length;r++) for (let c=0;c<grid[0].length;c++) {
  //       const cell = grid[r][c];
  //       if (cell && String(cell.dominoId) === id) grid[r][c] = null;
  //     }
  //     // apply geometry
  //     d.row0 = action.next.r0; d.col0 = action.next.c0; d.row1 = action.next.r1; d.col1 = action.next.c1;
  //     // write new occupancy
  //     grid[d.row0][d.col0] = { dominoId: d.id, half: 0 };
  //     grid[d.row1][d.col1] = { dominoId: d.id, half: 1 };
  //   }
  // }
  //
  // Mirror in applyInverseAction using action.prev
  // ------------------------------------------------------------
}
