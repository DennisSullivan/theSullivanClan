// ============================================================
// FILE: dragDrop.js
// PURPOSE: Clean, minimal drag system for tray → board moves.
//          Clone follows cursor; original wrapper hidden until
//          drop outcome is known. No geometry or placement logic.
// ============================================================

export function installDragDrop(boardEl, trayEl, dominos, onDrop) {
  let dragState = {
    domino: null,
    wrapper: null,
    clone: null,
    fromTray: false,
    moved: false,
    startX: 0,
    startY: 0
  };

  // ------------------------------------------------------------
  // Pointer down: detect wrapper + domino
  // ------------------------------------------------------------
  function pointerDown(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const domino = dominos.get(id);
    if (!domino) return;

    dragState.domino = domino;
    dragState.wrapper = wrapper;
    dragState.fromTray = wrapper.classList.contains("in-tray");
    dragState.moved = false;

    dragState.startX = ev.clientX;
    dragState.startY = ev.clientY;

    wrapper.setPointerCapture(ev.pointerId);
  }

  // ------------------------------------------------------------
  // Pointer move: begin real drag on first movement
  // ------------------------------------------------------------
  function pointerMove(ev) {
    const { domino, wrapper, clone, startX, startY } = dragState;
    if (!domino || !wrapper) return;

    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;

    // Threshold to begin real drag
    if (!dragState.clone && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      beginRealDrag(domino, wrapper, startX, startY);
    }

    // Move clone
    if (dragState.clone) {
      dragState.moved = true;
      dragState.clone.style.left = `${ev.clientX}px`;
      dragState.clone.style.top = `${ev.clientY}px`;
    }
  }

  // ------------------------------------------------------------
  // Pointer up: finalize drag
  // ------------------------------------------------------------
  function pointerUp(ev) {
    const { domino, wrapper, clone, fromTray, moved } = dragState;
    if (!domino || !wrapper) return;

    // Remove clone
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }

    // If not moved, restore tray wrapper
    if (fromTray && !moved) {
      wrapper.style.visibility = "";
    }

    // If moved, perform drop
    if (moved) {
      const dropX = ev.clientX;
      const dropY = ev.clientY;
      onDrop(domino, dropX, dropY);
      // wrapper stays hidden; boardRenderer will create a new one
    }

    // Reset
    dragState.domino = null;
    dragState.wrapper = null;
    dragState.clone = null;
  }

  // ------------------------------------------------------------
  // Begin real drag: hide original, create clone
  // ------------------------------------------------------------
  function beginRealDrag(domino, wrapper, startX, startY) {
    wrapper.style.visibility = "hidden";

    const clone = wrapper.cloneNode(true);
    clone.classList.remove("in-tray");
    clone.classList.add("domino-clone");

    clone.style.position = "fixed";
    clone.style.left = `${startX}px`;
    clone.style.top = `${startY}px`;
    clone.style.visibility = "visible";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = 9999;

    document.body.appendChild(clone);
    dragState.clone = clone;
  }

  // ------------------------------------------------------------
  // Event wiring
  // ------------------------------------------------------------
  boardEl.addEventListener("pointerdown", pointerDown);
  trayEl.addEventListener("pointerdown", pointerDown);

  boardEl.addEventListener("pointermove", pointerMove);
  trayEl.addEventListener("pointermove", pointerMove);

  boardEl.addEventListener("pointerup", pointerUp);
  trayEl.addEventListener("pointerup", pointerUp);
}
