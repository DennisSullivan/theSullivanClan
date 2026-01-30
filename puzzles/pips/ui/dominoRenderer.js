// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Renders a single domino in the DOM, both in the tray
//          and on the board.
// NOTES:
//   - Pure UI: reads domino state, never mutates it.
//   - Board orientation is derived from geometry.
//   - Tray orientation uses domino.trayOrientation.
//   - Uses real multi-dot pip layout.
// ============================================================


// ------------------------------------------------------------
// renderDomino(domino, parentEl)
// Creates or updates the DOM element for a domino.
// ------------------------------------------------------------
export function renderDomino(domino, parentEl) {
  let el = document.getElementById(`domino-${domino.id}`);

  // Create element if missing
  if (!el) {
    el = document.createElement("div");
    el.id = `domino-${domino.id}`;
    el.className = "domino";
    el.innerHTML = createDominoHTML(domino);
    parentEl.appendChild(el);
  }

  // Update pip values
  updatePipValues(el, domino);

  // Apply transform based on tray or board state
  applyDominoTransform(el, domino);
}


// ------------------------------------------------------------
// createDominoHTML(domino)
// Returns the inner HTML for a domino with 7 pip placeholders.
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
// updatePipValues(el, domino)
// Updates pip values on an existing DOM element.
// ------------------------------------------------------------
function updatePipValues(el, domino) {
  const h0 = el.querySelector(".half0");
  const h1 = el.querySelector(".half1");

  if (h0) h0.dataset.pip = domino.pip0;
  if (h1) h1.dataset.pip = domino.pip1;
}


// ------------------------------------------------------------
// applyDominoTransform(el, domino)
// Applies CSS transforms based on domino state.
// ------------------------------------------------------------
function applyDominoTransform(el, domino) {
  if (domino.row0 === null) {
    // Domino is in tray
    el.style.transform = `rotate(${domino.trayOrientation}deg)`;
    el.classList.add("in-tray");
    el.classList.remove("on-board");
    return;
  }

  // Domino is on board
  el.classList.remove("in-tray");
  el.classList.add("on-board");

  // Compute orientation from geometry
  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

  let angle = 0;

  if (dr === 0 && dc === 1) angle = 0;     // right
  if (dr === 0 && dc === -1) angle = 180;  // left
  if (dr === 1 && dc === 0) angle = 90;    // down
  if (dr === -1 && dc === 0) angle = 270;  // up

  el.style.transform = `rotate(${angle}deg)`;
}
