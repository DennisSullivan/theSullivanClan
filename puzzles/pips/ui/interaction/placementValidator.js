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

    // (Removed legacy result/boardEl block)

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
  // pips:return-to-tray → engine remove placement
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:return-to-tray", (ev) => {
    const { id } = ev.detail || {};
    if (!id) return;

    console.log("tray listener received return-to-tray", ev.detail);
 
    // Remove domino from board (engine authority)
    const res = commitPlacement(puzzle, {
      dominoId: String(id),
      row0: null,
      col0: null,
      row1: null,
      col1: null
    });
console.log("engine remove result", res);
  
    if (!res.accepted) {
      dispatchEvents(ev.target, ["pips:return-to-tray:reject"], {
        id: String(id),
        reason: res.reason,
        info: res.info
      });
      return;
    }
  
    dispatchEvents(ev.target, ["pips:return-to-tray:commit"], {
      id: String(id)
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

boardEl.addEventListener("pips:rotate:proposal", (event) => {
  const ghost = event.detail.proposal;

  const proposal = {
    dominoId: String(ghost.id),
    row0: ghost.row0,
    col0: ghost.col0,
    row1: ghost.row1,
    col1: ghost.col1
  };

  const result = commitPlacement(state, proposal);

  if (!result.accepted) {
    // Rotation cancel — engine rejected the geometry
    renderPuzzle(); // re-render from authoritative engine state
    return;
  }

  // Rotation commit — engine accepted the geometry
  renderPuzzle();
});
