// ============================================================
// FILE: placementValidator.js
// PURPOSE:
//   Central place for placement and rotation validation logic.
//   Listens for drop attempts and rotation requests, validates
//   geometry and blocked cells, manages rotation sessions, and
//   emits canonical pips:* events. Region rules are evaluated
//   only when the user explicitly requests a solution check.
// NOTES:
//   - Uses only // style comments.
//   - Every function has a short conversational header explaining
//     what it does and how it's used.
//   - Includes a diagnostic probe for raw pips:drop events.
// ============================================================

import {
  placeDominoAnchor,
  rotateDominoOnBoard,
  removeDominoToTray
} from "./placement.js";

import { evaluateAllRegions } from "./regionRules.js";

// ------------------------------------------------------------
// dispatchEvents(target, names, detail)
// PURPOSE:
//   Emit the same detail under multiple event names. Use this
//   when the same outcome should be announced with several
//   canonical event names. Keeps callers simple.
// USAGE:
//   dispatchEvents(document, ['pips:state:update'], {});
// ------------------------------------------------------------
function dispatchEvents(target, names, detail) {
  names.forEach(name => {
    target.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true
      })
    );
  });
}

// ------------------------------------------------------------
// parseRuleString(ruleStr)
// PURPOSE:
//   Parse a human-friendly region rule string like "<= 3" or "5"
//   into a normalized object { op, value }. Returns null if the
//   string can't be parsed.
// USAGE:
//   const parsed = parseRuleString(">=2"); // { op: '>=', value: 2 }
// ------------------------------------------------------------
function parseRuleString(ruleStr) {
  if (ruleStr == null) return null;
  const s = String(ruleStr).trim();
  const m = s.match(/^(\<=|\>=|!=|=|<|>){0,1}\s*(-?\d+)$/);
  if (!m) return null;
  return { op: m[1] || "=", value: Number(m[2]) };
}

// ------------------------------------------------------------
// normalizeRegionRules(regions)
// PURPOSE:
//   Walk the puzzle regions and ensure each region.rule is a
//   normalized object { op, value }. This makes later checks
//   simpler and deterministic.
// USAGE:
//   normalizeRegionRules(puzzle.regions);
// ------------------------------------------------------------
function normalizeRegionRules(regions) {
  if (!Array.isArray(regions)) return;

  for (const region of regions) {
    if (!region.rule) continue;

    // Already normalized.
    if (typeof region.rule === "object" &&
        typeof region.rule.op === "string" &&
        typeof region.rule.value === "number") {
      continue;
    }

    // Plain number becomes equality.
    if (typeof region.rule === "number" ||
        /^\s*-?\d+\s*$/.test(String(region.rule))) {
      region.rule = { op: "=", value: Number(region.rule) };
      continue;
    }

    // Try parsing a string rule.
    if (typeof region.rule === "string") {
      const parsed = parseRuleString(region.rule);
      if (parsed) region.rule = parsed;
      else console.error("normalizeRegionRules: could not parse rule", region.rule);
    }
  }
}

