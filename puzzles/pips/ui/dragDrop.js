// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Drag/drop interaction → PlacementProposal emitter.
// MODEL:
//   - Visual clone follows pointer (non-authoritative)
//   - Logical geometry snapshot captured once at drag-start
//   - UI computes final geometry and emits proposal
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
    geometry: null
  };

  // ------------------------------------------------------------
  // pointerDown
  // ------------------------------------------------------------
  function pointerDown(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!trayEl.contains(wrapper) && !boardEl.contains(wrapper)) return;

    dragState.active = true;
    dragState.wrapper = wrapper;
    dragState.startX = ev.clientX;
    dragState.startY = ev.clientY;
    dragState.moved = false;
    dragState.geometry = null;
  }

  // ------------------------------------------------------------
  // beginRealDrag
  // ------------------------------------------------------------
  function beginRealDrag(wrapper, x, y) {
    wrapper.style.visibility = "hidden";
    dragState.moved = true;

    const trayOrientation =
      ((Number(wrapper.dataset.trayOrientation) || 0) % 360 + 360) % 360;

    let half0Side;
    switch (trayOrientation) {
      case 0:   half0Side = "left";   break;
      case 180: half0Side = "right";  break;
      case 90:  half0Side = "top";    break;
      case 270: half0Side = "bottom"; break;
      default:  half0Side = "left";
    }

    dragState.geometry = { half0Side };

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
  function pointerUp() {
    const wrapper = dragState.wrapper;
    const id = wrapper?.dataset.dominoId;

    if (dragState.moved && id && dragState.clone) {
      emitPlacementProposal(dragState.clone, id, dragState.geometry);
    }

    if (dragState.clone) dragState.clone.remove();
    if (wrapper) wrapper.style.visibility = "visible";

    dragState.active = false;
    dragState.wrapper = null;
    dragState.clone = null;
    dragState.geometry = null;
    dragState.moved = false;
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

    const isHorizontal =
      geometry.half0Side === "left" ||
      geometry.half0Side === "right";

    let halfRects;
    if (isHorizontal) {
      const w = rect.width / 2;
      halfRects = [
        { left: rect.left, right: rect.left + w, top: rect.top, bottom: rect.bottom },
        { left: rect.left + w, right: rect.right, top: rect.top, bottom: rect.bottom }
      ];
    } else {
      const h = rect.height / 2;
      halfRects = [
        { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + h },
        { left: rect.left, right: rect.right, top: rect.top + h, bottom: rect.bottom }
      ];
    }

    const targets = halfRects.map(r => {
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;
      return {
        row: Math.floor((cy - boardRect.top) / cellH),
        col: Math.floor((cx - boardRect.left) / cellW)
      };
    });

    if (isHorizontal) {
      targets[1].row = targets[0].row;
      targets[1].col = targets[0].col + 1;
    } else {
      targets[1].col = targets[0].col;
      targets[1].row = targets[0].row + 1;
    }

    const half0IsFirst =
      geometry.half0Side === "left" ||
      geometry.half0Side === "top";

    const [a, b] = half0IsFirst ? targets : [targets[1], targets[0]];

    boardEl.dispatchEvent(new CustomEvent("pips:drop:proposal", {
      bubbles: true,
      detail: {
        proposal: {
          id,
          row0: a.row,
          col0: a.col,
          row1: b.row,
          col1: b.col
        }
      }
    }));
  }

  // ------------------------------------------------------------
  // Wiring
  // ------------------------------------------------------------
  boardEl.addEventListener("pointerdown", pointerDown);
  trayEl.addEventListener("pointerdown", pointerDown);
  document.addEventListener("pointermove", pointerMove);
  document.addEventListener("pointerup", pointerUp);
}
