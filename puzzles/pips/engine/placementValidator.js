// engine/placementValidator.js
// Centralized placement/rotation validator and history wiring.
// This version is updated for explicit-anchor placement (r0,c0,r1,c1).
// No use of placeDomino() remains.

import {
  placeDominoAnchor,
  rotateDominoOnBoard,
  commitRotation as commitRotationFromPlacement,
  removeDominoToTray
} from "./placement.js";

import { evaluateAllRegions } from "./regionRules.js";
import { recordAction } from "./history.js";

/* ------------------------------------------------------------
 * Rule parsing helpers (unchanged)
 * ------------------------------------------------------------ */

function parseRuleString(ruleStr) {
  if (ruleStr == null) return null;
  const s = String(ruleStr).trim();
  const m = s.match(/^(\<=|\>=|!=|=|<|>){0,1}\s*(-?\d+)$/);
  if (!m) return null;
  const op = m[1] || "=";
  const value = Number(m[2]);
  return { op, value };
}

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
      if (parsed) region.rule = parsed;
    }
  }
}

/* ------------------------------------------------------------
 * attachPlacementValidator
 * ------------------------------------------------------------ */

export function attachPlacementValidator(appRoot, puzzle) {
  if (!appRoot || !puzzle) throw new Error("attachPlacementValidator: missing args");

  const { dominos, grid, regionMap, blocked, regions, history } = puzzle;

  normalizeRegionRules(regions);

  /* ------------------------------------------------------------
   * Blocked + region validation
   * ------------------------------------------------------------ */
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
      if (!rr.satisfied) {
        return {
          ok: false,
          reason: "region",
          regionId: rr.id,
          currentValue: rr.currentValue,
          rule: rr.rule
        };
      }
    }

    return { ok: true };
  }

  /* ------------------------------------------------------------
   * Rotation session state (unchanged)
   * ------------------------------------------------------------ */

  const rotationState = {
    inSession: false,
    activeDominoId: null,
    pivotHalf: null,
    startedAt: null,
    snapshot: null
  };

  function startRotationSession(domino, pivotHalf = 0) {
    if (!domino) return false;
    rotationState.inSession = true;
    rotationState.activeDominoId = String(domino.id);
    rotationState.pivotHalf = pivotHalf;
    rotationState.startedAt = Date.now();
    rotationState.snapshot = {
      row0: domino.row0,
      col0: domino.col0,
      row1: domino.row1,
      col1: domino.col1
    };
    return true;
  }

  function rotateSessionGeometry(pivotHalf) {
    if (!rotationState.inSession) return false;
    const id = rotationState.activeDominoId;
    const d = dominos instanceof Map
      ? dominos.get(id)
      : (dominos || []).find(x => String(x.id) === id);
    if (!d) return false;

    rotateDominoOnBoard(d, pivotHalf);
    rotationState.pivotHalf = pivotHalf;
    return true;
  }

  function commitRotationAtomic(domino, gridRef) {
    if (!domino) return { ok: false, reason: "invalid" };
    const rows = gridRef.length;
    const cols = gridRef[0]?.length || 0;

    const targets = [
      { r: domino.row0, c: domino.col0, half: 0 },
      { r: domino.row1, c: domino.col1, half: 1 }
    ];

    // validate coords
    for (const t of targets) {
      if (typeof t.r !== "number" || typeof t.c !== "number") {
        return { ok: false, reason: "invalid-coords" };
      }
      if (t.r < 0 || t.r >= rows || t.c < 0 || t.c >= cols) {
        return { ok: false, reason: "out-of-bounds" };
      }
    }

    // collect old cells
    const oldCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const g = gridRef[r][c];
        if (g && String(g.dominoId) === String(domino.id)) {
          oldCells.push({ r, c, half: g.half });
        }
      }
    }

    // occupancy + blocked
    for (const t of targets) {
      const occ = gridRef[t.r][t.c];
      if (occ && String(occ.dominoId) !== String(domino.id)) {
        return { ok: false, reason: "occupied", cell: { r: t.r, c: t.c, occupant: occ.dominoId } };
      }
      if (blocked && blocked.has(`${t.r},${t.c}`)) {
        return { ok: false, reason: "blocked", cell: { r: t.r, c: t.c } };
      }
    }

    // atomic swap
    oldCells.forEach(oc => { gridRef[oc.r][oc.c] = null; });
    targets.forEach(tc => { gridRef[tc.r][tc.c] = { dominoId: domino.id, half: tc.half }; });

    return { ok: true };
  }

  function endRotationSession(trigger) {
    if (!rotationState.inSession) return { ok: false, reason: "no-session" };

    const id = rotationState.activeDominoId;
    const d = dominos instanceof Map
      ? dominos.get(id)
      : (dominos || []).find(x => String(x.id) === id);

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
      // revert
      if (prev) {
        d.row0 = prev.row0; d.col0 = prev.col0;
        d.row1 = prev.row1; d.col1 = prev.col1;
      }
      rotationState.inSession = false;
      rotationState.activeDominoId = null;
      rotationState.snapshot = null;
      rotationState.pivotHalf = null;

      document.dispatchEvent(new CustomEvent("pips:board-rotate-reject", {
        detail: { id: d.id, reason: res.reason, info: res }
      }));
      return { ok: false, reason: res.reason };
    }

    // success
    recordAction(history, { type: "rotate", id: d.id, prev, next });

    rotationState.inSession = false;
    rotationState.activeDominoId = null;
    rotationState.snapshot = null;
    rotationState.pivotHalf = null;

    document.dispatchEvent(new CustomEvent("pips:board-rotate-commit", {
      detail: { id: d.id, prev, next }
    }));
    document.dispatchEvent(new CustomEvent("pips:state-updated"));

    return { ok: true, prev, next };
  }

  /* ------------------------------------------------------------
   * EXPLICIT-ANCHOR BOARD DROP (NEW)
   * ------------------------------------------------------------ */

  appRoot.addEventListener("pips:drop-attempt-board", (ev) => {
    const { id, r0, c0, r1, c1 } = ev.detail || {};
    if (!id) return;

    const d = dominos instanceof Map
      ? dominos.get(id)
      : dominos.find(x => String(x.id) === String(id));

    if (!d) {
      ev.target.dispatchEvent(new CustomEvent("pips:drop-reject", {
        detail: { id, reason: "unknown-domino" }
      }));
      return;
    }

    // Explicit placement
    const placed = placeDominoAnchor(d, r0, c0, r1, c1, grid);
    if (!placed) {
      ev.target.dispatchEvent(new CustomEvent("pips:drop-reject", {
        detail: { id, reason: "no-space" }
      }));
      return;
    }

    // Blocked + region validation (blocked only here)
    const vr = validateBlockedAndRegions(false);
    if (!vr.ok) {
      removeDominoToTray(d, grid);
      ev.target.dispatchEvent(new CustomEvent("pips:drop-reject", {
        detail: { id, reason: vr.reason, info: vr }
      }));
      return;
    }

    // Success
    recordAction(history, {
      type: "place",
      id: d.id,
      r0: d.row0,
      c0: d.col0,
      r1: d.row1,
      c1: d.col1,
      prevTrayOrientation: d.trayOrientation
    });

    ev.target.dispatchEvent(new CustomEvent("pips:drop-commit", {
      detail: { id: d.id, r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 }
    }));
  });

  /* ------------------------------------------------------------
   * Tray drop (unchanged)
   * ------------------------------------------------------------ */

  appRoot.addEventListener("pips:drop-attempt-tray", (ev) => {
    const { id, slot } = ev.detail || {};
    if (!id) return;

    const d = dominos instanceof Map
      ? dominos.get(id)
      : dominos.find(x => String(x.id) === String(id));
    if (!d) return;

    if (d.row0 !== null && typeof d.row0 !== "undefined") {
      const prev = {
        r0: d.row0, c0: d.col0,
        r1: d.row1, c1: d.col1,
        pivotHalf: d.pivotHalf ?? 0
      };
      removeDominoToTray(d, grid);
      recordAction(history, { type: "return", id: d.id, prev });
    }

    d.trayOrientation = 0;

    ev.target.dispatchEvent(new CustomEvent("pips:drop-commit-tray", {
      detail: { id: d.id, slot }
    }));
  });

  /* ------------------------------------------------------------
   * Invalid drop (unchanged)
   * ------------------------------------------------------------ */

  appRoot.addEventListener("pips:drop-invalid", (ev) => {
    const { id } = ev.detail || {};
    if (!id) return;

    const d = dominos instanceof Map
      ? dominos.get(id)
      : dominos.find(x => String(x.id) === String(id));
    if (!d) return;

    removeDominoToTray(d, grid);
    d.trayOrientation = 0;

    ev.target.dispatchEvent(new CustomEvent("pips:drop-reject", {
      detail: { id, reason: "invalid" }
    }));
  });

  /* ------------------------------------------------------------
   * Rotation session triggers (unchanged)
   * ------------------------------------------------------------ */

  appRoot.addEventListener("pips:board-rotate-request", (ev) => {
    const { id, pivotHalf } = ev.detail || {};
    if (!id) {
      ev.target.dispatchEvent(new CustomEvent("pips:board-rotate-reject", {
        detail: { id, reason: "missing-id" }
      }));
      return;
    }

    const d = dominos instanceof Map
      ? dominos.get(id)
      : dominos.find(x => String(x.id) === String(id));
    if (!d) {
      ev.target.dispatchEvent(new CustomEvent("pips:board-rotate-reject", {
        detail: { id, reason: "unknown-domino" }
      }));
      return;
    }

    if (!rotationState.inSession) {
      startRotationSession(d, pivotHalf ?? 0);
      return;
    }

    if (rotationState.activeDominoId === String(d.id)) {
      rotateSessionGeometry(pivotHalf ?? rotationState.pivotHalf ?? 0);
      return;
    }

    endRotationSession("switch");
    startRotationSession(d, pivotHalf ?? 0);
  });

  appRoot.addEventListener("click", (ev) => {
    const clickedId = ev.detail && ev.detail.id;
    if (rotationState.inSession &&
        String(clickedId) !== String(rotationState.activeDominoId)) {
      endRotationSession("click");
    }
  });

  appRoot.addEventListener("pips:drag-start", () => {
    if (rotationState.inSession) endRotationSession("dragstart");
  });

  appRoot.addEventListener("pointerup", () => {
    if (rotationState.inSession) endRotationSession("pointerup");
  });
}
