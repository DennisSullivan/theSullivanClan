// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Build DOM for a single domino (used by tray and board).
// NOTES:
//   - Pure UI: never mutates the domino model.
//   - Prefers canonical pip0/pip1 fields.
//   - Supports legacy shapes (arrays, nested objects, fallback keys).
//   - Always creates seven .pip elements per half.
//   - Medium diagnostics for unexpected or impossible branches.
// ============================================================

/**
 * resolvePipFromKeys(domino, keys)
 * Attempts to extract a pip value from a list of candidate keys.
 * This supports legacy models that used inconsistent naming.
 *
 * RETURNS:
 *   - The first matching value found, or undefined.
 */
function resolvePipFromKeys(domino, keys) {
  if (!domino || typeof domino !== "object") return undefined;

  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(domino, k) && domino[k] != null) {
      return domino[k];
    }
  }

  return undefined;
}

/**
 * createPips()
 * Creates the standard 7‑pip grid used by both halves.
 * This is purely structural; CSS decides which pips are visible.
 */
function createPips() {
  const container = document.createElement("div");
  container.className = "pip-grid";

  for (let i = 1; i <= 7; i++) {
    const p = document.createElement("div");
    p.className = `pip p${i}`;
    container.appendChild(p);
  }

  return container;
}

/**
 * normalizePipValue(v)
 * Ensures pip values are numeric or stringified numeric.
 * Falls back to 0 if the value is missing or invalid.
 */
function normalizePipValue(v) {
  if (v == null) return 0;

  if (typeof v === "number") return v;

  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

/**
 * renderDomino(domino, wrapper)
 * Renders a single domino into the provided wrapper element.
 *
 * EXPECTS:
 *   - domino: model object with pip0/pip1 or legacy equivalents.
 *   - wrapper: DOM element (caller may reuse it; we clear it).
 *
 * BEHAVIOR:
 *   - Extracts pip0/pip1 using canonical fields first.
 *   - Falls back to arrays or legacy key patterns.
 *   - Normalizes pip values to numbers.
 *   - Builds DOM structure:
 *       wrapper
 *         └── .domino
 *               ├── .half.half0[data-pip]
 *               └── .half.half1[data-pip]
 *   - Adds accessibility label.
 *   - Logs diagnostics for suspicious cases (e.g., 0‑0 with numeric fields).
 *
 * PURE FUNCTION:
 *   - Does not mutate the domino model.
 *   - Only updates the wrapper DOM subtree.
 */
export function renderDomino(domino, wrapper) {
  if (!wrapper) {
    console.error("renderDomino: wrapper is null/undefined.");
    return;
  }

  // Clear wrapper content (caller may reuse wrapper).
  wrapper.innerHTML = "";

  // ------------------------------------------------------------
  // Extract pip values from canonical or legacy shapes.
  // ------------------------------------------------------------
  let pip0, pip1;

  // 1) Canonical pip0/pip1
  if (domino && (domino.pip0 != null || domino.pip1 != null)) {
    pip0 = domino.pip0;
    pip1 = domino.pip1;
  }

  // 2) Arrays: pips, values, v
  else if (domino && Array.isArray(domino.pips) && domino.pips.length >= 2) {
    pip0 = domino.pips[0];
    pip1 = domino.pips[1];
  } else if (domino && Array.isArray(domino.values) && domino.values.length >= 2) {
    pip0 = domino.values[0];
    pip1 = domino.values[1];
  } else if (domino && Array.isArray(domino.v) && domino.v.length >= 2) {
    pip0 = domino.v[0];
    pip1 = domino.v[1];
  }

  // 3) Legacy key-based fallbacks
  else {
    const keys0 = ["value0", "half0", "p0", "v0", "a", "left", "first", "low"];
    const keys1 = ["value1", "half1", "p1", "v1", "b", "right", "second", "high"];

    pip0 = resolvePipFromKeys(domino, keys0);
    pip1 = resolvePipFromKeys(domino, keys1);

    // Nested object fallback: domino.values = { left: x, right: y }
    if (
      (pip0 === undefined || pip1 === undefined) &&
      domino &&
      typeof domino.values === "object" &&
      domino.values !== null
    ) {
      pip0 = pip0 ?? resolvePipFromKeys(domino.values, ["0", "left", "a", "first"]);
      pip1 = pip1 ?? resolvePipFromKeys(domino.values, ["1", "right", "b", "second"]);
    }
  }

  // ------------------------------------------------------------
  // Normalize pip values
  // ------------------------------------------------------------
  pip0 = normalizePipValue(pip0);
  pip1 = normalizePipValue(pip1);

  // ------------------------------------------------------------
  // Build DOM structure
  // ------------------------------------------------------------
  const inner = document.createElement("div");
  inner.className = "domino";

  // Half 0
  const half0 = document.createElement("div");
  half0.className = "half half0";
  half0.dataset.pip = String(pip0);
  half0.appendChild(createPips());

  // Optional pip label (hidden by default)
  const lbl0 = document.createElement("div");
  lbl0.className = "pip-label";
  lbl0.textContent = String(pip0);
  lbl0.style.display = "none";
  half0.appendChild(lbl0);

  // Half 1
  const half1 = document.createElement("div");
  half1.className = "half half1";
  half1.dataset.pip = String(pip1);
  half1.appendChild(createPips());

  const lbl1 = document.createElement("div");
  lbl1.className = "pip-label";
  lbl1.textContent = String(pip1);
  lbl1.style.display = "none";
  half1.appendChild(lbl1);

  inner.appendChild(half0);
  inner.appendChild(half1);
  wrapper.appendChild(inner);

  // ------------------------------------------------------------
  // Accessibility label
  // ------------------------------------------------------------
  try {
    wrapper.setAttribute(
      "aria-label",
      `Domino ${domino?.id ?? ""} ${String(pip0)}-${String(pip1)}`
    );
  } catch (e) {
    console.warn("renderDomino: failed to set aria-label", e);
  }

  // ------------------------------------------------------------
  // Diagnostics: suspicious 0‑0 cases
  // ------------------------------------------------------------
  if (pip0 === 0 && pip1 === 0) {
    const numericFields = [];

    if (domino && typeof domino === "object") {
      for (const k of Object.keys(domino)) {
        const v = domino[k];

        if (typeof v === "number" && v !== 0) numericFields.push(k);
        if (typeof v === "string" && /^\d+$/.test(v) && Number(v) !== 0) numericFields.push(k);
        if (Array.isArray(v) && v.some((x) => typeof x === "number" && x !== 0)) {
          numericFields.push(k);
        }
      }
    }

    if (numericFields.length > 0) {
      console.debug(
        `DOMINO RENDERER: Domino ${domino?.id ?? "(no id)"} rendered as 0-0, but model contains numeric fields: ${numericFields
          .slice(0, 5)
          .join(", ")}`
      );
    }
  }
}
