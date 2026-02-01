// ============================================================
// FILE: trayRenderer.js
// PURPOSE: Render tray dominos using canonical domino model.
// ============================================================

export function renderTray(dominos, trayEl) {
  trayEl.innerHTML = "";

  for (const [id, d] of dominos) {
    if (d.row0 !== null) continue; // only tray dominos

    const wrapper = document.createElement("div");
    wrapper.className = "domino-wrapper tray-wrapper";

    const domEl = document.createElement("div");
    domEl.className = "domino";
    domEl.dataset.id = id;

    // Apply tray rotation
    domEl.style.transform = `rotate(${d.trayOrientation}deg)`;

    const h0 = document.createElement("div");
    h0.className = "half half0";
    h0.textContent = d.pips0;

    const h1 = document.createElement("div");
    h1.className = "half half1";
    h1.textContent = d.pips1;

    domEl.appendChild(h0);
    domEl.appendChild(h1);
    wrapper.appendChild(domEl);
    trayEl.appendChild(wrapper);
  }
}
