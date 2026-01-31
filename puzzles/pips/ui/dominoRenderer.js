// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Render a single domino using geometry-only orientation.
// NOTES:
//   - pip0 = half0, pip1 = half1
//   - tray dominos have no rotation
//   - board dominos derive rotation from geometry
// ============================================================

export function renderDomino(domino, parentEl) {
  // Remove any existing domino inside this wrapper
  parentEl.innerHTML = "";

  const el = document.createElement("div");
  el.id = `domino-${domino.id}`;
  el.className = "domino";
  el.dataset.id = domino.id;
  el.innerHTML = createDominoHTML(domino);

  parentEl.appendChild(el);

  updatePipValues(el, domino);
  applyDominoTransform(el, domino);
}



// ------------------------------------------------------------
// createDominoHTML
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
    </div>

    <div class="half half1" data-pip="${domino.pip1}">
      <div class="pip p1"></div>
      <div class="pip p2"></div>
      <div class="pip p3"></div>
      <div class="pip p4"></div>
      <div class="pip p5"></div>
      <div class="pip p6"></div>
      <div class="pip p7"></div>
    </div>
  `;
}


// ------------------------------------------------------------
// updatePipValues
// ------------------------------------------------------------
function updatePipValues(el, domino) {
  el.querySelector(".half0").dataset.pip = domino.pip0;
  el.querySelector(".half1").dataset.pip = domino.pip1;
}


// ------------------------------------------------------------
// applyDominoTransform
// Geometry-only rotation
// ------------------------------------------------------------
function applyDominoTransform(el, domino) {
  // TRAY DOMINO
  if (domino.row0 === null) {
    el.style.transform = "rotate(0deg)";
    el.classList.add("in-tray");
    el.classList.remove("on-board");
    return;
  }

  // BOARD DOMINO
  el.classList.remove("in-tray");
  el.classList.add("on-board");

  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

  let angle = 0;
  if (dr === 0 && dc === 1) angle = 0;     // horizontal L→R
  if (dr === 0 && dc === -1) angle = 180;  // horizontal R→L
  if (dr === 1 && dc === 0) angle = 90;    // vertical T→B
  if (dr === -1 && dc === 0) angle = 270;  // vertical B→T

  el.style.transform = `rotate(${angle}deg)`;
}