// ============================================================
// installPlacementValidator(appRoot, puzzle)
// PURPOSE:
//   Main installer. Wire this into your app root with the puzzle
//   model. It sets up listeners for drop attempts, tray returns,
//   rotation requests, and the "check solution" action.
// USAGE:
//   installPlacementValidator(document, puzzle);
// ============================================================
export function installPlacementValidator(appRoot, puzzle) {
  if (!appRoot || !puzzle) {
    console.error("installPlacementValidator: missing args", {
      appRoot: !!appRoot,
      puzzle: !!puzzle
    });
    throw new Error("installPlacementValidator: missing args");
  }

  // ------------------------------------------------------------
  // DIAGNOSTIC PROBE — raw pips:drop
  // PURPOSE:
  //   Log the raw pips:drop event so we can confirm dragDrop is
  //   dispatching it and the validator can see it. This probe is
  //   passive and does not change behavior.
  // USAGE:
  //   Watch console for "VALIDATOR PROBE: received raw pips:drop".
  // ------------------------------------------------------------
  document.addEventListener("pips:drop", ev => {
    console.log("VALIDATOR PROBE: received raw pips:drop", ev.detail);
  });

  const { dominos, grid, regionMap, blocked, regions } = puzzle;
  normalizeRegionRules(regions);

  // ------------------------------------------------------------
  // PlacementProposal adapter
  // PURPOSE:
  //   Bridge intent-based drag/drop proposals into the existing
  //   pips:drop:attempt:* validation pipeline without changing
  //   any downstream logic.
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:drop:proposal", ev => {
    const { proposal } = ev.detail || {};
    if (!proposal) return;

    const { id, row0, col0, row1, col1 } = proposal;

    dispatchEvents(appRoot, ["pips:drop:attempt:board"], {
      id,
      r0: row0,
      c0: col0,
      r1: row1,
      c1: col1
    });
  });

  // ------------------------------------------------------------
  // Tray return adapter
  // PURPOSE:
  //   Handle drag-invalid drops that must return to tray.
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:drop:tray", ev => {
    const { id } = ev.detail || {};
    if (!id) return;

    dispatchEvents(appRoot, ["pips:drop:attempt:tray"], {
      id,
      slot: null
    });
  });

  // ------------------------------------------------------------
  // validateBlockedOnly()
  // PURPOSE:
  //   Check that no occupied grid cell is marked blocked. This is
  //   the minimal validation used during placement and rotation.
  // RETURNS:
  //   { ok: true } or { ok: false, reason, cell }
  // USAGE:
  //   const res = validateBlockedOnly(); if (!res.ok) ...
  // ------------------------------------------------------------
  function validateBlockedOnly() {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (!grid[r][c]) continue;
        if (blocked && blocked.has && blocked.has(`${r},${c}`)) {
          return { ok: false, reason: "blocked", cell: { r, c } };
        }
      }
    }
    return { ok: true };
  }

  // ------------------------------------------------------------
  // validateBlockedAndRegions()
  // PURPOSE:
  //   Full validation used for "Check Solution". Validates blocked
  //   cells and then evaluates region rules. Returns a result
  //   object describing success or the failing reason.
  // USAGE:
  //   const res = validateBlockedAndRegions();
  // ------------------------------------------------------------
  function validateBlockedAndRegions() {
    const blockedRes = validateBlockedOnly();
    if (!blockedRes.ok) return blockedRes;

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

  // ------------------------------------------------------------
  // Rotation session state
  // PURPOSE:
  //   Keep track of an in-progress rotation session so we can
  //   apply geometry-only rotations and commit or revert atomically.
  // ------------------------------------------------------------
  const rotationState = {
    inSession: false,
    activeDominoId: null,
    pivotHalf: null,
    startedAt: null,
    snapshot: null
  };

  // ------------------------------------------------------------
  // startRotationSession(domino, pivotHalf = 0)
  // PURPOSE:
  //   Begin a rotation session for a domino. Capture its current
  //   geometry so we can revert if the rotation is rejected.
  // RETURNS:
  //   true on success, false on error.
  // USAGE:
  //   startRotationSession(domino, 0);
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // rotateSessionGeometry(pivotHalf)
  // PURPOSE:
  //   Apply a geometry-only rotation to the active domino during a
  //   rotation session. This mutates the domino object but does not
  //   commit to the grid until endRotationSession is called.
  // RETURNS:
  //   true on success, false on error.
  // ------------------------------------------------------------
  function rotateSessionGeometry(pivotHalf) {
    if (!rotationState.inSession) {
      console.error("rotateSessionGeometry: no active session");
      return false;
    }

    const id = rotationState.activeDominoId;
    const d =
      dominos instanceof Map
        ? dominos.get(id)
        : (dominos || []).find(x => String(x.id) === id);

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

  // ------------------------------------------------------------
  // commitRotationAtomic(domino, gridRef)
  // PURPOSE:
  //   Attempt to atomically commit rotated geometry to the grid.
  //   Validates bounds, occupancy, and blocked cells. If valid,
  //   it clears old cells and writes new ones.
  // RETURNS:
  //   { ok: true } or { ok: false, reason, ... }
  // ------------------------------------------------------------
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

    for (const t of targets) {
      if (t.r < 0 || t.r >= rows || t.c < 0 || t.c >= cols) {
        console.warn("commitRotationAtomic: out-of-bounds", t);
        return { ok: false, reason: "out-of-bounds" };
      }
    }

    const oldCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const g = gridRef[r][c];
        if (g && String(g.dominoId) === String(domino.id)) {
          oldCells.push({ r, c, half: g.half });
        }
      }
    }

    for (const t of targets) {
      const occ = gridRef[t.r][t.c];
      if (occ && String(occ.dominoId) !== String(domino.id)) {
        return {
          ok: false,
          reason: "occupied",
          cell: { r: t.r, c: t.c, occupant: occ.dominoId }
        };
      }
      if (blocked && blocked.has && blocked.has(`${t.r},${t.c}`)) {
        return { ok: false, reason: "blocked", cell: { r: t.r, c: t.c } };
      }
    }

    oldCells.forEach(oc => (gridRef[oc.r][oc.c] = null));
    targets.forEach(tc => {
      gridRef[tc.r][tc.c] = { dominoId: domino.id, half: tc.half };
    });

    return { ok: true };
  }

  // ------------------------------------------------------------
  // endRotationSession(trigger)
  // PURPOSE:
  //   End the current rotation session, attempt to commit the
  //   rotated geometry, and emit commit or reject events. Revert
  //   geometry on failure.
  // RETURNS:
  //   { ok: true, prev, next } or { ok: false, reason }
  // ------------------------------------------------------------
  function endRotationSession(trigger) {
    // ------------------------------------------------------------
    // Rotation commit validation
    // PURPOSE:
    //   Enforce placement invariants when a rotation session ends
    //   without transitioning into drag.
    // ------------------------------------------------------------
    if (trigger !== "dragstart") {
      const { r0, c0, r1, c1 } = rotationState.domino;
    
      const coords = [r0, c0, r1, c1];
    
      // Must all be finite integers
      if (!coords.every(n => Number.isInteger(n))) {
        revertRotationSession();
        dispatchEvents(appRoot, ["pips:rotate:reject"], {
          id: rotationState.activeDominoId,
          reason: "invalid-coordinates"
        });
        return;
      }
    
      // Must occupy two distinct cells
      if (r0 === r1 && c0 === c1) {
        revertRotationSession();
        dispatchEvents(appRoot, ["pips:rotate:reject"], {
          id: rotationState.activeDominoId,
          reason: "identical-cells"
        });
        return;
      }
    
      // Must be orthogonally adjacent
      const dr = Math.abs(r0 - r1);
      const dc = Math.abs(c0 - c1);
      if (dr + dc !== 1) {
        revertRotationSession();
        dispatchEvents(appRoot, ["pips:rotate:reject"], {
          id: rotationState.activeDominoId,
          reason: "non-adjacent"
        });
        return;
      }
    
      // Bounds validation
      const rows = grid.length;
      const cols = grid[0]?.length ?? 0;
    
      const inBounds =
        r0 >= 0 && r0 < rows &&
        c0 >= 0 && c0 < cols &&
        r1 >= 0 && r1 < rows &&
        c1 >= 0 && c1 < cols;
    
      if (!inBounds) {
        revertRotationSession();
        dispatchEvents(appRoot, ["pips:rotate:reject"], {
          id: rotationState.activeDominoId,
          reason: "out-of-bounds"
        });
        return;
      }
    }


















    
    if (!rotationState.inSession) {
      console.warn("endRotationSession: no active session", { trigger });
      return { ok: false, reason: "no-session" };
    }

    const id = rotationState.activeDominoId;
    const d =
      dominos instanceof Map
        ? dominos.get(id)
        : (dominos || []).find(x => String(x.id) === id);

    if (!d) {
      console.error("endRotationSession: active domino not found", { id });
      rotationState.inSession = false;
      rotationState.activeDominoId = null;
      rotationState.snapshot = null;
      rotationState.pivotHalf = null;

      dispatchEvents(document, ["pips:board-rotate-reject"], {
        id,
        reason: "missing-domino"
      });

      return { ok: false, reason: "missing-domino" };
    }

    const prev = rotationState.snapshot;
    const next = { r0: d.row0, c0: d.col0, r1: d.row1, c1: d.col1 };

    const res = commitRotationAtomic(d, grid);
    if (!res.ok) {
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

      dispatchEvents(document, ["pips:board-rotate-reject"], {
        id: d.id,
        reason: res.reason,
        info: res
      });

      return { ok: false, reason: res.reason };
    }

    rotationState.inSession = false;
    rotationState.activeDominoId = null;
    rotationState.snapshot = null;
    rotationState.pivotHalf = null;

    dispatchEvents(document, ["pips:board-rotate-commit"], {
      id: d.id,
      prev,
      next
    });
    dispatchEvents(document, ["pips:state:update"], {});

    return { ok: true, prev, next };
  }

  // ------------------------------------------------------------
  // handleBoardDropAttempt(ev)
  // PURPOSE:
  //   Validate and commit an explicit anchor placement on the
  //   board. This listens for pips:drop:attempt:board events and
  //   emits commit or reject events accordingly.
  // EXPECTS:
  //   ev.detail = { id, r0, c0, r1, c1 }
  // ------------------------------------------------------------
  function handleBoardDropAttempt(ev) {
    const { id, r0, c0, r1, c1 } = ev.detail || {};

    // ------------------------------------------------------------
    // PlacementProposal validation (shape + adjacency)
    // PURPOSE:
    //   Enforce spec-level invariants before attempting placement.
    // ------------------------------------------------------------
    const coords = [r0, c0, r1, c1];
    
    // Must all be finite integers
    if (!coords.every(n => Number.isInteger(n))) {
      console.warn("PLACEMENT REJECTED: non-integer coordinates", {
        id, r0, c0, r1, c1
      });
    
      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id,
        reason: "invalid-coordinates",
        detail: { r0, c0, r1, c1 }
      });
      return;
    }
    
    // Must occupy two distinct cells
    if (r0 === r1 && c0 === c1) {
      console.warn("PLACEMENT REJECTED: identical cells", {
        id, r0, c0
      });
    
      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id,
        reason: "identical-cells"
      });
      return;
    }
    
    // Must be orthogonally adjacent
    const dr = Math.abs(r0 - r1);
    const dc = Math.abs(c0 - c1);
    if (dr + dc !== 1) {
      console.warn("PLACEMENT REJECTED: non-adjacent cells", {
        id, r0, c0, r1, c1
      });
    
      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id,
        reason: "non-adjacent"
      });
      return;
    }

    // ------------------------------------------------------------
    // Bounds validation
    // PURPOSE:
    //   Ensure both halves land on real board cells before placement.
    // ------------------------------------------------------------
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    
    const inBounds =
      r0 >= 0 && r0 < rows &&
      c0 >= 0 && c0 < cols &&
      r1 >= 0 && r1 < rows &&
      c1 >= 0 && c1 < cols;
    
    if (!inBounds) {
      console.warn("PLACEMENT REJECTED: out-of-bounds", {
        id, r0, c0, r1, c1, rows, cols
      });
    
      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id,
        reason: "out-of-bounds",
        detail: { r0, c0, r1, c1 }
      });
      return;
    }








    

    
    
    if (!id) {
      console.error("handleBoardDropAttempt: missing id", ev.detail);
      return;
    }

    const d =
      dominos instanceof Map
        ? dominos.get(String(id))
        : dominos.find(x => String(x.id) === String(id));

    if (!d) {
      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id,
        reason: "unknown-domino"
      });
      return;
    }

    const placed = placeDominoAnchor(d, r0, c0, r1, c1, grid);
    if (!placed) {
      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id,
        reason: "no-space"
      });
      return;
    }

    const vr = validateBlockedOnly();
    if (!vr.ok) {
      removeDominoToTray(d, grid);
      d.trayOrientation = 0;

      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id,
        reason: vr.reason,
        info: vr
      });

      return;
    }

    dispatchEvents(ev.target, ["pips:drop:commit:board"], {
      id: d.id,
      r0: d.row0,
      c0: d.col0,
      r1: d.row1,
      c1: d.col1
    });
    dispatchEvents(ev.target, ["pips:state:update"], {});
  }

  appRoot.addEventListener("pips:drop:attempt:board", handleBoardDropAttempt);

  // ------------------------------------------------------------
  // handleTrayDropAttempt(ev)
  // PURPOSE:
  //   Handle returning a domino to the tray. Removes it from the
  //   board if present and emits commit events.
  // EXPECTS:
  //   ev.detail = { id, slot }
  // ------------------------------------------------------------
  function handleTrayDropAttempt(ev) {
    const { id, slot } = ev.detail || {};
    if (!id) {
      console.error("handleTrayDropAttempt: missing id", ev.detail);
      return;
    }

    const d =
      dominos instanceof Map
        ? dominos.get(String(id))
        : dominos.find(x => String(x.id) === String(id));

    if (!d) {
      console.error("handleTrayDropAttempt: unknown domino", { id });
      return;
    }

    if (d.row0 !== null && typeof d.row0 !== "undefined") {
      removeDominoToTray(d, grid);
    }

    d.trayOrientation = 0;

    dispatchEvents(ev.target, ["pips:drop:commit:tray"], {
      id: d.id,
      slot
    });
    dispatchEvents(ev.target, ["pips:state:update"], {});
  }

  appRoot.addEventListener("pips:drop:attempt:tray", handleTrayDropAttempt);

  // ------------------------------------------------------------
  // handleInvalidDrop(ev)
  // PURPOSE:
  //   Generic handler for invalid drops. Returns the domino to
  //   the tray and emits a reject event so UI can animate the
  //   return if desired.
  // EXPECTS:
  //   ev.detail = { id }
  // ------------------------------------------------------------
  function handleInvalidDrop(ev) {
    const { id } = ev.detail || {};
    if (!id) {
      console.error("handleInvalidDrop: missing id", ev.detail);
      return;
    }

    const d =
      dominos instanceof Map
        ? dominos.get(String(id))
        : dominos.find(x => String(x.id) === String(id));

    if (!d) {
      console.error("handleInvalidDrop: unknown domino", { id });
      return;
    }

    removeDominoToTray(d, grid);
    d.trayOrientation = 0;

    dispatchEvents(ev.target, ["pips:drop:reject:tray"], {
      id,
      reason: "invalid"
    });
    dispatchEvents(ev.target, ["pips:state:update"], {});
  }

  appRoot.addEventListener("pips:drop:reject:invalid", handleInvalidDrop);

  // ------------------------------------------------------------
  // handleBoardRotateRequest(ev)
  // PURPOSE:
  //   Entry point for UI rotation requests. Starts or continues a
  //   rotation session, or switches active domino. Emits reject
  //   events for missing or unknown dominos.
  // EXPECTS:
  //   ev.detail = { id, pivotHalf }
  // ------------------------------------------------------------
  function handleBoardRotateRequest(ev) {
    const { id, pivotHalf } = ev.detail || {};
    if (!id) {
      dispatchEvents(ev.target, ["pips:board-rotate-reject"], {
        id,
        reason: "missing-id"
      });
      return;
    }

    const d =
      dominos instanceof Map
        ? dominos.get(String(id))
        : dominos.find(x => String(x.id) === String(id));

    if (!d) {
      dispatchEvents(ev.target, ["pips:board-rotate-reject"], {
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

    endRotationSession("switch");
    startRotationSession(d, pivotHalf ?? 0);
  }

  appRoot.addEventListener("pips:board-rotate-request", handleBoardRotateRequest);

  // ------------------------------------------------------------
  // Rotation session cleanup triggers
  // PURPOSE:
  //   End rotation sessions when the user clicks elsewhere,
  //   starts a drag, or releases the pointer. These are safety
  //   nets to avoid stuck rotation state.
  // ------------------------------------------------------------
  appRoot.addEventListener("click", ev => {
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

  // ------------------------------------------------------------
  // handleCheckSolution()
  // PURPOSE:
  //   Evaluate blocked cells and region rules and emit a single
  //   pips:solution-result event describing success or failure.
  // ------------------------------------------------------------
  function handleCheckSolution() {
    const res = validateBlockedAndRegions();
    dispatchEvents(appRoot, ["pips:solution-result"], res);
  }

  appRoot.addEventListener("pips:check-solution", handleCheckSolution);

  console.log("installPlacementValidator: complete");
}
