// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Drag/drop interaction → PlacementProposal emitter.
// CONTRACT:
//   - Geometry frozen at pointer-down
//   - Visual clone is non-authoritative
//   - Proposal derived from frozen geometry + anchor cell
//   - Engine is sole authority for accept/reject
// ============================================================

export function installDragDrop({ boardEl, trayEl, rows, cols }) {

  const dragState = {
    active: false,
    wrapper: null,
    clone: null,
    startX: 0,
    startY: 0,
    moved: false,
    geometry: null,
    pointerId: null
  };

  // ------------------------------------------------------------
  // pointerDown
  // ------------------------------------------------------------
  function pointerDown(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!trayEl.contains(wrapper) && !boardEl.contains(wrapper)) return;

    ev.preventDefault();
    document.body.setPointerCapture(ev.pointerId);

    const trayOrientation =
      ((Number(wrapper.dataset.trayOrientation) || 0) % 360 + 360) % 360;

    dragState.active = true;
    dragState.wrapper = wrapper;
    dragState.startX = ev.clientX;
    dragState.startY = ev.clientY;
    dragState.moved = false;
    dragState.pointerId = ev.pointerId;

    // Freeze geometry at intent time
    dragState.geometry = {
      half0Side:
        trayOrientation === 0   ? "left"   :
        trayOrientation === 180 ? "right"  :
        trayOrientation === 90  ? "top"    :
                                  "bottom"
    };
  }

  // ------------------------------------------------------------
  // beginRealDrag
  // ------------------------------------------------------------
  function beginRealDrag(wrapper, x, y) {
    dragState.moved = true;

    const clone = wrapper.cloneNode(true);
    const rect = wrapper.getBoundingClientRect();

    clone.style.position = "fixed";
    clone.style.margin = "0";
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.pointerEvents = "none";
    clone.style.zIndex = 9999;
    clone.style.left = `${x}px`;
    clone.style.top = `${y}px`;
    clone.style.transform = "translate(-50%, -50%)";

    document.body.appendChild(clone);
    dragState.clone = clone;
  }

  // ------------------------------------------------------------
  // pointerMove
  // ------------------------------------------------------------
  function pointerMove(ev) {
    if (!dragState.active) return;
    if (ev.pointerId !== dragState.pointerId) return;

    const dx = ev.clientX - dragState.startX;
    const dy = ev.clientY - dragState.startY;

    if (!dragState.clone && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
      beginRealDrag(dragState.wrapper, dragState.startX, dragState.startY);
    }

    if (!dragState.clone) return;

    dragState.clone.style.left = `${ev.clientX}px`;
    dragState.clone.style.top  = `${ev.clientY}px`;
  }

  // ------------------------------------------------------------
  // pointerUp
  // ------------------------------------------------------------
  function pointerUp(ev) {
    if (ev.pointerId !== dragState.pointerId) return;

    const wrapper = dragState.wrapper;
    const id = wrapper?.dataset.dominoId;

    if (dragState.moved && id && dragState.clone) {
      emitPlacementProposal(dragState.clone, id, dragState.geometry);
    }

    if (dragState.clone) dragState.clone.remove();

    try {
      document.body.releasePointerCapture(ev.pointerId);
    } catch {}

    dragState.active = false;
    dragState.wrapper = null;
    dragState.clone = null;
    dragState.geometry = null;
    dragState.moved = false;
    dragState.pointerId = null;
  }

  // ------------------------------------------------------------
  // emitPlacementProposal
  // ------------------------------------------------------------
  function emitPlacementProposal(node, id, geometry) {
    if (!node || !geometry) return;

    const boardRect = boardEl.getBoundingClientRect();
    const rect = node.getBoundingClientRect();

    const cellW = boardRect.width / cols;
    const cellH = boardRect.height / rows;

    // Anchor cell from clone center
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;

    const row0 = Math.floor((cy - boardRect.top) / cellH);
    const col0 = Math.floor((cx - boardRect.left) / cellW);

    let row1 = row0;
    let col1 = col0;

    switch (geometry.half0Side) {
      case "left":   col1 = col0 + 1; break;
      case "right":  col1 = col0 - 1; break;
      case "top":    row1 = row0 + 1; break;
      case "bottom": row1 = row0 - 1; break;
    }

    boardEl.dispatchEvent(new CustomEvent("pips:drop:proposal", {
      bubbles: true,
      detail: {
        proposal: {
          id,
          row0,
          col0,
          row1,
          col1
        }
      }
    }));
  }

  // ------------------------------------------------------------
  // Wiring
  // ------------------------------------------------------------
  document.addEventListener("pointerdown", pointerDown);
  document.addEventListener("pointermove", pointerMove);
  document.addEventListener("pointerup", pointerUp);
}
