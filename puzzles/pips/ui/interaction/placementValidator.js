
// ============================================================
// FILE: placementValidator.js
// PURPOSE: 
//   Contract-compliant bridge between UI events and the engine’s
//   single commit boundary.
// ============================================================

import { commitPlacement } from "../../engine/placement.js";
import { evaluateAllRegions } from "../../engine/regionRules.js";

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

// ============================================================
// installPlacementValidator(appRoot, puzzle)
// ============================================================
export function installPlacementValidator(appRoot, puzzle) {
  if (!appRoot || !puzzle) {
    throw new Error("installPlacementValidator: missing args");
  }

  // Hard requirement: engine authority must already be present
  if (!puzzle.startingDominoIds || !puzzle.startingDominoIds.has) {
    throw new Error(
      "placementValidator: puzzle.startingDominoIds missing — loader must supply authoritative state"
    );
  }

  const { regionMap, regions } = puzzle;

  // ------------------------------------------------------------
  // pips:drop:proposal → engine commitPlacement
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

    if (!result.accepted) {
      boardEl.dispatchEvent(
        new CustomEvent("pips:drop:reject:board", {
          bubbles: true,
          detail: {
            reason: result.reason,
            dominoId: proposal.dominoId,
            proposal,
            ...(result.info || {})
          }
        })
      );
    }

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
  // Rotation requests
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:board-rotate-request", (ev) => {
    const { id } = ev.detail || {};
    dispatchEvents(ev.target, ["pips:board-rotate-reject"], {
      id: id ?? null,
      reason: "rotation-must-submit-proposal"
    });
  });

  // ------------------------------------------------------------
  // Check solution (post‑commit only)
  // ------------------------------------------------------------
  function validateBlockedAndRegions() {
    const { grid, blocked } = puzzle;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (!grid[r][c]) continue;
        if (blocked && blocked.has(`${r},${c}`)) {
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

  console.log("installPlacementValidator: complete (contract‑clean)");
}
