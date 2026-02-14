// ============================================================
// FILE: placementValidator.js
// PURPOSE: Centralized placement/rotation validator and history wiring.
// NOTES:
//   - Uses explicit anchor placement (r0,c0,r1,c1).
//   - Validates blocked cells and region rules.
//   - Manages rotation sessions and emits normalized pips:* events.
//   - Listens to both old and new event names for backward compatibility.
// ============================================================

import {
  placeDominoAnchor,
  rotateDominoOnBoard,
  commitRotation as commitRotationFromPlacement,
  removeDominoToTray
} from "./placement.js";

import { evaluateAllRegions } from "./regionRules.js";
import { recordAction } from "./history.js";

// Helper to register the same handler for multiple event names.
function onEvents(target, names, handler) {
  names.forEach((name) => target.addEventListener(name, handler));
}

// Helper to dispatch the same detail under multiple event names.
function dispatchEvents(target, names, detail) {
  names.forEach((name) => {
    target.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true
      })
    );
  });
}

// ------------------------------------------------------------
// Rule parsing helpers
// ------------------------------------------------------------

/**
 * parseRuleString(ruleStr)
 * Parses a region rule string like "<= 3" or ">=2" or "5" into
 * a normalized object { op, value }. Returns null if invalid.
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
 * Walks the regions array and normalizes region.rule into
 * { op, value } objects where possible.
 */
function normalizeRegionRules(regions) {
  if (!Array.isArray(regions)) return;
  for (const region of regions) {
    if (!region.rule) continue;

    // Already normalized.
    if (
      typeof region.rule === "object" &&
      typeof region.rule.op === "string" &&
      typeof region.rule.value === "number"
    ) {
      continue;
    }

    // Plain number.
    if (typeof region.rule === "number" || /^\s*-?\d+\s*$/.test(String(region.rule))) {
      region.rule = { op: "=", value: Number(region.rule) };
      continue;
    }

    // String rule.
    if (typeof region.rule === "string") {
      const parsed = parseRuleString(region.rule);
      if (parsed) {
        region.rule = parsed;
      } else {
        console.error("normalizeRegionRules: could not parse rule string", region.rule);
      }
    }
  }
}

// ------------------------------------------------------------
// attachPlacementValidator
// ------------------------------------------------------------

/**
 * attachPlacementValidator(appRoot, puzzle)
 * Wires up all placement and rotation validation logic:
 *  - Listens for drop attempts (board + tray).
 *  - Validates blocked cells and region rules.
 *  - Manages rotation sessions and commits/rejects.
 *  - Records history actions.
 * Expects:
 *  - appRoot: DOM node where pips:* events are dispatched.
 *  - puzzle: { dominos, grid, regionMap, blocked, regions, history }.
 */
