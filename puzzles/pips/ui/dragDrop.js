// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Drag/drop interaction → Validator-gated preview + commit.
// CONTRACT ENFORCEMENT:
//   - Idle preserved until DragThreshold exceeded (20px, Euclidean)
//   - Geometry snapshot frozen at drag start (bridge tray once)
//   - Clone is visual-only and snapshot-driven (no tray CSS inheritance)
//   - No local snapping; validator is sole authority for preview/commit
//   - Explicit cancel vs commit; no ghost → cancel
// ============================================================

export function installDragDrop({ boardEl, trayEl }) {
  const DragThreshold = 20;

  const state = {
    phase: "Idle", // Idle | Pending | Dragging
    pointerId: null,
    wrapper: null,

    startX: 0,
    startY: 0,

    // Frozen at drag start
    snapshot: null, // { id, delta:{dr,dc}, half0Screen:{x,y}, pointerOffset:{dx,dy} }

    clone: null,

    // Validator-driven preview
    ghost: null,        // canonical geometry from validator
    ghostValid: false
  };

  // ------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------
  function normDeg(deg) {
    return ((Number(deg) || 0) % 360 + 360) % 360;
  }

  function deltaFromTrayOrientation(trayOrientationDeg) {
    const o = normDeg(trayOrientationDeg);
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

  // Canonical half0 screen anchor must come from renderer contract.
  // This implementation assumes wrapper exposes a canonical anchor via data attributes.
  function getHalf0Screen(wrapper) {
    const x = Number(wrapper.dataset.half0ScreenX);
    const y = Number(wrapper.dataset.half0ScreenY);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };

    // Fallback: center of wrapper (renderer should provide canonical anchors).
    const r = wrapper.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function distance(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    return Math.hypot(dx, dy);
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
    state.ghostValid = false;
  }

  // ------------------------------------------------------------
  // Clone creation (snapshot-driven; no tray CSS inheritance)
  // ------------------------------------------------------------
  function createCloneFromSnapshot(wrapper, half0Screen) {
    const clone = wrapper.cloneNode(true);

    // Strip layout/transform inheritance
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
  // Validator bridge (preview + commit)
  // ------------------------------------------------------------
  function requestPreview(pointerX, pointerY) {
    const { id, delta, pointerOffset } = state.snapshot;
    const half0Screen = {
      x: pointerX - pointerOffset.dx,
      y: pointerY - pointerOffset.dy
    };

    boardEl.dispatchEvent(
      new CustomEvent("pips:drag:preview", {
        bubbles: true,
        detail: { id, delta, half0Screen }
      })
    );
  }

  function commitIfValid() {
    if (!state.ghostValid || !state.ghost) return false;
    boardEl.dispatchEvent(
      new CustomEvent("pips:drag:commit", {
        bubbles: true,
        detail: { ghost: state.ghost }
      })
    );
    return true;
  }

  // Host listens and responds with validator output
  boardEl.addEventListener("pips:drag:preview:result", (ev) => {
    state.ghost = ev.detail?.ghost ?? null;
    state.ghostValid = Boolean(ev.detail?.valid);
  });

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

    // Bridge geometry once at drag start
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
      id: wrapper.dataset.dominoId,
      delta,
      half0Screen,
      pointerOffset
    };

    document.body.setPointerCapture(ev.pointerId);
    state.clone = createCloneFromSnapshot(wrapper, half0Screen);
    state.phase = "Dragging";
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

    // Move clone
    state.clone.style.left = `${ev.clientX}px`;
    state.clone.style.top = `${ev.clientY}px`;

    // Request validator-driven preview
    requestPreview(ev.clientX, ev.clientY);
  }

  function pointerUp(ev) {
    if (ev.pointerId !== state.pointerId) return;

    if (state.phase === "Dragging") {
      commitIfValid();
    }

    try { document.body.releasePointerCapture(ev.pointerId); } catch {}
    reset();
  }

  function pointerCancel(ev) {
    if (ev.pointerId !== state.pointerId) return;
    reset();
  }

  // ------------------------------------------------------------
  // Wiring
  // ------------------------------------------------------------
  document.addEventListener("pointerdown", pointerDown);
  document.addEventListener("pointermove", pointerMove);
  document.addEventListener("pointerup", pointerUp);
  document.addEventListener("pointercancel", pointerCancel);
}
