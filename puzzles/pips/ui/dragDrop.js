// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Contract‑clean drag/drop with continuous ghost.
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
    const r0 = Number(d.row0 ?? d.half0Row);
    const c0 = Number(d.col0 ?? d.half0Col);
    const r1 = Number(d.row1 ?? d.half1Row);
    const c1 = Number(d.col1 ?? d.half1Col);
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
  function getHalf0Screen(wrapper) {
    const x = Number(wrapper.dataset.half0ScreenX);
    const y = Number(wrapper.dataset.half0ScreenY);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };

    const r = wrapper.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function createClone(wrapper, half0Screen) {
    const clone = wrapper.cloneNode(true);
    clone.style.all = "unset";
    clone.style.position = "fixed";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = 9999;

    const rect = wrapper.getBoundingClientRect();
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;

    clone.style.left = `${half0Screen.x}px`;
    clone.style.top = `${half0Screen.y}px`;
    clone.style.transform = "translate(-50%, -50%)";

    document.body.appendChild(clone);
    return clone;
  }

  // ------------------------------------------------------------
  // Continuous ghost computation
  // ------------------------------------------------------------
  function updateGhost(ev) {
    const snap = state.snapshot;
    if (!snap) {
      state.ghost = null;
      return;
    }

    const { dx, dy } = snap.pointerOffset;
    const half0Screen = {
      x: ev.clientX - dx,
      y: ev.clientY - dy
    };

    const boardRect = boardEl.getBoundingClientRect();
    const inside =
      half0Screen.x >= boardRect.left &&
      half0Screen.x <= boardRect.right &&
      half0Screen.y >= boardRect.top &&
      half0Screen.y <= boardRect.bottom;

    if (!inside) {
      state.ghost = null;
      return;
    }

    const cellW = boardRect.width / cols;
    const cellH = boardRect.height / rows;

    const row0 = Math.floor((half0Screen.y - boardRect.top) / cellH);
    const col0 = Math.floor((half0Screen.x - boardRect.left) / cellW);
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

    const half0Screen = getHalf0Screen(wrapper);
    const pointerOffset = {
      dx: ev.clientX - half0Screen.x,
      dy: ev.clientY - half0Screen.y
    };

    state.snapshot = {
      id: String(wrapper.dataset.dominoId),
      delta,
      pointerOffset
    };

    document.body.setPointerCapture(ev.pointerId);
    state.clone = createClone(wrapper, half0Screen);
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

    state.clone.style.left = `${ev.clientX}px`;
    state.clone.style.top = `${ev.clientY}px`;

    updateGhost(ev);
  }

  function pointerUp(ev) {
    if (ev.pointerId !== state.pointerId) return;

    if (state.phase === "Dragging" && state.ghost) {
      console.log("state.ghost", state.ghost);
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
