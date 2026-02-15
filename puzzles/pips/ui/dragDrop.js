// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Drag/drop interaction → PlacementProposal emitter.
// NOTES:
//   - Clone-based drag
//   - No engine mutation
//   - Geometry-only responsibility
//   - Emits PlacementProposal on drop
// ============================================================

export function installDragDrop(boardEl, trayEl, cellWidth, cellHeight) {

  const dragState = {
    active: false,
    wrapper: null,
    clone: null,
    startX: 0,
    startY: 0,
    moved: false
  };

  // ------------------------------------------------------------
  // pointerDown
  // ------------------------------------------------------------
  function pointerDown(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;

    dragState.active = true;
    dragState.wrapper = wrapper;
    dragState.startX = ev.clientX;
    dragState.startY = ev.clientY;
    dragState.moved = false;

    console.log("DRAG: pointerDown", {
      id: wrapper.dataset.dominoId,
      startX: dragState.startX,
      startY: dragState.startY
    });
  }

  // ------------------------------------------------------------
  // beginRealDrag
  // ------------------------------------------------------------
  function beginRealDrag(wrapper, x, y) {
    wrapper.style.visibility = "hidden";

    const clone = wrapper.cloneNode(true);
    const rect = wrapper.getBoundingClientRect();

    clone.style.position = "fixed";
    clone.style.left = `${x - rect.width / 2}px`;
    clone.style.top  = `${y - rect.height / 2}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.pointerEvents = "none";
    clone.style.zIndex = 9999;

    document.body.appendChild(clone);
    dragState.clone = clone;

    console.log("DRAG: clone created");
  }

  // ------------------------------------------------------------
  // pointerMove
  // ------------------------------------------------------------
  function pointerMove(ev) {
    if (!dragState.active) return;

    const dx = ev.clientX - dragState.startX;
    const dy = ev.clientY - dragState.startY;

    if (!dragState.clone && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
      console.log("DRAG: threshold passed → beginRealDrag", { dx, dy });
      beginRealDrag(dragState.wrapper, dragState.startX, dragState.startY);
    }

    if (!dragState.clone) return;

    dragState.moved = true;
    dragState.clone.style.left = `${ev.clientX - dragState.clone.offsetWidth / 2}px`;
    dragState.clone.style.top  = `${ev.clientY - dragState.clone.offsetHeight / 2}px`;
  }

  // ------------------------------------------------------------
  // pointerUp
  // ------------------------------------------------------------
  function pointerUp(ev) {
    if (!dragState.active) return;

    const wrapper = dragState.wrapper;
    const id = wrapper?.dataset.dominoId;

    if (dragState.clone) dragState.clone.remove();
    if (wrapper) wrapper.style.visibility = "visible";

    if (dragState.moved && wrapper && id) {
      emitPlacementProposal(wrapper, id);
    }

    dragState.active = false;
    dragState.wrapper = null;
    dragState.clone = null;
    dragState.moved = false;
  }

  // ------------------------------------------------------------
  // PlacementProposal construction
  // ------------------------------------------------------------
  function emitPlacementProposal(wrapper, id) {
    const boardRect = boardEl.getBoundingClientRect();
    const halves = wrapper.querySelectorAll(".half");

    if (halves.length !== 2) return;

    const halfRects = Array.from(halves).map(h => h.getBoundingClientRect());

    // --- Return-to-tray rule ---
    for (const r of halfRects) {
      if (
        r.right  <= boardRect.left ||
        r.left   >= boardRect.right ||
        r.bottom <= boardRect.top ||
        r.top    >= boardRect.bottom
      ) {
        document.dispatchEvent(new CustomEvent("pips:drop:tray", {
          detail: { id }
        }));
        return;
      }
    }

    // --- Compute target cells + overlap ---
    const targets = halfRects.map(r => {
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;

      const relX = cx - boardRect.left;
      const relY = cy - boardRect.top;

      const col = Math.floor(relX / cellWidth);
      const row = Math.floor(relY / cellHeight);

      const cellLeft   = boardRect.left + col * cellWidth;
      const cellTop    = boardRect.top  + row * cellHeight;
      const cellRight  = cellLeft + cellWidth;
      const cellBottom = cellTop  + cellHeight;

      const overlapW = Math.max(0, Math.min(r.right, cellRight) - Math.max(r.left, cellLeft));
      const overlapH = Math.max(0, Math.min(r.bottom, cellBottom) - Math.max(r.top, cellTop));
      const overlapArea = overlapW * overlapH;
      const halfArea = r.width * r.height;

      return { row, col, overlap: overlapArea / halfArea };
    });

    if (targets.some(t => t.overlap <= 0.5)) {
      document.dispatchEvent(new CustomEvent("pips:drop:tray", {
        detail: { id }
      }));
      return;
    }

    // --- Emit PlacementProposal ---
    document.dispatchEvent(new CustomEvent("pips:drop:proposal", {
      detail: {
        proposal: {
          id,
          kind: "drop",
          row0: targets[0].row,
          col0: targets[0].col,
          row1: targets[1].row,
          col1: targets[1].col
        }
      }
    }));
  }

  // ------------------------------------------------------------
  // Wiring
  // ------------------------------------------------------------
  boardEl.addEventListener("pointerdown", pointerDown);
  trayEl.addEventListener("pointerdown", pointerDown);
  boardEl.addEventListener("pointermove", pointerMove);
  trayEl.addEventListener("pointermove", pointerMove);
  document.addEventListener("pointerup", pointerUp);

  console.log("DRAG: installDragDrop complete");
}
