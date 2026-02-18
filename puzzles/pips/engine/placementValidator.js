// ============================================================
// FILE: placementValidator.js
// PURPOSE:
//   Contract-compliant bridge between UI events and the engine’s
//   single commit boundary.
//
// NEW MODEL (authoritative):
//   - UI computes final geometry and emits a PlacementProposal.
//   - Validator submits proposal to engine via commitPlacement().
//   - Engine accepts/rejects atomically with zero side effects on reject.
//   - Validator emits commit/reject events and pips:state:update.
//
// NOTE ABOUT THE OLD FILE (for context):
//   "This module is the sole authority for determining whether a domino
//   placement or rotation may be committed to the board."
//   That authority now lives in engine/placement.js via commitPlacement().
// ============================================================

import { commitPlacement } from "./placement.js";
import { evaluateAllRegions } from "./regionRules.js";

// ------------------------------------------------------------
// dispatchEvents(target, names, detail)
// ------------------------------------------------------------
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
// parseRuleString(ruleStr)
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
// ------------------------------------------------------------
function normalizeRegionRules(regions) {
  if (!Array.isArray(regions)) return;

  for (const region of regions) {
    if (!region.rule) continue;

    if (
      typeof region.rule === "object" &&
      typeof region.rule.op === "string" &&
      typeof region.rule.value === "number"
    ) {
      continue;
    }

    if (typeof region.rule === "number" || /^\s*-?\d+\s*$/.test(String(region.rule))) {
      region.rule = { op: "=", value: Number(region.rule) };
      continue;
    }

    if (typeof region.rule === "string") {
      const parsed = parseRuleString(region.rule);
      if (parsed) region.rule = parsed;
      else console.error("normalizeRegionRules: could not parse rule", region.rule);
    }
  }
}

// ------------------------------------------------------------
// resolveDomino(dominos, id)
// ------------------------------------------------------------
function resolveDomino(dominos, id) {
  const key = String(id);
  if (dominos instanceof Map) return dominos.get(key);
  return (dominos || []).find((d) => String(d.id) === key);
}

// ------------------------------------------------------------
// commitReturnToTray(puzzle, dominoId)
// PURPOSE:
//   Temporary compatibility helper for tray returns.
// CONTRACT NOTE:
//   In the finalized model, tray return should be an engine proposal
//   and committed by the engine. Until that exists, we do the minimal
//   deterministic state update here.
// ------------------------------------------------------------
function commitReturnToTray(puzzle, dominoId) {
  const { dominos, grid } = puzzle;
  const d = resolveDomino(dominos, dominoId);
  if (!d) return { ok: false, reason: "unknown-domino" };

  const idStr = String(d.id);

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const occ = grid[r][c];
      if (occ && String(occ.dominoId) === idStr) grid[r][c] = null;
    }
  }

  d.row0 = null;
  d.col0 = null;
  d.row1 = null;
  d.col1 = null;

  d.trayOrientation = 0;

  return { ok: true };
}

// ============================================================
// installPlacementValidator(appRoot, puzzle)
// ============================================================
export function installPlacementValidator(appRoot, puzzle) {
  if (!appRoot || !puzzle) {
    console.error("installPlacementValidator: missing args", {
      appRoot: !!appRoot,
      puzzle: !!puzzle
    });
    throw new Error("installPlacementValidator: missing args");
  }

  // Passive probe (kept)
  document.addEventListener("pips:drop", (ev) => {
    console.log("VALIDATOR PROBE: received raw pips:drop", ev.detail);
  });

  const { regionMap, regions } = puzzle;
  normalizeRegionRules(regions);

  // Ensure startingDominoIds exists (engine expects it).
  // If loader hasn’t been updated yet, we keep running but warn loudly.
  if (!puzzle.startingDominoIds || !puzzle.startingDominoIds.has) {
    console.warn(
      "placementValidator: puzzle.startingDominoIds missing; starting-domino immutability cannot be enforced until loader sets it."
    );
    puzzle.startingDominoIds = new Set();
  }

  // ------------------------------------------------------------
  // pips:drop:proposal → engine commitPlacement
  // EXPECTS:
  //   ev.detail.proposal = { id, row0, col0, row1, col1 }
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:drop:proposal", (ev) => {
    const { proposal } = ev.detail || {};
    if (!proposal) return;

    const { id, row0, col0, row1, col1 } = proposal;
    if (!id) return;

    const res = commitPlacement(puzzle, {
      dominoId: String(id),
      row0,
      col0,
      row1,
      col1
    });

    if (!res.accepted) {
      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id: String(id),
        reason: res.reason,
        info: res.info
      });
      return;
    }

    dispatchEvents(ev.target, ["pips:drop:commit:board"], {
      id: String(id),
      r0: row0,
      c0: col0,
      r1: row1,
      c1: col1
    });
    dispatchEvents(ev.target, ["pips:state:update"], {});
  });

  // ------------------------------------------------------------
  // pips:drop:tray → commit tray return (compat)
  // EXPECTS:
  //   ev.detail = { id }
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:drop:tray", (ev) => {
    const { id } = ev.detail || {};
    if (!id) return;

    const res = commitReturnToTray(puzzle, id);
    if (!res.ok) {
      dispatchEvents(ev.target, ["pips:drop:reject:tray"], {
        id: String(id),
        reason: res.reason
      });
      return;
    }

    dispatchEvents(ev.target, ["pips:drop:commit:tray"], {
      id: String(id),
      slot: null
    });
    dispatchEvents(ev.target, ["pips:state:update"], {});
  });

  // ------------------------------------------------------------
  // Rotation requests (new model)
  // PURPOSE:
  //   Rotation geometry must be computed by UI and submitted as a
  //   PlacementProposal via pips:drop:proposal.
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:board-rotate-request", (ev) => {
    const { id } = ev.detail || {};
    dispatchEvents(ev.target, ["pips:board-rotate-reject"], {
      id: id ?? null,
      reason: "rotation-must-submit-proposal"
    });
  });

  // ------------------------------------------------------------
  // Check solution (kept)
  // ------------------------------------------------------------
  function validateBlockedAndRegions() {
    const { grid, blocked } = puzzle;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (!grid[r][c]) continue;
        if (blocked && blocked.has && blocked.has(`${r},${c}`)) {
          return { ok: false, reason: "blocked", cell: { r, c } };
        }
      }
    }

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

  appRoot.addEventListener("pips:check-solution", () => {
    const res = validateBlockedAndRegions();
    dispatchEvents(appRoot, ["pips:solution-result"], res);
  });

  console.log("installPlacementValidator: complete (new model)");
}
