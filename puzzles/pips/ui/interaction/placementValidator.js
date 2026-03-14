// ============================================================
// FILE: placementValidator.js
// PURPOSE:
//   Contract-compliant bridge between UI events and the engine’s
//   single commit boundary (cells-based).
// ============================================================

import { commitPlacement, validatePlacementProposal } from "../../engine/placement.js";
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

    const { id, cells } = proposal;
    if (!id) return;

    const res = commitPlacement(puzzle, {
      dominoId: String(id),
      cells
    });

    if (!res.accepted) {
      dispatchEvents(ev.target, ["pips:drop:reject:board"], {
        id: String(id),
        reason: res.reason,
        info: res.info
      });
      return;
    }

    // Derive row/col for renderer convenience only
    const payload =
      cells === null
        ? { id: String(id) }
        : {
            id: String(id),
            r0: cells[0].row,
            c0: cells[0].col,
            r1: cells[1].row,
            c1: cells[1].col
          };

    dispatchEvents(ev.target, ["pips:drop:commit:board"], payload);
    dispatchEvents(ev.target, ["pips:state:update"], {});
  });

  // ------------------------------------------------------------
  // pips:return-to-tray → engine removal
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:return-to-tray", (ev) => {
    const { id } = ev.detail || {};
    if (!id) return;

    const res = commitPlacement(puzzle, {
      dominoId: String(id),
      cells: null
    });

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

  // ============================================================
  // pips:rotate:proposal → engine validate + commitPlacement
  // ============================================================
  appRoot.addEventListener("pips:rotate:proposal", (ev) => {
    const { proposal } = ev.detail || {};
    if (!proposal) return;

    const { id, cells } = proposal;
    if (!id) return;

    const validation = validatePlacementProposal(puzzle, {
      dominoId: String(id),
      cells
    });

    if (!validation.ok) {
      dispatchEvents(ev.target, ["pips:rotate:reject"], {
        id: String(id),
        reason: validation.reason,
        info: validation.info
      });
      dispatchEvents(ev.target, ["pips:state:update"], {});
      return;
    }

    const res = commitPlacement(puzzle, {
      dominoId: String(id),
      cells
    });

    if (!res.accepted) {
      dispatchEvents(ev.target, ["pips:rotate:reject"], {
        id: String(id),
        reason: res.reason,
        info: res.info
      });
      dispatchEvents(ev.target, ["pips:state:update"], {});
      return;
    }

    dispatchEvents(ev.target, ["pips:rotate:commit"], {
      id: String(id),
      r0: cells[0].row,
      c0: cells[0].col,
      r1: cells[1].row,
      c1: cells[1].col
    });

    dispatchEvents(ev.target, ["pips:state:update"], {});
  });

  // ------------------------------------------------------------
  // Rotation requests (must submit proposal)
  // ------------------------------------------------------------
  appRoot.addEventListener("pips:board-rotate-request", (ev) => {
    const { id } = ev.detail || {};
    dispatchEvents(ev.target, ["pips:board-rotate-reject"], {
      id: id ?? null,
      reason: "rotation-must-submit-proposal"
    });
  });

  // ------------------------------------------------------------
  // Check solution (post-commit only)
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

  console.log("installPlacementValidator: complete (cells-authoritative)");
}
