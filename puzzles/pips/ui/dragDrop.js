// ============================================================
// FILE: dragDrop.js
// PURPOSE: Unified, stable drag/drop for tray + board.
// NOTES:
//   - Clone-based drag
//   - Wrapper hidden during drag, restored on pointerUp
//   - No pointer capture
//   - Global pointerup so drag always ends
//   - Defensive guards against race conditions
//   - Diagnostic-first logging
// ============================================================

export function installDragDrop(boardEl, trayEl) {

  const dragState = {
    active: false,
    domino: null,
    wrapper: null,
    clone: null,
    startX: 0,
    startY: 0,
    moved: false,
    fromTray: false
  };

  // ------------------------------------------------------------
  // pointerDown
  // ------------------------------------------------------------
  function pointerDown(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const fromTray = wrapper.classList.contains("in-tray");

    dragState.active = true;
    dragState.domino = { id };
    dragState.wrapper = wrapper;
    dragState.fromTray = fromTray;
    dragState.startX = ev.clientX;
    dragState.startY = ev.clientY;
    dragState.moved = false;

    console.log("DRAG: pointerDown", {
      id,
      fromTray,
      startX: dragState.startX,
      startY: dragState.startY
    });
  }

  // ------------------------------------------------------------
  // beginRealDrag
  // ------------------------------------------------------------
  function beginRealDrag(wrapper, startX, startY) {
    wrapper.style.visibility = "hidden";

    console.log("DEBUG: wrapper.innerHTML before clone =", wrapper.innerHTML);

    const clone = wrapper.cloneNode(true);

    const w = wrapper.offsetWidth;
    const h = wrapper.offsetHeight;

    clone.style.width = `${w}px`;
    clone.style.height = `${h}px`;
    clone.style.transform = "none";

    clone.classList.remove("in-tray");
    clone.classList.add("domino-clone");

    clone.style.position = "fixed";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.querySelectorAll("*").forEach(el => el.style.pointerEvents = "none");
    clone.style.zIndex = 9999;

    document.body.appendChild(clone);

    clone.getBoundingClientRect(); // force layout

    clone.style.left = `${startX - w / 2}px`;
    clone.style.top  = `${startY - h / 2}px`;
    clone.style.visibility = "visible";

    dragState.clone = clone;

    console.log("DRAG: clone created");
  }

  // ------------------------------------------------------------
  // pointerMove
  // ------------------------------------------------------------
  function pointerMove(ev) {
    if (!dragState.active) return;

    const wrapper = dragState.wrapper;
    if (!wrapper) return;

    const dx = ev.clientX - dragState.startX;
    const dy = ev.clientY - dragState.startY;

    // Threshold → begin real drag
    if (!dragState.clone && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
      console.log("DRAG: threshold passed → beginRealDrag", { dx, dy });
      beginRealDrag(wrapper, dragState.startX, dragState.startY);
    }

    // Clone may not exist yet (race guard)
    if (!dragState.clone) {
      console.log("DEBUG LIVE: null");
      return;
    }

    const clone = dragState.clone;
    console.log("DEBUG LIVE:", clone);

    dragState.moved = true;

    clone.style.left = `${ev.clientX - clone.offsetWidth / 2}px`;
    clone.style.top  = `${ev.clientY - clone.offsetHeight / 2}px`;

    console.log("DRAG: cloneMove", {
      id: dragState.domino.id,
      x: ev.clientX,
      y: ev.clientY
    });
  }

  // ------------------------------------------------------------
  // pointerUp
  // ------------------------------------------------------------
  function pointerUp(ev) {
    if (!dragState.active) return;

    console.log("DRAG: pointerUp", {
      id: dragState.domino?.id,
      fromTray: dragState.fromTray,
      moved: dragState.moved
    });

    // Remove clone
    if (dragState.clone) {
      dragState.clone.remove();
      console.log("DRAG: clone removed");
    }

    // Restore wrapper visibility
    if (dragState.wrapper) {
      dragState.wrapper.style.visibility = "visible";
    }

    // Fire drop event if moved
    if (dragState.moved) {
      const dropX = ev.clientX;
      const dropY = ev.clientY;

      console.log("DRAG: firing pips:drop", {
        id: dragState.domino.id,
        dropX,
        dropY
      });

      const dropEvent = new CustomEvent("pips:drop", {
        detail: {
          id: dragState.domino.id,
          fromTray: dragState.fromTray,
          dropX,
          dropY
        }
      });

      document.dispatchEvent(dropEvent);
    }

    // Reset state
    dragState.active = false;
    dragState.domino = null;
    dragState.wrapper = null;
    dragState.clone = null;
    dragState.moved = false;
  }

  // ------------------------------------------------------------
  // Event wiring
  // ------------------------------------------------------------
  boardEl.addEventListener("pointerdown", pointerDown);
  trayEl.addEventListener("pointerdown", pointerDown);

  boardEl.addEventListener("pointermove", pointerMove);
  trayEl.addEventListener("pointermove", pointerMove);

  // Global pointerup so drag always ends
  document.addEventListener("pointerup", pointerUp);

  console.log("DRAG: installDragDrop complete");
}
