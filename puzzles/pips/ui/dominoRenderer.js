// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Render a single domino using geometry‑first orientation.
// NOTES:
//   - pip0 = half0, pip1 = half1
//   - tray dominos have no rotation
//   - board dominos derive rotation from geometry (row/col pairs)
//   - rotation is applied via CSS custom property (--angle) on the WRAPPER
// ============================================================

export function renderDomino(domino, parentEl) {
  // Clear wrapper content
  parentEl.innerHTML = "";

  // Reset wrapper transform (important after dragging or rotation)
  parentEl.style.removeProperty("transform");
  parentEl.style.transformOrigin = "center center";

  // Create inner domino element
  const el = document.createElement("div");
  el.className = "domino";
  el.dataset.id = domino.id;

  // Insert HTML structure
  el.innerHTML = createDominoHTML(domino);

  parentEl.appendChild(el);

  // Sync pip values
  updatePipValues(el, domino);

  // Apply rotation to the WRAPPER (via --angle)
  applyWrapperRotation(parentEl, domino);
}

// ------------------------------------------------------------
// createDominoHTML(domino)
// Returns the full HTML for the two halves + pip grid.
// ------------------------------------------------------------
function createDominoHTML(domino) {
  return `
    <div class="half half0" data-pip="${domino.pip0}">
      <div class="pip p1"></div>
      <div class="pip p2"></div>
      <div class="pip p3"></div>
      <div class="pip p4"></div>
      <div class="pip p5"></div>
      <div class="pip p6"></div>
      <div class="pip p7"></div>
      <div class="pip p8"></div>
      <div class="pip p9"></div>
    </div>

    <div class="half half1" data-pip="${domino.pip1}">
      <div class="pip p1"></div>
      <div class="pip p2"></div>
      <div class="pip p3"></div>
      <div class="pip p4"></div>
      <div class="pip p5"></div>
      <div class="pip p6"></div>
      <div class="pip p7"></div>
      <div class="pip p8"></div>
      <div class="pip p9"></div>
    </div>
  `;
}

// ------------------------------------------------------------
// updatePipValues(el, domino)
// Syncs the DOM with the domino's pip values.
// ------------------------------------------------------------
function updatePipValues(el, domino) {
  el.querySelector(".half0").dataset.pip = domino.pip0;
  el.querySelector(".half1").dataset.pip = domino.pip1;
}

// ------------------------------------------------------------
// applyWrapperRotation(parentEl, domino)
// Geometry‑first rotation applied to the WRAPPER via --angle.
// ------------------------------------------------------------
function applyWrapperRotation(parentEl, domino) {
  // TRAY DOMINO
  if (domino.row0 === null) {
    parentEl.style.setProperty("--angle", "0deg");
    parentEl.classList.add("in-tray");
    parentEl.classList.remove("on-board");
    return;
  }

  // BOARD DOMINO
  parentEl.classList.remove("in-tray");
  parentEl.classList.add("on-board");

  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

  let angle = 0;
  if (dr === 0 && dc === 1) angle = 0;     // horizontal L→R
  if (dr === 0 && dc === -1) angle = 180;  // horizontal R→L
  if (dr === 1 && dc === 0) angle = 90;    // vertical T→B
  if (dr === -1 && dc === 0) angle = 270;  // vertical B→T

  parentEl.style.setProperty("--angle", `${angle}deg`);
}
