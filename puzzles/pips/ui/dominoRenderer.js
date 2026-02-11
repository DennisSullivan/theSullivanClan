// FILE: ui/dominoRenderer.js
// PURPOSE: Build DOM for a single domino (used by tray and board renderers).
// NOTES:
//  - Prefers canonical model fields pip0/pip1 (from engine/domino.js).
//  - Also accepts arrays (pips, values) and legacy keys for compatibility.
//  - Always creates seven .pip elements per half and sets data-pip as a string.

function resolvePipFromKeys(domino, keys) {
  for (const k of keys) {
    if (!domino) break;
    if (Object.prototype.hasOwnProperty.call(domino, k) && domino[k] != null) {
      return domino[k];
    }
  }
  return undefined;
}

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
 * Ensure pip values are numeric or stringified numeric; fallback to 0.
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
 * - domino: model object (expected canonical fields: pip0, pip1)
 * - wrapper: DOM element provided by caller (will be cleared and populated)
 *
 * This function is pure rendering only; it does not mutate the domino model.
 */
export function renderDomino(domino, wrapper) {
  if (!wrapper) return;

  // Clear wrapper content (caller may reuse wrapper)
  wrapper.innerHTML = "";

  // Candidate shapes to check
  // 1) canonical fields pip0/pip1
  let pip0 = undefined, pip1 = undefined;
  if (domino && (typeof domino.pip0 !== "undefined" || typeof domino.pip1 !== "undefined")) {
    pip0 = domino.pip0;
    pip1 = domino.pip1;
  }
  // 2) arrays (pips / values / v)
  else if (domino && Array.isArray(domino.pips) && domino.pips.length >= 2) {
    pip0 = domino.pips[0];
    pip1 = domino.pips[1];
  } else if (domino && Array.isArray(domino.values) && domino.values.length >= 2) {
    pip0 = domino.values[0];
    pip1 = domino.values[1];
  } else if (domino && Array.isArray(domino.v) && domino.v.length >= 2) {
    pip0 = domino.v[0];
    pip1 = domino.v[1];
  } else {
    // 3) key-based fallbacks (legacy)
    const keys0 = ["value0", "half0", "p0", "v0", "a", "left", "first", "low"];
    const keys1 = ["value1", "half1", "p1", "v1", "b", "right", "second", "high"];
    pip0 = resolvePipFromKeys(domino, keys0);
    pip1 = resolvePipFromKeys(domino, keys1);

    // Some models use nested objects like domino.values = { left: x, right: y }
    if ((pip0 === undefined || pip1 === undefined) && domino && typeof domino.values === "object" && domino.values !== null) {
      pip0 = pip0 === undefined ? resolvePipFromKeys(domino.values, ["0", "left", "a", "first"]) : pip0;
      pip1 = pip1 === undefined ? resolvePipFromKeys(domino.values, ["1", "right", "b", "second"]) : pip1;
    }
  }

  // Final normalization to numeric (or 0)
  pip0 = normalizePipValue(pip0);
  pip1 = normalizePipValue(pip1);

  // Build DOM
  const inner = document.createElement("div");
  inner.className = "domino";

  const half0 = document.createElement("div");
  half0.className = "half half0";
  half0.dataset.pip = String(pip0);
  half0.appendChild(createPips());
  const lbl0 = document.createElement("div");
  lbl0.className = "pip-label";
  lbl0.textContent = String(pip0);
  lbl0.style.display = "none";
  half0.appendChild(lbl0);

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

  // Accessibility label
  try {
    wrapper.setAttribute("aria-label", `Domino ${domino?.id ?? ""} ${String(pip0)}-${String(pip1)}`);
  } catch (e) {}

  // Diagnostic: if both pips are zero but model contains numeric fields, log compactly once
  if (pip0 === 0 && pip1 === 0) {
    const numericFields = [];
    if (domino && typeof domino === "object") {
      for (const k of Object.keys(domino)) {
        const v = domino[k];
        if (typeof v === "number" && v !== 0) numericFields.push(k);
        if (typeof v === "string" && /^\d+$/.test(v) && Number(v) !== 0) numericFields.push(k);
        if (Array.isArray(v) && v.some(x => typeof x === "number" && x !== 0)) numericFields.push(k);
      }
    }
    if (numericFields.length > 0) {
      // eslint-disable-next-line no-console
      console.debug(`dominoRenderer: domino ${domino?.id ?? "(no id)"} rendered as 0-0 but model has numeric fields: ${numericFields.slice(0,5).join(", ")}`);
    }
  }
}
