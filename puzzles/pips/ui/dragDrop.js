// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Drag/drop interaction → PlacementProposal emitter.
// MODEL:
//   - Visual clone follows pointer (non-authoritative)
//   - Logical geometry snapshot captured once at drag-start
//   - Placement uses half0/half1 relationship, not CSS transforms
// ============================================================

export function installDragDrop({ boardEl, trayEl, rows, cols }) {

  const dragState = {
    active: false,
    wrapper: null,
    clone: null,
    startX: 0,
    startY: 0,
    moved: false,

    // ----------------------------------------------------------
    // Logical geometry snapshot (authoritative for placement)
    // ----------------------------------------------------------
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
    dragState.moved = true;

    // ----------------------------------------------------------
    // Snapshot logical geometry ONCE
    // ----------------------------------------------------------
    const trayOrientation = Number(wrapper.dataset.trayOrientation || 0) % 360;

    const orientation = (trayOrientation === 90 || trayOrientation === 270)
      ? "V"
      : "H";

    // half0First:
    // 0°  → half0 left/top
    // 90° → half0 top
    // 180°→ half0 right/bottom
    // 270°→ half0 bottom
    const half0First = (trayOrientation === 0 || trayOrientation === 90);

    dragState.geometry = {
      orientation,
      half0First
    };

    // ----------------------------------------------------------
    // Create visual clone (no transforms, no inference)
    // ----------------------------------------------------------
    const clone = wrapper.cloneNode(true);
    const rect = wrapper.getBoundingClientRect();

    clone.style.position = "fixed";
    clone.style.margin = "0";
    clone.style.inset = "auto";
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.pointerEvents = "none";
    clone.style.zIndex = 9999;
    clone.style.left = `${x}px`;
    clone.style.top = `${y}px`;
    clone.style.transform = "translate(-50%, -50%)";
    clone.style.transformOrigin = "center center";

    document.body.appendChild(clone);
    dragState.clone = clone;
    // ----------------------------------------------------------
    // Ensure clone is visually self-contained when re-parented
    // ----------------------------------------------------------
    const inner = clone.querySelector(".domino");
    if (inner) {
      inner.style.visibility = "visible";
      inner.style.opacity = "1";
    }

    console.log("DRAG: clone created", dragState.geometry);
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

    dragState.clone.style.left = `${ev.clientX}px`;
    dragState.clone.style.top  = `${ev.clientY}px`;
  }

  // ------------------------------------------------------------
  // pointerUp
  // ------------------------------------------------------------
  function pointerUp(ev) {
    console.log("DRAG: pointerUp ENTER", {
      active: dragState.active,
      moved: dragState.moved,
      hasClone: !!dragState.clone
    });

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
  // PlacementProposal construction
  // ------------------------------------------------------------
  function emitPlacementProposal(node, id, geometry) {
    if (!node || !geometry) return;

    const boardRect = boardEl.getBoundingClientRect();
    const rect = node.getBoundingClientRect();

    const cellW = boardRect.width / cols;
    const cellH = boardRect.height / rows;

    // ----------------------------------------------------------
    // Return-to-tray rule: fully outside board
    // ----------------------------------------------------------
    if (
      rect.right  <= boardRect.left ||
      rect.left   >= boardRect.right ||
      rect.bottom <= boardRect.top ||
      rect.top    >= boardRect.bottom
    ) {
      document.dispatchEvent(new CustomEvent("pips:drop:tray", {
        detail: { id }
      }));
      return;
    }

    // ----------------------------------------------------------
    // Split geometry by SNAPSHOT orientation
    // ----------------------------------------------------------
    let halfRects;

    if (geometry.orientation === "H") {
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

    // ----------------------------------------------------------
    // Compute target cells + overlap
    // ----------------------------------------------------------
    const targets = halfRects.map(r => {
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;

      const col = Math.floor((cx - boardRect.left) / cellW);
      const row = Math.floor((cy - boardRect.top) / cellH);

      const cellLeft   = boardRect.left + col * cellW;
      const cellTop    = boardRect.top  + row * cellH;
      const cellRight  = cellLeft + cellW;
      const cellBottom = cellTop  + cellH;

      const overlapW = Math.max(0, Math.min(r.right, cellRight) - Math.max(r.left, cellLeft));
      const overlapH = Math.max(0, Math.min(r.bottom, cellBottom) - Math.max(r.top, cellTop));
      const overlap = (overlapW * overlapH) / ((r.right - r.left) * (r.bottom - r.top));

      return { row, col, overlap };
    });

    // ----------------------------------------------------------
    // Enforce adjacency based on orientation
    // ----------------------------------------------------------
    if (geometry.orientation === "V") {
      targets[1].col = targets[0].col;
      targets[1].row = targets[0].row + 1;
    } else {
      targets[1].row = targets[0].row;
      targets[1].col = targets[0].col + 1;
    }

    if (targets.some(t => t.overlap <= 0.5)) {
      document.dispatchEvent(new CustomEvent("pips:drop:tray", {
        detail: { id }
      }));
      return;
    }

    // ----------------------------------------------------------
    // Assign half0 / half1 deterministically
    // ----------------------------------------------------------
    const [a, b] = geometry.half0First ? targets : [targets[1], targets[0]];

    document.dispatchEvent(new CustomEvent("pips:drop:proposal", {
      detail: {
        proposal: {
          id,
          kind: "drop",
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

  console.log("DRAG: installDragDrop complete");
}
