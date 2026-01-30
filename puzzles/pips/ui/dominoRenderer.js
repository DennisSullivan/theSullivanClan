// ============================================================
// FILE: dominoRenderer.js
// PURPOSE: Renders a single domino in the DOM, both in the tray
//          and on the board.
// NOTES:
//   - Pure UI: reads domino state, never mutates it.
//   - Board orientation is derived from geometry.
//   - Tray orientation uses domino.trayOrientation.
//   - No A/B model, no orientation flags.
// ============================================================


// ------------------------------------------------------------
// renderDomino(domino, parentEl)
// Creates or updates the DOM element for a domino.
// INPUTS:
//   domino   - canonical Domino object
//   parentEl - DOM node where the domino should be attached
// NOTES:
//   - If the element already exists, it is updated.
//   - If not, it is created.
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

  // Update pip values (in case of dynamic themes)
  updatePipValues(el, domino);

  // Apply transform based on tray or board state
  applyDominoTransform(el, domino);
}


// ------------------------------------------------------------
// createDominoHTML(domino)
// Returns the inner HTML for a domino.
// NOTES:
//   - Two halves: .half0 and .half1
//   - Pip values inserted into data attributes for styling
// ------------------------------------------------------------
function createDominoHTML(domino) {
  return `
    <div class="half half0" data-pip="${domino.pip0}"></div>
    <div class="half half1" data-pip="${domino.pip1}"></div>
  `;
}


// ------------------------------------------------------------
// updatePipValues(el, domino)
// Updates pip values on an existing DOM element.
// NOTES:
//   - Allows dynamic themes or pip rendering changes.
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
// NOTES:
//   - In tray: use trayOrientation only.
//   - On board: compute orientation from geometry.
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

  // Horizontal: half1 is to the right
  if (dr === 0 && dc === 1) angle = 0;

  // Horizontal: half1 is to the left
  if (dr === 0 && dc === -1) angle = 180;

  // Vertical: half1 is below
  if (dr === 1 && dc === 0) angle = 90;

  // Vertical: half1 is above
  if (dr === -1 && dc === 0) angle = 270;

  el.style.transform = `rotate(${angle}deg)`;
}

