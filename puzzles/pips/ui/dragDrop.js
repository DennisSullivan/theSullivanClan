// ============================================================
// FILE: ui/dragDrop.js
// PURPOSE: Pointer‑centered drag/drop with continuous ghost.
//          Contract‑clean. Two‑element DOM model compliant.
//          Instrumented (phase, snapshot, ghost, dispatch).
// ============================================================

import { isRotationSessionActive } from "./rotation.js";

let dragDropPhase = "Idle";   // Idle | Pending | Dragging

function logStateChange(from, to, detail = {}) {
  console.log(
    `%cSTATE ${from} → ${to}`,
    'color:#0a0;font-weight:bold;',
    detail
  );
}

export function isDragDropActive() {
  return dragDropPhase !== "Idle";
}

export function installDragDrop({ boardEl, trayEl, rows, cols }) {
  const DragThreshold = 20;

  // ------------------------------------------------------------
  // Instrumentation (contract‑clean)
  // ------------------------------------------------------------
  function logPhase(label, data = {}) {
//    console.log(`dragDrop:${label}`, data);
  }

  function logSnapshot(snap) {
    console.log("dragDrop:snapshot", {
      id: snap.id,
      source: snap.source,
      row0: snap.row0,
      col0: snap.col0,
      row1: snap.row1,
      col1: snap.col1
    });
  }

  function logGhost(ghost) {
    if (!ghost) {
      console.log("dragDrop:ghost:null");
      return;
    }
/*    console.log("dragDrop:ghost", {
      id: ghost.id,
      row0: ghost.row0,
      col0: ghost.col0,
      row1: ghost.row1,
      col1: ghost.col1
    }); */
  }

  function logDispatch(type, detail) {
    console.log(`dragDrop:dispatch:${type}`, detail);
  }

  // ------------------------------------------------------------
  const state = {
    phase: "Idle",        // Idle | Pending | Dragging
    pointerId: null,
    wrapper: null,
    startX: 0,
    startY: 0,

    snapshot: null,       // { id, (row0,col0), (row1,col1), pointerOffset:{dx,dy} }
    clone: null,

    ghost: null           // { id,row0,col0,row1,col1 } or null
  };

  // ------------------------------------------------------------
  function distance(x0, y0, x1, y1) {
    return Math.hypot(x1 - x0, y1 - y0);
  }

  function reset() {
    logPhase("reset");

    if (state.clone) state.clone.remove();
    state.phase = "Idle";
    dragDropPhase = "Idle";
    logStateChange("Something", "Idle", { id: wrapper.dataset.dominoId });
    state.pointerId = null;
    state.wrapper = null;
    state.startX = 0;
    state.startY = 0;
    state.snapshot = null;
    state.clone = null;
    state.ghost = null;
  }

  function applyCloneGeometryAndOrientation(clone, row0, col0, row1, col1) {
    clone.dataset.row0 = String(row0);
    clone.dataset.col0 = String(col0);
    clone.dataset.row1 = String(row1);
    clone.dataset.col1 = String(col1);

    const sameRow = row0 === row1;
    const sameCol = col0 === col1;

    clone.style.setProperty("--row-span", sameCol ? "2" : "1");
    clone.style.setProperty("--col-span", sameRow ? "2" : "1");

    const inner = clone.querySelector(".domino");
    if (!inner) return;

    inner.classList.remove(
      "domino-horizontal",
      "domino-vertical",
      "half0-right",
      "half0-bottom"
    );

    const colDelta = Math.abs(col0 - col1);
    const rowDelta = Math.abs(row0 - row1);

    const isHorizontal = sameRow && colDelta === 1;
    const isVertical = sameCol && rowDelta === 1;

    if (isHorizontal) {
      inner.classList.add("domino-horizontal");
      if (col0 > col1) inner.classList.add("half0-right");
    } else if (isVertical) {
      inner.classList.add("domino-vertical");
      if (row0 > row1) inner.classList.add("half0-bottom");
    }
  }

  // ------------------------------------------------------------
  function getDominoCenterScreen(wrapper) {
    const r = wrapper.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };
  }

  // ------------------------------------------------------------
  function createClone(wrapper, centerScreen) {
    const clone = wrapper.cloneNode(true);
    clone.classList.add("domino-drag-clone");

    clone.style.left = `${centerScreen.x}px`;
    clone.style.top = `${centerScreen.y}px`;

    clone.style.transform = "";
    clone.style.removeProperty("transform");
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
      logGhost(null);
      return;
    }

    const dr = snap.row1 - snap.row0;
    const dc = snap.col1 - snap.col0;

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
      logGhost(null);
      return;
    }

    const cellW = boardRect.width / cols;
    const cellH = boardRect.height / rows;

    let rowCenter, colCenter;

    if (dr === 0) {
      rowCenter = Math.floor((centerScreen.y - boardRect.top) / cellH);
      colCenter = Math.floor(
        (centerScreen.x - boardRect.left + cellW / 2) / cellW
      );
    } else {
      rowCenter = Math.floor(
        (centerScreen.y - boardRect.top + cellH / 2) / cellH
      );
      colCenter = Math.floor((centerScreen.x - boardRect.left) / cellW);
    }

    const row0 = rowCenter - (dr > 0 ? 1 : 0);
    const col0 = colCenter - (dc > 0 ? 1 : 0);
    const row1 = row0 + dr;
    const col1 = col0 + dc;

    const valid =
      row0 >= 0 && row0 < rows &&
      col0 >= 0 && col0 < cols &&
      row1 >= 0 && row1 < rows &&
      col1 >= 0 && col1 < cols;

    state.ghost = valid
      ? { id: snap.id, row0, col0, row1, col1 }
      : null;

    logGhost(state.ghost);
  }

  // ------------------------------------------------------------
  // Pointer handlers
  // ------------------------------------------------------------
  function pointerDown(ev) {
    if (state.phase !== "Idle") return;

    const wrapper = ev.target.closest(".domino-wrapper");
    logPhase("pointerDown", { wrapper: !!wrapper });

    if (!wrapper) return;
    if (boardEl.contains(wrapper) && isRotationSessionActive()) return;
    if (!trayEl.contains(wrapper) && !boardEl.contains(wrapper)) return;

    state.phase = "Pending";
    dragDropPhase = "Pending";
    logStateChange("Idle", "Pending", { id: wrapper.dataset.dominoId });
    state.pointerId = ev.pointerId;
    state.wrapper = wrapper;
    state.startX = ev.clientX;
    state.startY = ev.clientY;
  }

  // --------------------
  function beginDrag(ev) {
    logPhase("beginDrag");

    const wrapper = state.wrapper;

    let row0, col0, row1, col1;

    if (trayEl.contains(wrapper)) {
      const o = Number(wrapper.dataset.trayOrientation) || 0;

      row0 = 100;
      col0 = 100;

      if (o === 0)       { row1 = row0;     col1 = col0 + 1; }
      else if (o === 90) { row1 = row0 + 1; col1 = col0;     }
      else if (o === 180){ row1 = row0;     col1 = col0 - 1; }
      else               { row1 = row0 - 1; col1 = col0;     }

    } else if (boardEl.contains(wrapper)) {
      const d = wrapper.dataset;
      row0 = Number(d.row0);
      col0 = Number(d.col0);
      row1 = Number(d.row1);
      col1 = Number(d.col1);
    }

    if (![row0, col0, row1, col1].every(Number.isFinite)) return reset();

    const centerScreen = { x: ev.clientX, y: ev.clientY };
    const pointerOffset = { dx: 0, dy: 0 };
    const source = trayEl.contains(wrapper) ? "tray" : "board";

    state.snapshot = {
      id: String(wrapper.dataset.dominoId),
      source,
      row0, col0,
      row1, col1,
      pointerOffset
    };

    logSnapshot(state.snapshot);

    document.body.setPointerCapture(ev.pointerId);

    state.clone = createClone(wrapper, centerScreen);
    applyCloneGeometryAndOrientation(state.clone, row0, col0, row1, col1);

    state.phase = "Dragging";
    dragDropPhase = "Dragging";
    logStateChange("Pending", "Dragging", { id: wrapper.dataset.dominoId });

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

    logPhase("pointerMove");

    const { dx, dy } = state.snapshot.pointerOffset;
    state.clone.style.left = `${ev.clientX - dx}px`;
    state.clone.style.top  = `${ev.clientY - dy}px`;

    updateGhost(ev);
  }

  function pointerUp(ev) {
    if (ev.pointerId !== state.pointerId) return;

    logPhase("pointerUp", {
      phase: state.phase,
      ghost: !!state.ghost,
      source: state.snapshot?.source
    });

    try { document.body.releasePointerCapture(ev.pointerId); } catch {}

    if (state.phase === "Dragging") {
      if (state.ghost) {
        logStateChange("Dragging", "Idle:Commit", state.ghost);
        logDispatch("pips:drop:proposal", state.ghost);
        boardEl.dispatchEvent(
          new CustomEvent("pips:drop:proposal", {
            bubbles: true,
            detail: { proposal: state.ghost }
          })
        );
      } else if (state.snapshot?.source === "board") {
        logDispatch("pips:return-to-tray", { id: state.snapshot.id });
        boardEl.dispatchEvent(
          logStateChange("Dragging", "Idle:Commit", state.ghost);
          new CustomEvent("pips:return-to-tray", {
            bubbles: true,
            detail: { id: state.snapshot.id }
          })
        );
      }
    }

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
