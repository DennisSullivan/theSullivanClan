/* ============================================================
   PIPS UI — DRAG & DROP INTERACTIONS 
   Purely visual / interaction layer
   ============================================================ */

let activeDomino = null;
let offsetX = 0;
let offsetY = 0;

/* ------------------------------------------------------------
   ENABLE DOMINO INTERACTIONS
   ------------------------------------------------------------ */
function enableDominoInteractions() {
  console.log("enableDominoInteractions CALLED");

  document.querySelectorAll(".domino").forEach(domino => {
    console.log("Attaching listeners to", domino);

    domino.addEventListener("mousedown", startDrag);
    domino.addEventListener("touchstart", startDrag, { passive: false });

    domino.addEventListener("click", onDominoClick);
  });

  document.addEventListener("mousemove", drag);
  document.addEventListener("touchmove", drag, { passive: false });

  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);
}

function onDominoClick(e) {
  const domino = e.currentTarget;

  console.log("CLICK FIRED", {
    active: rotationSession.active,
    sessionDomino: rotationSession.domino,
    clickedIndex: domino.dataset.index
  });

  if (!rotationSession.active) {
    startRotationSession(domino);
    return;
  }

  if (rotationSession.domino === domino) {
    rotateDomino(domino);
    return;
  }

  endRotationSession(rotationSession.domino);
  startRotationSession(domino);
}

function onDominoDragStart(domino) {
  endRotationSession(domino);
}

function onDominoDrop(domino) {
  endRotationSession(domino);
}

function onDominoSelect(newDomino) {
  if (currentDomino && currentDomino !== newDomino) {
    endRotationSession(currentDomino);
  }
}


/* ------------------------------------------------------------
   START DRAG (but do NOT kill rotation session yet)
   ------------------------------------------------------------ */
let dragState = null;

function startDrag(e) {
  const domino = e.currentTarget;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  dragState = {
    domino,
    startX: clientX,
    startY: clientY,
    dragging: false
  };
}

/* ------------------------------------------------------------
   DRAG MOVEMENT — detect real drag before ending rotation
   ------------------------------------------------------------ */
function drag(e) {
  if (!dragState) return;
  if (!activeDomino) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const dx = clientX - dragState.startX;
  const dy = clientY - dragState.startY;

  // Only start dragging after a small threshold
  if (!dragState.dragging && Math.abs(dx) + Math.abs(dy) > 3) {
    dragState.dragging = true;

    // NOW end rotation session — user is dragging, not clicking
    endRotationSession(dragState.domino);

    // Promote to activeDomino and begin actual drag
    activeDomino = dragState.domino;

    const preRect = activeDomino.getBoundingClientRect();
    offsetX = dragState.startX - preRect.left;
    offsetY = dragState.startY - preRect.top;

    const root = document.getElementById("pips-root");
    const rootRect = root.getBoundingClientRect();

    root.appendChild(activeDomino);
    activeDomino.style.position = "absolute";
    activeDomino.style.zIndex = 1000;
  }

  if (!dragState.dragging) return;

  const rootRect = document.getElementById("pips-root").getBoundingClientRect();
  activeDomino.style.left = `${clientX - offsetX - rootRect.left}px`;
  activeDomino.style.top = `${clientY - offsetY - rootRect.top}px`;
}


/* ------------------------------------------------------------
   END DRAG → TRY TO PLACE
   ------------------------------------------------------------ */
function drag(e) {
  if (!dragState) return;
  if (!activeDomino) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const dx = clientX - dragState.startX;
  const dy = clientY - dragState.startY;

  // Only start dragging after a small threshold
  if (!dragState.dragging && Math.abs(dx) + Math.abs(dy) > 3) {
    dragState.dragging = true;

    // NOW end rotation session — user is dragging, not clicking
    endRotationSession(dragState.domino);

    // Promote to activeDomino and begin actual drag
    activeDomino = dragState.domino;

    const preRect = activeDomino.getBoundingClientRect();
    offsetX = dragState.startX - preRect.left;
    offsetY = dragState.startY - preRect.top;

    const root = document.getElementById("pips-root");
    const rootRect = root.getBoundingClientRect();

    root.appendChild(activeDomino);
    activeDomino.style.position = "absolute";
    activeDomino.style.zIndex = 1000;
  }

  if (!dragState.dragging) return;

  const rootRect = document.getElementById("pips-root").getBoundingClientRect();
  activeDomino.style.left = `${clientX - offsetX - rootRect.left}px`;
  activeDomino.style.top = `${clientY - offsetY - rootRect.top}px`;
}
