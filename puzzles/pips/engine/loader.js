// ============================================================
// FILE: engine/structuralValidator.js
// PURPOSE:
//   Authoritative structural validation for puzzle definitions.
//   Enforces Structural Invariants before any engine state exists.
// ============================================================

export function validateStructure(puzzleDef) {
  const errors = [];

  const width = puzzleDef.width;
  const height = puzzleDef.height;

  const blockedSet = Array.isArray(puzzleDef.blocked)
    ? new Set(puzzleDef.blocked.map(c => `${c.row},${c.col}`))
    : new Set();

  // ------------------------------------------------------------
  // Invariant: playableCellCount === 2 × dominoCount
  // (startingDominos are already placed; dominos are tray inventory)
  // ------------------------------------------------------------
  const dominoCount = puzzleDef.dominoCount;

  if (typeof width === "number" && typeof height === "number" && typeof dominoCount === "number") {
    const totalCells = width * height;
    const playableCellCount = totalCells - blockedSet.size;

    if (playableCellCount !== 2 * dominoCount) {
      errors.push({
        code: "DOMINO_COUNT_MISMATCH",
        message: "Playable cell count must equal 2 × dominoCount.",
        path: "/dominoCount"
      });
    }
  }

  // ------------------------------------------------------------
  // Invariant: starting dominos must not occupy blocked cells
  // ------------------------------------------------------------
  if (Array.isArray(puzzleDef.startingDominos)) {
    puzzleDef.startingDominos.forEach((domino, index) => {
      if (!Array.isArray(domino.cells)) return;

      domino.cells.forEach(cell => {
        const key = `${cell.row},${cell.col}`;
        if (blockedSet.has(key)) {
          errors.push({
            code: "DOMINO_ON_BLOCKED_CELL",
            message: "Starting domino occupies a blocked cell.",
            path: `/startingDominos/${index}`
          });
        }
      });
    });
  }

  // ------------------------------------------------------------
  // Invariant: starting dominos must not overlap
  // ------------------------------------------------------------
  if (Array.isArray(puzzleDef.startingDominos)) {
    const occupied = new Set();

    puzzleDef.startingDominos.forEach((domino, index) => {
      if (!Array.isArray(domino.cells)) return;

      domino.cells.forEach(cell => {
        const key = `${cell.row},${cell.col}`;
        if (occupied.has(key)) {
          errors.push({
            code: "DOMINO_OVERLAP",
            message: "Starting dominos overlap.",
            path: `/startingDominos/${index}`
          });
        } else {
          occupied.add(key);
        }
      });
    });
  }

  // ------------------------------------------------------------
  // Invariant: regions must be non-empty
  // ------------------------------------------------------------
  if (Array.isArray(puzzleDef.regions)) {
    puzzleDef.regions.forEach((region, index) => {
      if (!Array.isArray(region.cells) || region.cells.length === 0) {
        errors.push({
          code: "EMPTY_REGION",
          message: "Region must contain at least one cell.",
          path: `/regions/${index}`
        });
      }
    });
  }

  // ------------------------------------------------------------
  // Invariant: region cells must be playable
  // (blocked cells only; starting dominos are allowed)
  // ------------------------------------------------------------
  if (Array.isArray(puzzleDef.regions)) {
    puzzleDef.regions.forEach((region, index) => {
      if (!Array.isArray(region.cells)) return;

      region.cells.forEach(cell => {
        const key = `${cell.row},${cell.col}`;
        if (blockedSet.has(key)) {
          errors.push({
            code: "REGION_ON_BLOCKED_CELL",
            message: "Region includes a blocked cell.",
            path: `/regions/${index}`
          });
        }
      });
    });
  }

  // ------------------------------------------------------------
  // Invariant: regions must not overlap
  // ------------------------------------------------------------
  const regionOccupied = new Set();

  if (Array.isArray(puzzleDef.regions)) {
    puzzleDef.regions.forEach((region, index) => {
      if (!Array.isArray(region.cells)) return;

      region.cells.forEach(cell => {
        const key = `${cell.row},${cell.col}`;
        if (regionOccupied.has(key)) {
          errors.push({
            code: "REGION_OVERLAP",
            message: "Regions overlap.",
            path: `/regions/${index}`
          });
        } else {
          regionOccupied.add(key);
        }
      });
    });
  }

  // ------------------------------------------------------------
  // Invariant: every playable cell must belong to exactly one region
  // ------------------------------------------------------------
  if (typeof width === "number" && typeof height === "number" && Array.isArray(puzzleDef.regions)) {
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const key = `${row},${col}`;
        if (blockedSet.has(key)) continue;

        if (!regionOccupied.has(key)) {
          errors.push({
            code: "REGION_COVERAGE_INCOMPLETE",
            message: "Every playable cell must belong to exactly one region.",
            path: "/regions"
          });
          row = height;
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------
  // Final decision
  // ------------------------------------------------------------
  if (errors.length > 0) {
    return { status: "Rejected", errors };
  }

  return { status: "Accepted" };
}
