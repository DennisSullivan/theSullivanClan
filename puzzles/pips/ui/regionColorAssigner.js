// ============================================================
// FILE: regionColorAssigner.js
// PURPOSE: Deterministically assign color indices to regions
//          such that no orthogonally adjacent regions share
//          the same color.
// NOTES:
//   - Renderer-only logic.
//   - Uses a fixed palette size (>= 4).
//   - Deterministic for a given regionMap.
// ============================================================

export function computeRegionColorMap(regionMap, paletteSize = 4) {
  const adjacency = new Map();

  // Collect region IDs and adjacency
  for (let r = 0; r < regionMap.length; r++) {
    for (let c = 0; c < regionMap[r].length; c++) {
      const id = regionMap[r][c];
      if (id == null || id < 0) continue;

      if (!adjacency.has(id)) adjacency.set(id, new Set());

      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1]
      ];

      for (const [nr, nc] of neighbors) {
        if (
          regionMap[nr] &&
          regionMap[nr][nc] != null &&
          regionMap[nr][nc] >= 0 &&
          regionMap[nr][nc] !== id
        ) {
          adjacency.get(id).add(regionMap[nr][nc]);
        }
      }
    }
  }

  // Deterministic ordering
  const regionIds = Array.from(adjacency.keys()).sort((a, b) => a - b);
  const colorMap = new Map();

  for (const id of regionIds) {
    const used = new Set(
      Array.from(adjacency.get(id))
        .map(n => colorMap.get(n))
        .filter(v => v != null)
    );

    for (let color = 0; color < paletteSize; color++) {
      if (!used.has(color)) {
        colorMap.set(id, color);
        break;
      }
    }
  }

  return colorMap;
}
