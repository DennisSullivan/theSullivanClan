// FILE: ui/dominoRenderer.js
// PURPOSE: Build DOM for a single domino (used by tray and other renderers).
// NOTES (conversational): This module produces the exact DOM structure and attributes
// the CSS expects: a .domino element with two .half children, each having a
// string-valued data-pip attribute and seven .pip elements. It is defensive about
// model property names so it works with different puzzle JSON shapes.

/**
 * resolvePip(domino, candidates)
 * Purpose: Return the first defined pip value from a list of candidate property names.
 * Use: Internal helper to tolerate different domino model shapes.
 */
function resolvePip(domino, candidates) {
  for (const key of candidates) {
    if (domino == null) break;
    if (Object.prototype.hasOwnProperty.call(domino, key) && domino[key] != null) {
      return domino[key];
    }
  }
  return 0;
}

/**
 * createPips()
 * Purpose: Create the seven .pip elements used by CSS selectors.
 * Use: appended into each half so CSS rules like .half[data-pip="3"] .p1 { opacity: 1 } work.
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
 * renderDomino(domino, wrapper)
 * Purpose: Render a domino into the provided wrapper element (in-tray or on-board).
 * Use: Pure rendering; does not mutate the domino model. Ensures data-pip is a string
 * and that .pip elements exist. Wrapper should be an empty container created by caller.
 */
export function renderDomino(domino, wrapper) {
  if (!wrapper) return;

  // Clear wrapper
  wrapper.innerHTML = "";

  // Defensive pip resolution: common property name variants
  const candidates0 = ["value0", "half0", "a", "left", "p0", "v0"];
  const candidates1 = ["value1", "half1", "b", "right", "p1", "v1"];

  const pip0 = resolvePip(domino, candidates0);
  const pip1 = resolvePip(domino, candidates1);

  // Build inner domino structure
  const inner = document.createElement("div");
  inner.className = "domino";

  const half0 = document.createElement("div");
  half0.className = "half half0";
  half0.dataset.pip = String(pip0);
  half0.appendChild(createPips());
  // hidden textual fallback for debugging
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

  // Accessibility: set an aria-label summarizing the pip values
  try {
    wrapper.setAttribute("aria-label", `Domino ${domino?.id ?? ""} ${String(pip0)}-${String(pip1)}`);
  } catch (e) {}

  // Small debug hint: if both pips are zero but model had other fields, log once
  if (String(pip0) === "0" && String(pip1) === "0") {
    // If the domino actually had numeric zeros intentionally, this is fine.
    // If not, this log helps find model naming mismatches.
    // eslint-disable-next-line no-console
    console.debug(`dominoRenderer: rendered domino ${domino?.id ?? "(no id)"} as 0-0 (check model fields)`);
  }
}
