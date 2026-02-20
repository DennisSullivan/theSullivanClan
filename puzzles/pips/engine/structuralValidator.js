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

  // ------------------------------------------------------------
  // Invariant: region cells must be within board bounds
  // ------------------------------------------------------------
  if (
    typeof width === "number" &&
    typeof height === "number" &&
    Array.isArray(puzzleDef.regions)
  ) {
    puzzleDef.regions.forEach((region, index) => {
      if (!Array.isArray(region.cells)) return;
  
      region.cells.forEach(cell => {
        const { row, col } = cell;
  
        if (
          typeof row !== "number" ||
          typeof col !== "number" ||
          row < 0 || row >= height ||
          col < 0 || col >= width
        ) {
          errors.push({
            code: "REGION_CELL_OUT_OF_BOUNDS",
            message: "Region cell is outside board bounds.",
            path: `/regions/${index}`
          });
        }
      });
    });
  }

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
  // Invariant: regions must be orthogonally connected
  // ------------------------------------------------------------
  if (Array.isArray(puzzleDef.regions)) {
    puzzleDef.regions.forEach((region, index) => {
      if (!Array.isArray(region.cells) || region.cells.length === 0) return;
  
      const cellSet = new Set(
        region.cells.map(c => `${c.row},${c.col}`)
      );
  
      // BFS from first cell
      const visited = new Set();
      const queue = [];
  
      const start = region.cells[0];
      const startKey = `${start.row},${start.col}`;
  
      queue.push(startKey);
      visited.add(startKey);
  
      while (queue.length > 0) {
        const key = queue.shift();
        const [r, c] = key.split(",").map(Number);
  
        const neighbors = [
          `${r-1},${c}`,
          `${r+1},${c}`,
          `${r},${c-1}`,
          `${r},${c+1}`
        ];
  
        for (const n of neighbors) {
          if (cellSet.has(n) && !visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
  
      if (visited.size !== cellSet.size) {
        errors.push({
          code: "REGION_DISCONNECTED",
          message: "Region cells must form a single connected component.",
          path: `/regions/${index}`
        });
      }
    });
  }

  // ------------------------------------------------------------
  // Final decision
  // ------------------------------------------------------------
  if (errors.length > 0) {
    return { status: "Rejected", errors };
  }

  return { status: "Accepted" };
}
