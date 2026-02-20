// ============================================================
// FILE: engine/structuralValidator.js
// PURPOSE:
//   Authoritative structural validation for puzzle definitions.
//   Enforces Structural Invariants before any engine state exists.
// ============================================================

/**
 * validateStructure(puzzleDef)
 *
 * Determines whether a puzzle definition satisfies all
 * Structural Invariants defined in the Structural Validation Contract.
 *
 * @param {Object} puzzleDef - Raw puzzle definition parsed from JSON.
 * @returns {Object}
 *   { status: "Accepted" }
 *   OR
 *   { status: "Rejected", errors: Error[] }
 */
export function validateStructure(puzzleDef) {
  const errors = [];

  // ------------------------------------------------------------
  // Invariant: playableCellCount === 2 × dominoCount
  // ------------------------------------------------------------
  const width = puzzleDef.width;
  const height = puzzleDef.height;
  const dominoCount = puzzleDef.dominoCount;

  if (typeof width === "number" && typeof height === "number" && typeof dominoCount === "number") {
    const totalCells = width * height;

    const blockedCount = Array.isArray(puzzleDef.blocked)
      ? puzzleDef.blocked.length
      : 0;

    const playableCellCount = totalCells - blockedCount;

    if (playableCellCount !== 2 * dominoCount) {
      errors.push({
        code: "DOMINO_COUNT_MISMATCH",
        message: "Playable cell count must equal 2 × dominoCount.",
        path: "/dominoCount"
      });
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
