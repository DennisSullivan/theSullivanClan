// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Drag/drop interaction → PlacementProposal emitter.
// CONTRACT:
//   - Geometry frozen at pointer-down
//   - Visual clone is non-authoritative
//   - Proposal derived from frozen geometry + snapped half0 cell
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
    pointerId: null,

    // Frozen at pointerDown:
    delta: null,
    source: null
  };

  // ------------------------------------------------------------
  // Instrumentation helpers
  // ------------------------------------------------------------
  function markPoint(x, y, color = 'red') {
    const d = document.createElement('div');
    d.style.position = 'fixed';
    d.style.left = `${x - 2}px`;
    d.style.top = `${y - 2}px`;
    d.style.width = '4px';
    d.style.height = '4px';
    d.style.background = color;
    d.style.zIndex = 99999;
    document.body.appendChild(d);
  }

  function log(...args) {
    console.log('[drag]', ...args);
  }

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  function normDeg(deg) {
    return ((Number(deg) || 0) % 360 + 360) % 360;
  }

  function readBoardCoordsFromWrapper(wrapper) {
    const d = wrapper.dataset;

    const row0 = d.row0 ?? d.half0Row;
    const col0 = d.col0 ?? d.half0Col;
    const row1 = d.row1 ?? d.half1Row;
    const col1 = d.col1 ?? d.half1Col;

    if (row0 == null || col0 == null || row1 == null || col1 == null) return null;

    const r0 = Number(row0), c0 = Number(col0), r1 = Number(row1), c1 = Number(col1);
    if (![r0, c0, r1, c1].every(Number.isFinite)) return null;

    return { row0: r0, col0: c0, row1: r1, col1: c1 };
  }

  function deltaFromTrayOrientation(trayOrientationDeg) {
    const o = normDeg(trayOrientationDeg);

    if (o === 0)   return { dr: 0,  dc: 1 };
    if (o === 90)  return { dr: 1,  dc: 0 };
    if (o === 180) return { dr: 0,  dc: -1 };
    return { dr: -1, dc: 0 };
  }

  function freezeDeltaAtPointerDown(wrapper) {
    if (trayEl.contains(wrapper)) {
      const trayOrientation = normDeg(wrapper.dataset.trayOrientation);
      return { delta: deltaFromTrayOrientation(trayOrientation), source: "tray" };
    }

    if (boardEl.contains(wrapper)) {
      const coords = readBoardCoordsFromWrapper(wrapper);
      if (!coords) return null;

      return {
        delta: { dr: coords.row1 - coords.row0, dc: coords.col1 - coords.col0 },
        source: "board"
      };
    }

    return null;
  }

  // ------------------------------------------------------------
  // pointerDown
  // ------------------------------------------------------------
  function pointerDown(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!trayEl.contains(wrapper) && !boardEl.contains(wrapper)) return;

    const frozen = freezeDeltaAtPointerDown(wrapper);
    if (!frozen) return;

    ev.preventDefault();
    document.body.setPointerCapture(ev.pointerId);

    dragState.active = true;
    dragState.wrapper = wrapper;
    dragState.startX = ev.clientX;
    dragState.startY = ev.clientY;
    dragState.moved = false;
    dragState.pointerId = ev.pointerId;

    dragState.delta = frozen.delta;
    dragState.source = frozen.source;

    log("pointerDown", { x: ev.clientX, y: ev.clientY, id: wrapper.dataset.dominoId });
    markPoint(ev.clientX, ev.clientY, "red");
  }

  // ------------------------------------------------------------
  // beginRealDrag
  // ------------------------------------------------------------
  function beginRealDrag(wrapper, x, y) {
    dragState.moved = true;

    log("beginRealDrag", { x, y });
    markPoint(x, y, "orange");

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
    console.log("[drag] cloneCreated", {
      id: wrapper.dataset.dominoId,
      delta: dragState.delta,
      source: dragState.source,
      cloneRect: clone.getBoundingClientRect(),
      pointerDown: { x, y }
    });

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

    log("pointerMove", {
      x: ev.clientX,
      y: ev.clientY,
      dx,
      dy,
      hasClone: !!dragState.clone
    });

    if (!dragState.clone && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
      beginRealDrag(dragState.wrapper, dragState.startX, dragState.startY);
    }

    if (!dragState.clone) return;

    dragState.clone.style.left = `${ev.clientX}px`;
    dragState.clone.style.top = `${ev.clientY}px`;

    markPoint(ev.clientX, ev.clientY, "blue");
  }

  // ------------------------------------------------------------
  // pointerUp
  // ------------------------------------------------------------
  function pointerUp(ev) {
    if (ev.pointerId !== dragState.pointerId) return;

    log("pointerUp", { x: ev.clientX, y: ev.clientY });
    markPoint(ev.clientX, ev.clientY, "green");

    const wrapper = dragState.wrapper;
    const id = wrapper?.dataset.dominoId;

    if (dragState.moved && id && dragState.clone && dragState.delta) {
      const rect = clone.getBoundingClientRect();
      console.log("[drag] cloneUsedForPlacement", {
        id: snapshot.id,
        orientation: snapshot.orientation,
        half0First: snapshot.half0First,
        cloneRect: rect,
        pointerUp: { x: e.clientX, y: e.clientY },
        computed: {
          anchorRow: r0,
          anchorCol: c0,
          r0, c0, r1, c1
        }
      });
      emitPlacementProposal(dragState.clone, id, dragState.delta);
    }

    if (dragState.clone) dragState.clone.remove();

    try {
      document.body.releasePointerCapture(ev.pointerId);
    } catch {}

    dragState.active = false;
    dragState.wrapper = null;
    dragState.clone = null;
    dragState.startX = 0;
    dragState.startY = 0;
    dragState.moved = false;
    dragState.pointerId = null;
    dragState.delta = null;
    dragState.source = null;
  }

  // ------------------------------------------------------------
  // emitPlacementProposal
  // ------------------------------------------------------------
  function emitPlacementProposal(node, id, delta) {
    if (!node || !delta) return;

    log("emitPlacementProposal", { id, delta });

    const boardRect = boardEl.getBoundingClientRect();
    const rect = node.getBoundingClientRect();

    const cellW = boardRect.width / cols;
    const cellH = boardRect.height / rows;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const row0 = Math.floor((cy - boardRect.top) / cellH);
    const col0 = Math.floor((cx - boardRect.left) / cellW);

    const row1 = row0 + delta.dr;
    const col1 = col0 + delta.dc;

    log("proposalCells", { row0, col0, row1, col1 });

    boardEl.dispatchEvent(
      new CustomEvent("pips:drop:proposal", {
        bubbles: true,
        detail: {
          proposal: { id, row0, col0, row1, col1 }
        }
      })
    );
  }

  // ------------------------------------------------------------
  // Wiring
  // ------------------------------------------------------------
  document.addEventListener("pointerdown", pointerDown);
  document.addEventListener("pointermove", pointerMove);
  document.addEventListener("pointerup", pointerUp);
}
