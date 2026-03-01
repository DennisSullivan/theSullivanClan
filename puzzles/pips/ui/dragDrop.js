// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Pointer‑centered drag/drop with continuous ghost.
//          Contract‑clean. Two‑element DOM model compliant.
// ============================================================

export function installDragDrop({ boardEl, trayEl, rows, cols }) {
  const DragThreshold = 20;

  const state = {
    phase: "Idle",        // Idle | Pending | Dragging
    pointerId: null,
    wrapper: null,
    startX: 0,
    startY: 0,

    snapshot: null,       // { id, delta:{dr,dc}, pointerOffset:{dx,dy} }
    clone: null,

    ghost: null           // { id,row0,col0,row1,col1 } or null
  };

  // ------------------------------------------------------------
  function normDeg(deg) {
    return ((Number(deg) || 0) % 360 + 360) % 360;
  }

  function deltaFromTrayOrientation(o) {
    o = normDeg(o);
    if (o === 0)   return { dr: 0,  dc: 1 };
    if (o === 90)  return { dr: 1,  dc: 0 };
    if (o === 180) return { dr: 0,  dc: -1 };
    return { dr: -1, dc: 0 };
  }

  function readBoardDelta(wrapper) {
    const d = wrapper.dataset;
    const r0 = Number(d.row0);
    const c0 = Number(d.col0);
    const r1 = Number(d.row1);
    const c1 = Number(d.col1);
    if (![r0, c0, r1, c1].every(Number.isFinite)) return null;
    return { dr: r1 - r0, dc: c1 - c0 };
  }

  function distance(x0, y0, x1, y1) {
    return Math.hypot(x1 - x0, y1 - y0);
  }

  function reset() {
    if (state.clone) state.clone.remove();
    state.phase = "Idle";
    state.pointerId = null;
    state.wrapper = null;
    state.startX = 0;
    state.startY = 0;
    state.snapshot = null;
    state.clone = null;
    state.ghost = null;
  }

  // ------------------------------------------------------------
  // Domino center in screen coordinates
  // ------------------------------------------------------------
  function getDominoCenterScreen(wrapper) {
    const r = wrapper.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };
  }

  // ------------------------------------------------------------
  // Clone creation (centered via CSS translate(-50%, -50%))
  // ------------------------------------------------------------
  function createClone(wrapper, centerScreen) {
    const clone = wrapper.cloneNode(true);
    clone.classList.add("domino-drag-clone");

    clone.style.left = `${centerScreen.x}px`;
    clone.style.top = `${centerScreen.y}px`;

    clone.classList.remove("in-tray", "on-board");

    document.body.appendChild(clone);
    return clone;
  }

  // ------------------------------------------------------------
  // Continuous ghost computation (center‑anchored)
  // ------------------------------------------------------------
  function updateGhost(ev) {
    const snap = state.snapshot;
    if (!snap) {
      state.ghost = null;
      return;
    }

    const { dx, dy } = snap.pointerOffset;
    const centerScreen = {
      x: ev.clientX - dx,
      y: ev.clientY - dy
    };

    const boardRect = boardEl.getBoundingClientRect();
    const inside =
      centerScreen.x >= boardRect.left &&
      centerScreen.x <= boardRect.right &&
      centerScreen.y >= boardRect.top &&
      centerScreen.y <= boardRect.bottom;

    if (!inside) {
      state.ghost = null;
      return;
    }

    const cellW = boardRect.width / cols;
    const cellH = boardRect.height / rows;

    const rowCenter = Math.floor((centerScreen.y - boardRect.top) / cellH);
    const colCenter = Math.floor((centerScreen.x - boardRect.left) / cellW);

    // Convert center → half0
    const row0 = rowCenter - Math.floor(snap.delta.dr / 2);
    const col0 = colCenter - Math.floor(snap.delta.dc / 2);
    const row1 = row0 + snap.delta.dr;
    const col1 = col0 + snap.delta.dc;

    const valid =
      row0 >= 0 && row0 < rows &&
      col0 >= 0 && col0 < cols &&
      row1 >= 0 && row1 < rows &&
      col1 >= 0 && col1 < cols;

    state.ghost = valid
      ? { id: snap.id, row0, col0, row1, col1 }
      : null;
  }

  // ------------------------------------------------------------
  // Pointer handlers
  // ------------------------------------------------------------
  function pointerDown(ev) {
    if (state.phase !== "Idle") return;

    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!trayEl.contains(wrapper) && !boardEl.contains(wrapper)) return;

    state.phase = "Pending";
    state.pointerId = ev.pointerId;
    state.wrapper = wrapper;
    state.startX = ev.clientX;
    state.startY = ev.clientY;
  }

  function beginDrag(ev) {
    const wrapper = state.wrapper;

    let delta = null;
    if (trayEl.contains(wrapper)) {
      delta = deltaFromTrayOrientation(wrapper.dataset.trayOrientation);
    } else if (boardEl.contains(wrapper)) {
      delta = readBoardDelta(wrapper);
    }
    if (!delta) return reset();

    const centerScreen = getDominoCenterScreen(wrapper);
    const pointerOffset = {
      dx: ev.clientX - centerScreen.x,
      dy: ev.clientY - centerScreen.y
    };

    state.snapshot = {
      id: String(wrapper.dataset.dominoId),
      delta,
      pointerOffset
    };

    document.body.setPointerCapture(ev.pointerId);
    state.clone = createClone(wrapper, centerScreen);
    state.phase = "Dragging";

    updateGhost(ev);
  }

  function pointerMove(ev) {
    if (ev.pointerId !== state.pointerId) return;

    if (state.phase === "Pending") {
      if (distance(state.startX, state.startY, ev.clientX, ev.clientY) > DragThreshold) {
        beginDrag(ev);
      }
      return;
    }

    if (state.phase !== "Dragging") return;

    const { dx, dy } = state.snapshot.pointerOffset;
    state.clone.style.left = `${ev.clientX - dx}px`;
    state.clone.style.top  = `${ev.clientY - dy}px`;

    updateGhost(ev);
  }

  function pointerUp(ev) {
    if (ev.pointerId !== state.pointerId) return;

    if (state.phase === "Dragging" && state.ghost) {
      boardEl.dispatchEvent(
        new CustomEvent("pips:drop:proposal", {
          bubbles: true,
          detail: { proposal: state.ghost }
        })
      );
    }

    try { document.body.releasePointerCapture(ev.pointerId); } catch {}
    reset();
  }

  function pointerCancel(ev) {
    if (ev.pointerId !== state.pointerId) return;
    reset();
  }

  // ------------------------------------------------------------
  document.addEventListener("pointerdown", pointerDown);
  document.addEventListener("pointermove", pointerMove);
  document.addEventListener("pointerup", pointerUp);
  document.addEventListener("pointercancel", pointerCancel);
}
