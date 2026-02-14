// ============================================================
// FILE: dragDrop.js
// PURPOSE: Clean drag system with medium‑verbosity diagnostics.
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
  // Pointer down
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

    console.log("DRAG: pointerDown", {
      id,
      fromTray: dragState.fromTray,
      startX: dragState.startX,
      startY: dragState.startY
    });

    wrapper.setPointerCapture(ev.pointerId);
  }

  // ------------------------------------------------------------
  // Pointer move
  // ------------------------------------------------------------
  function pointerMove(ev) {
    const { domino, wrapper, clone, startX, startY } = dragState;
    if (!domino || !wrapper) return;

    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;

    // Begin real drag
    if (!clone && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
      console.log("DRAG: threshold passed → beginRealDrag", { dx, dy });
      beginRealDrag(domino, wrapper, startX, startY);
    }

    // Move clone
    if (dragState.clone) {
      dragState.moved = true;
      clone.style.left = `${ev.clientX - clone.offsetWidth / 2}px`;
      clone.style.top = `${ev.clientY - clone.offsetHeight / 2}px`;

      console.log("DRAG: cloneMove", {
        id: domino.id,
        x: ev.clientX,
        y: ev.clientY
      });
    }
  }

  // ------------------------------------------------------------
  // Pointer up
  // ------------------------------------------------------------
  function pointerUp(ev) {
    const { domino, wrapper, clone, fromTray, moved } = dragState;
    if (!domino || !wrapper) return;

    console.log("DRAG: pointerUp", {
      id: domino.id,
      fromTray,
      moved
    });

    // Remove clone
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone);
      console.log("DRAG: clone removed");
    }

    // If not moved, restore tray wrapper
    if (fromTray && !moved) {
      wrapper.style.visibility = "";
      console.log("DRAG: restored tray wrapper (no movement)");
    }

    // If moved, fire drop event
    if (moved) {
      const dropX = ev.clientX;
      const dropY = ev.clientY;

      console.log("DRAG: firing pips:drop", {
        id: domino.id,
        dropX,
        dropY
      });

      onDrop(domino, dropX, dropY);
    }

    // Reset
    dragState.domino = null;
    dragState.wrapper = null;
    dragState.clone = null;
  }

  // ------------------------------------------------------------
  // Begin real drag
  // ------------------------------------------------------------
  function beginRealDrag(domino, wrapper, startX, startY) {
    console.log("DRAG: beginRealDrag", {
      id: domino.id,
      fromTray: dragState.fromTray
    });
  
    wrapper.style.visibility = "hidden";
    console.log("DRAG: wrapper hidden", { id: domino.id });
  
    const clone = wrapper.cloneNode(true);
  
    // ⭐ Measure size so we can center the clone under the pointer
    const w = wrapper.offsetWidth;
    const h = wrapper.offsetHeight;
  
    // Apply the domino's actual orientation (0, 90, 180, 270)
    const angle = domino.orientation || 0;
    clone.style.transform = `rotate(${angle}deg)`;
    clone.style.removeProperty("transform-origin");
  
    // Force natural size
    clone.style.width = w + "px";
    clone.style.height = h + "px";
  
    clone.classList.remove("in-tray");
    clone.classList.add("domino-clone");
  
    clone.style.position = "fixed";
  
    // ⭐ Center the clone under the pointer
    clone.style.left = `${startX - w / 2}px`;
    clone.style.top = `${startY - h / 2}px`;
  
    clone.style.visibility = "visible";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = 9999;
  
    document.body.appendChild(clone);
    dragState.clone = clone;
  
    console.log("DRAG: clone created", {
      id: domino.id,
      x: startX,
      y: startY
    });
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

  console.log("DRAG: installDragDrop complete");
}
