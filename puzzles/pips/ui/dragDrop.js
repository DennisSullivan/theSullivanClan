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

console.log("DEBUG capture before:", wrapper.hasPointerCapture(ev.pointerId));
try {
  wrapper.releasePointerCapture(ev.pointerId);
} catch (e) {}
    
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

//    wrapper.setPointerCapture(ev.pointerId);
  }

  // ------------------------------------------------------------
  // Pointer move
  // ------------------------------------------------------------
function pointerMove(ev) {
  const { domino, wrapper, startX, startY } = dragState;
  if (!domino || !wrapper) return;

  const dx = ev.clientX - startX;
  const dy = ev.clientY - startY;

  // Begin real drag
  if (!dragState.clone && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
    console.log("DRAG: threshold passed → beginRealDrag", { dx, dy });
    beginRealDrag(wrapper, startX, startY);
  }

  // Always read the live clone AFTER beginRealDrag may have run
  const liveClone = dragState.clone;
  console.log("DEBUG LIVE:", liveClone);

  if (liveClone) {
    dragState.moved = true;
    liveClone.style.left = `${ev.clientX - liveClone.offsetWidth / 2}px`;
    liveClone.style.top  = `${ev.clientY - liveClone.offsetHeight / 2}px`;

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
  function beginRealDrag(wrapper, startX, startY) {
    wrapper.style.visibility = "hidden";
  
console.log("DEBUG: wrapper.innerHTML before clone =", wrapper.innerHTML);
    const clone = wrapper.cloneNode(true);
  
    // Measure natural size
    const w = wrapper.offsetWidth;
    const h = wrapper.offsetHeight;
  
    // Explicitly size the clone so it is not tiny
    clone.style.width = `${w}px`;
    clone.style.height = `${h}px`;
  
    clone.style.transform = "none";
    clone.classList.remove("in-tray");
    clone.classList.add("domino-clone");
  
    clone.style.position = "fixed";
    clone.style.visibility = "hidden";   // hide until layout is stable
    clone.style.pointerEvents = "none";
    clone.querySelectorAll("*").forEach(el => el.style.pointerEvents = "none");
    clone.style.zIndex = 9999;
  
    document.body.appendChild(clone);
  
    // Force layout so clone subtree is fully realized
    clone.getBoundingClientRect();
  
    // Now safe to position and show
    clone.style.left = `${startX - w / 2}px`;
    clone.style.top  = `${startY - h / 2}px`;
    clone.style.visibility = "visible";
  
    dragState.clone = clone;
  
    console.log("DRAG: clone created");
  }

  // ------------------------------------------------------------
  // Event wiring
  // ------------------------------------------------------------
  boardEl.addEventListener("pointerdown", pointerDown);
  trayEl.addEventListener("pointerdown", pointerDown);

  boardEl.addEventListener("pointermove", pointerMove);
  trayEl.addEventListener("pointermove", pointerMove);

  document.addEventListener("pointerup", pointerUp);

  console.log("DRAG: installDragDrop complete");
}
