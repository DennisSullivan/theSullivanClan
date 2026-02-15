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
  
  // Defensive: only allow drag from tray or placed domino wrappers
  if (!trayEl.contains(wrapper) && !boardEl.contains(wrapper)) return;

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
    dragState.moved = true;
    
    const clone = wrapper.cloneNode(true);
    const rect = wrapper.getBoundingClientRect();

    clone.style.position = "fixed";
    clone.style.left = `${x - rect.width / 2}px`;
    clone.style.top  = `${y - rect.height / 2}px`;
    clone.style.transform = "none";   // ← CRITICAL
    clone.style.margin = "0";         // ← CRITICAL
    clone.style.inset = "auto";       // ← CRITICAL
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.pointerEvents = "none";
    clone.style.zIndex = 9999;

    document.body.appendChild(clone);
    clone.style.visibility = "visible";
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
    console.log("DRAG: pointerUp ENTER", {
      active: dragState.active,
      moved: dragState.moved,
      hasWrapper: !!dragState.wrapper,
      hasClone: !!dragState.clone
    });

    if (dragState.clone) {
      dragState.clone.style.left =
        `${ev.clientX - dragState.clone.offsetWidth / 2}px`;
      dragState.clone.style.top =
        `${ev.clientY - dragState.clone.offsetHeight / 2}px`;
    }

    // existing code follows…
    const wrapper = dragState.wrapper;
    const id = wrapper?.dataset.dominoId;

console.log("DRAG: pointerUp coords", { x: ev.clientX, y: ev.clientY });

if (dragState.clone) {
  console.log("DRAG: clone rect BEFORE sync", dragState.clone.getBoundingClientRect());

  dragState.clone.style.left = `${ev.clientX - dragState.clone.offsetWidth / 2}px`;
  dragState.clone.style.top  = `${ev.clientY - dragState.clone.offsetHeight / 2}px`;

  // Force style/layout flush so rect reflects the new left/top immediately
  dragState.clone.getBoundingClientRect();

  console.log("DRAG: clone rect AFTER sync", dragState.clone.getBoundingClientRect());
}

    if (dragState.moved && id) {
      emitPlacementProposal(dragState.clone, id);
    }

    if (dragState.clone) dragState.clone.remove();
    if (wrapper) wrapper.style.visibility = "visible";

    dragState.active = false;
    dragState.wrapper = null;
    dragState.clone = null;
    dragState.moved = false;
  }

  // ------------------------------------------------------------
  // PlacementProposal construction
  // ------------------------------------------------------------
function emitPlacementProposal(node, id) {
  if (!node) {
    console.warn("emitPlacementProposal: missing node");
    return;
  }

  const boardRect = boardEl.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  const rows = grid.rows;
  const cols = grid.cols;
  
  const cellWidth  = boardRect.width  / cols;
  const cellHeight = boardRect.height / rows;

  console.log("DRAG: emitPlacementProposal geometry", {
    id,
    rect,
    boardRect
  });

  // ------------------------------------------------------------
  // Return-to-tray rule: fully outside board
  // ------------------------------------------------------------
  if (
    rect.right  <= boardRect.left ||
    rect.left   >= boardRect.right ||
    rect.bottom <= boardRect.top ||
    rect.top    >= boardRect.bottom
  ) {
    console.log("DRAG: emitPlacementProposal → tray (outside board)");
    document.dispatchEvent(new CustomEvent("pips:drop:tray", {
      detail: { id }
    }));
    return;
  }

  // ------------------------------------------------------------
  // Split geometry into two halves (horizontal domino)
  // ------------------------------------------------------------
  const halfWidth = rect.width / 2;

  const halfRects = [
    {
      left: rect.left,
      right: rect.left + halfWidth,
      top: rect.top,
      bottom: rect.bottom,
      width: halfWidth,
      height: rect.height
    },
    {
      left: rect.left + halfWidth,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: halfWidth,
      height: rect.height
    }
  ];

  // ------------------------------------------------------------
  // Compute target cells + overlap
  // ------------------------------------------------------------
  const targets = halfRects.map((r, i) => {
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

    const overlap = overlapArea / halfArea;

    console.log(`DRAG: half ${i} overlap`, {
      row, col, overlap
    });

    return { row, col, overlap };
  });

  // ------------------------------------------------------------
  // Overlap rule (>50%)
  // ------------------------------------------------------------
  if (targets.some(t => t.overlap <= 0.5)) {
    console.log("DRAG: emitPlacementProposal → tray (insufficient overlap)");
    document.dispatchEvent(new CustomEvent("pips:drop:tray", {
      detail: { id }
    }));
    return;
  }

  // ------------------------------------------------------------
  // Emit PlacementProposal
  // ------------------------------------------------------------
  console.log("DRAG: emitPlacementProposal → proposal", targets);

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
  document.addEventListener("pointermove", pointerMove);
  document.addEventListener("pointerup", pointerUp);

  console.log("DRAG: installDragDrop complete");
}
