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

export function renderDomino(domino, parentEl) {
  let el = document.getElementById(`domino-${domino.id}`);

  if (!el) {
    el = document.createElement("div");
    el.id = `domino-${domino.id}`;
    el.className = "domino";
    el.innerHTML = createDominoHTML(domino);
    parentEl.appendChild(el);
  }

  updatePipValues(el, domino);
  applyDominoTransform(el, domino);
}

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

function updatePipValues(el, domino) {
  const h0 = el.querySelector(".half0");
  const h1 = el.querySelector(".half1");

  if (h0) h0.dataset.pip = domino.pip0;
  if (h1) h1.dataset.pip = domino.pip1;
}

function applyDominoTransform(el, domino) {
  if (domino.row0 === null) {
    el.style.transform = `rotate(${domino.trayOrientation}deg)`;
    el.classList.add("in-tray");
    el.classList.remove("on-board");
    return;
  }

  el.classList.remove("in-tray");
  el.classList.add("on-board");

  const dr = domino.row1 - domino.row0;
  const dc = domino.col1 - domino.col0;

  let angle = 0;
  if (dr === 0 && dc === 1) angle = 0;
  if (dr === 0 && dc === -1) angle = 180;
  if (dr === 1 && dc === 0) angle = 90;
  if (dr === -1 && dc === 0) angle = 270;

  el.style.transform = `rotate(${angle}deg)`;
}