export function attachPlacementValidator(appRoot, puzzle) {
  if (!appRoot || !puzzle) {
    console.error("attachPlacementValidator: missing args", { appRoot: !!appRoot, puzzle: !!puzzle });
    throw new Error("attachPlacementValidator: missing args");
  }

  const { dominos, grid, regionMap, blocked, regions, history } = puzzle;

  normalizeRegionRules(regions);

  // ----------------------------------------------------------
  // Blocked + region validation
  // ----------------------------------------------------------

  /**
   * validateBlockedAndRegions(checkRegions = true)
   * Validates:
   *  - No occupied cell is blocked.
   *  - If checkRegions is true, all region rules are satisfied.
   * Returns { ok: true } or { ok: false, reason, ... }.
   */
  function validateBlockedAndRegions(checkRegions = true) {
    // Validate blocked cells.
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (!grid[r][c]) continue;
        if (blocked && blocked.has && blocked.has(`${r},${c}`)) {
          return { ok: false, reason: "blocked", cell: { r, c } };
        }
      }
    }

    if (!checkRegions) return { ok: true };

    // Validate region rules.
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

  // ----------------------------------------------------------
  // Rotation session state
  // ----------------------------------------------------------

  const rotationState = {
    inSession: false,
    activeDominoId: null,
    pivotHalf: null,
    startedAt: null,
    snapshot: null
  };

  /**
   * startRotationSession(domino, pivotHalf = 0)
   * Starts a rotation session for a given domino, capturing its
   * pre-session geometry as a snapshot.
   */
  function startRotationSession(domino, pivotHalf = 0) {
    if (!domino) {
      console.error("startRotationSession: missing domino");
      return false;
    }
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
    console.log("ROTVAL: session start", {
      id: rotationState.activeDominoId,
      pivotHalf,
      snapshot: rotationState.snapshot
    });
    return true;
  }

  /**
   * rotateSessionGeometry(pivotHalf)
   * Applies a geometry-only rotation to the active domino in the
   * current rotation session.
   */
  function rotateSessionGeometry(pivotHalf) {
    if (!rotationState.inSession) {
      console.error("rotateSessionGeometry: called with no active session");
      return false;
    }
    const id = rotationState.activeDominoId;
    const d =
      dominos instanceof Map
        ? dominos.get(id)
        : (dominos || []).find((x) => String(x.id) === id);

    if (!d) {
      console.error("rotateSessionGeometry: active domino not found", { id });
      return false;
    }

    rotateDominoOnBoard(d, pivotHalf);
    rotationState.pivotHalf = pivotHalf;

    console.log("ROTVAL: geometry rotate", {
      id,
      pivotHalf,
      new: {
        row0: d.row0,
        col0: d.col0,
        row1: d.row1,
        col1: d.col1
      }
    });

    return true;
  }

  /**
   * commitRotationAtomic(domino, gridRef)
   * Applies the rotated geometry to the grid in an atomic way:
   *  - Validates bounds, occupancy, and blocked cells.
   *  - Clears old cells and writes new ones if valid.
   * Returns { ok: true } or { ok: false, reason, ... }.
   */
  function commitRotationAtomic(domino, gridRef) {
    if (!domino) {
      console.error("commitRotationAtomic: missing domino");
      return { ok: false, reason: "invalid" };
    }
    const rows = gridRef.length;
    const cols = gridRef[0]?.length || 0;

    const targets = [
      { r: domino.row0, c: domino.col0, half: 0 },
      { r: domino.row1, c: domino.col1, half: 1 }
    ];

    // Validate coords.
    for (const t of targets) {
      if (typeof t.r !== "number" || typeof t.c !== "number") {
        console.error("commitRotationAtomic: non-numeric coords", t);
        return { ok: false, reason: "invalid-coords" };
      }
      if (t.r < 0 || t.r >= rows || t.c < 0 || t.c >= cols) {
        console.warn("commitRotationAtomic: out-of-bounds target", t);
        return { ok: false, reason: "out-of-bounds" };
      }
    }

    // Collect old cells.
    const oldCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const g = gridRef[r][c];
        if (g && String(g.dominoId) === String(domino.id)) {
          oldCells.push({ r, c, half: g.half });
        }
      }
    }

    // Occupancy + blocked.
    for (const t of targets) {
      const occ = gridRef[t.r][t.c];
      if (occ && String(occ.dominoId) !== String(domino.id)) {
        console.warn("commitRotationAtomic: target occupied by another domino", {
          target: t,
          occupant: occ.dominoId
        });
        return { ok: false, reason: "occupied", cell: { r: t.r, c: t.c, occupant: occ.dominoId } };
      }
      if (blocked && blocked.has && blocked.has(`${t.r},${t.c}`)) {
        console.warn("commitRotationAtomic: target is blocked", t);
        return { ok: false, reason: "blocked", cell: { r: t.r, c: t.c } };
      }
    }

    // Atomic swap.
    oldCells.forEach((oc) => {
      gridRef[oc.r][oc.c] = null;
    });
    targets.forEach((tc) => {
      gridRef[tc.r][tc.c] = { dominoId: domino.id, half: tc.half };
    });

    return { ok: true };
  }

  /**
   * endRotationSession(trigger)
   * Ends the current rotation session (if any), attempts to commit
   * the rotated geometry, and emits commit/reject events.
   */
  function endRotationSession(trigger) {
    if (!rotationState.inSession) {
      console.warn("endRotationSession: called with no active session", { trigger });
      return { ok: false, reason: "no-session" };
    }

    const id = rotationState.activeDominoId;
    const d =
      dominos instanceof Map
        ? dominos.get(id)
        : (dominos || []).find((x) => String(x.id) === id);

    if (!d) {
      console.error("endRotationSession: active domino not found", { id });
      rotationState.inSession = false;
      rotationState.activeDominoId = null;
      rotationState.snapshot = null;
      rotationState.pivotHalf = null;
      dispatchEvents(document, ["pips:rotate:reject:board", "pips:board-rotate-reject"], {
        id,
        reason: "missing-domino"
      });
      return { ok: false, reason: "missing-domino" };
    }

    const prev = rotationState.snapshot;
    const next = { r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 };

    const res = commitRotationAtomic(d, grid);
    if (!res.ok) {
      // Revert geometry.
      if (prev) {
        d.row0 = prev.row0;
        d.col0 = prev.col0;
        d.row1 = prev.row1;
        d.col1 = prev.col1;
      }

      rotationState.inSession = false;
      rotationState.activeDominoId = null;
      rotationState.snapshot = null;
      rotationState.pivotHalf = null;

      console.warn("endRotationSession: rotation rejected", { id: d.id, reason: res.reason });

      dispatchEvents(document, ["pips:rotate:reject:board", "pips:board-rotate-reject"], {
        id: d.id,
        reason: res.reason,
        info: res
      });

      return { ok: false, reason: res.reason };
    }

    // Success: record history and emit commit.
    recordAction(history, { type: "rotate", id: d.id, prev, next });

    rotationState.inSession = false;
    rotationState.activeDominoId = null;
    rotationState.snapshot = null;
    rotationState.pivotHalf = null;

    console.log("endRotationSession: rotation committed", { id: d.id, prev, next });

    dispatchEvents(document, ["pips:rotate:commit:board", "pips:board-rotate-commit"], {
      id: d.id,
      prev,
      next
    });
    dispatchEvents(document, ["pips:state:update", "pips:state-updated"], {});

    return { ok: true, prev, next };
  }

  // ----------------------------------------------------------
  // EXPLICIT-ANCHOR BOARD DROP
  // ----------------------------------------------------------

  /**
   * Board drop handler
   * Listens for attempts to place a domino on the board and
   * validates blocked cells (regions are checked separately).
   * Listens to both old and new event names:
   *  - pips:drop-attempt-board
   *  - pips:drop:attempt:board
   */
  function handleBoardDropAttempt(ev) {
    const { id, r0, c0, r1, c1 } = ev.detail || {};
    if (!id) {
      console.error("handleBoardDropAttempt: missing id in event detail", ev.detail);
      return;
    }

    const d =
      dominos instanceof Map
        ? dominos.get(id)
        : dominos.find((x) => String(x.id) === String(id));

    if (!d) {
      console.error("handleBoardDropAttempt: unknown domino", { id });
      dispatchEvents(ev.target, ["pips:drop:reject:board", "pips:drop-reject"], {
        id,
        reason: "unknown-domino"
      });
      return;
    }

    const placed = placeDominoAnchor(d, r0, c0, r1, c1, grid);
    if (!placed) {
      console.warn("handleBoardDropAttempt: no space for domino", { id, r0, c0, r1, c1 });
      dispatchEvents(ev.target, ["pips:drop:reject:board", "pips:drop-reject"], {
        id,
        reason: "no-space"
      });
      return;
    }

    // Blocked + region validation (blocked only here).
    const vr = validateBlockedAndRegions(false);
    if (!vr.ok) {
      console.warn("handleBoardDropAttempt: blocked validation failed; reverting", {
        id,
        reason: vr.reason,
        info: vr
      });
      removeDominoToTray(d, grid);
      dispatchEvents(ev.target, ["pips:drop:reject:board", "pips:drop-reject"], {
        id,
        reason: vr.reason,
        info: vr
      });
      return;
    }

    // Success.
    recordAction(history, {
      type: "place",
      id: d.id,
      r0: d.row0,
      c0: d.col0,
      r1: d.row1,
      c1: d.col1,
      prevTrayOrientation: d.trayOrientation
    });

    console.log("handleBoardDropAttempt: drop committed", {
      id: d.id,
      r0: d.row0,
      c0: d.col0,
      r1: d.row1,
      c1: d.col1
    });

    dispatchEvents(ev.target, ["pips:drop:commit:board", "pips:drop-commit"], {
      id: d.id,
      r0: d.row0,
      c0: d.col0,
      r1: d.row1,
      c1: d.col1
    });
  }

  onEvents(appRoot, ["pips:drop-attempt-board", "pips:drop:attempt:board"], handleBoardDropAttempt);

  // ----------------------------------------------------------
  // Tray drop
  // ----------------------------------------------------------

  /**
   * Tray drop handler
   * Handles returning a domino to the tray and recording history.
   * Listens to:
   *  - pips:drop-attempt-tray
   *  - pips:drop:attempt:tray
   */
  function handleTrayDropAttempt(ev) {
    const { id, slot } = ev.detail || {};
    if (!id) {
      console.error("handleTrayDropAttempt: missing id in event detail", ev.detail);
      return;
    }

    const d =
      dominos instanceof Map
        ? dominos.get(id)
        : dominos.find((x) => String(x.id) === String(id));
    if (!d) {
      console.error("handleTrayDropAttempt: unknown domino", { id });
      return;
    }

    if (d.row0 !== null && typeof d.row0 !== "undefined") {
      const prev = {
        r0: d.row0,
        c0: d.col0,
        r1: d.row1,
        c1: d.col1,
        pivotHalf: d.pivotHalf ?? 0
      };
      removeDominoToTray(d, grid);
      recordAction(history, { type: "return", id: d.id, prev });
    }

    d.trayOrientation = 0;

    console.log("handleTrayDropAttempt: domino returned to tray", { id: d.id, slot });

    dispatchEvents(ev.target, ["pips:drop:commit:tray", "pips:drop-commit-tray"], {
      id: d.id,
      slot
    });
  }

  onEvents(appRoot, ["pips:drop-attempt-tray", "pips:drop:attempt:tray"], handleTrayDropAttempt);

  // ----------------------------------------------------------
  // Invalid drop
  // ----------------------------------------------------------

  /**
   * Invalid drop handler
   * Handles drops that are considered invalid and returns the
   * domino to the tray.
   * Listens to:
   *  - pips:drop-invalid
   *  - pips:drop:reject:invalid
   */
  function handleInvalidDrop(ev) {
    const { id } = ev.detail || {};
    if (!id) {
      console.error("handleInvalidDrop: missing id in event detail", ev.detail);
      return;
    }

    const d =
      dominos instanceof Map
        ? dominos.get(id)
        : dominos.find((x) => String(x.id) === String(id));
    if (!d) {
      console.error("handleInvalidDrop: unknown domino", { id });
      return;
    }

    removeDominoToTray(d, grid);
    d.trayOrientation = 0;

    console.warn("handleInvalidDrop: drop rejected as invalid; domino returned to tray", { id });

    dispatchEvents(ev.target, ["pips:drop:reject:invalid", "pips:drop-invalid"], {
      id,
      reason: "invalid"
    });
  }

  onEvents(appRoot, ["pips:drop-invalid", "pips:drop:reject:invalid"], handleInvalidDrop);

  // ----------------------------------------------------------
  // Rotation session triggers
  // ----------------------------------------------------------

  /**
   * Rotation request handler
   * Handles board rotation requests from the UI.
   * Listens to:
   *  - pips:board-rotate-request
   *  - pips:rotate:request:board
   */
  function handleBoardRotateRequest(ev) {
    const { id, pivotHalf } = ev.detail || {};
    if (!id) {
      console.error("handleBoardRotateRequest: missing id in event detail", ev.detail);
      dispatchEvents(ev.target, ["pips:rotate:reject:board", "pips:board-rotate-reject"], {
        id,
        reason: "missing-id"
      });
      return;
    }

    const d =
      dominos instanceof Map
        ? dominos.get(id)
        : dominos.find((x) => String(x.id) === String(id));
    if (!d) {
      console.error("handleBoardRotateRequest: unknown domino", { id });
      dispatchEvents(ev.target, ["pips:rotate:reject:board", "pips:board-rotate-reject"], {
        id,
        reason: "unknown-domino"
      });
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

    // Switching from one rotating domino to another.
    endRotationSession("switch");
    startRotationSession(d, pivotHalf ?? 0);
  }

  onEvents(appRoot, ["pips:board-rotate-request", "pips:rotate:request:board"], handleBoardRotateRequest);

  /**
   * Click handler to end rotation session when clicking elsewhere.
   * Listens to:
   *  - click (generic DOM click with optional detail.id)
   */
  appRoot.addEventListener("click", (ev) => {
    const clickedId = ev.detail && ev.detail.id;
    if (
      rotationState.inSession &&
      String(clickedId) !== String(rotationState.activeDominoId)
    ) {
      console.log("Rotation: click outside active domino → end session");
      endRotationSession("click");
    }
  });

  /**
   * Drag-start handler to end rotation session when a drag begins.
   * Listens to:
   *  - pips:drag-start (unchanged name; drag system owns this)
   */
  appRoot.addEventListener("pips:drag-start", () => {
    if (rotationState.inSession) {
      console.log("Rotation: drag-start → end session");
      endRotationSession("dragstart");
    }
  });

  /**
   * Pointerup handler to end rotation session on release.
   * This is a safety net to avoid stuck sessions.
   */
  appRoot.addEventListener("pointerup", () => {
    if (rotationState.inSession) {
      console.log("Rotation: pointerup → end session");
      endRotationSession("pointerup");
    }
  });
}
