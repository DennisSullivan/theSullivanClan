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

    // NYT: single-click does NOT rotate
    domino.addEventListener("click", onDominoClick);

    // NYT: double-click rotates
    domino.addEventListener("dblclick", onDominoDoubleClick);
  });

  document.addEventListener("mousemove", drag);
  document.addEventListener("touchmove", drag, { passive: false });

  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);
}

/* ------------------------------------------------------------
   SINGLE CLICK — NYT DOES NOT ROTATE
   ------------------------------------------------------------ */
function onDominoClick(e) {
  const domino = e.currentTarget;

  console.log("Single-click: no rotation (NYT mode)");
  console.log("DOMINO PARENT:", domino.parentElement);
  console.log("PARENT CLASSES:", domino.parentElement ? domino.parentElement.className : null);
  console.log("BOARD ROW:", domino.dataset.boardRow);
  console.log("BOARD COL:", domino.dataset.boardCol);
  console.log("ORIGIN:", domino.dataset.origin);
}

/* ------------------------------------------------------------
   DOUBLE CLICK — ROTATE (NYT STYLE)
   ------------------------------------------------------------ */
function onDominoDoubleClick(e) {
  const domino = e.currentTarget;
  const clickX = e.clientX;
  const clickY = e.clientY;

  console.log("DOUBLE CLICK ROTATE", domino.dataset.index);

  rotateDomino(domino, clickX, clickY);
}

/* ------------------------------------------------------------
   START DRAG
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
   DRAG MOVEMENT
   ------------------------------------------------------------ */
function drag(e) {
  if (!dragState) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const dx = clientX - dragState.startX;
  const dy = clientY - dragState.startY;

  // Only start dragging after a small threshold
  if (!dragState.dragging && Math.abs(dx) + Math.abs(dy) > 3) {
    dragState.dragging = true;

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
function endDrag(e) {
  if (!dragState) return;

  if (!dragState.dragging) {
    dragState = null;
    return;
  }

  if (!activeDomino) return;

  const placed = tryPlaceDomino(activeDomino);

  if (placed) {
    dragState = null;
    activeDomino = null;
    return;
  }

  const cameFromBoard = activeDomino.dataset.origin === "board";
  const attempt = activeDomino.dataset.dropAttempt || "off-board";

  if (attempt === "invalid-on-board" && cameFromBoard) {
    const root = document.getElementById("pips-root");
    const rootRect = root.getBoundingClientRect();

    const prevRow = parseInt(activeDomino.dataset.prevRow, 10);
    const prevCol = parseInt(activeDomino.dataset.prevCol, 10);
    const prevOrientation = activeDomino.dataset.prevOrientation;

    const anchorCell = document.getElementById(`cell-${prevRow}-${prevCol}`);
    const anchorRect = anchorCell.getBoundingClientRect();

    activeDomino.style.left = `${anchorRect.left - rootRect.left}px`;
    activeDomino.style.top = `${anchorRect.top - rootRect.top}px`;

    const cells =
      prevOrientation === "vertical"
        ? [
            [prevRow, prevCol],
            [prevRow + 1, prevCol]
          ]
        : [
            [prevRow, prevCol],
            [prevRow, prevCol + 1]
          ];

    cells.forEach(([r, c]) => {
      boardOccupancy[`${r},${c}`] = activeDomino;
    });

    logBoardOccupancy();
  } else {
    clearDominoFromBoard(activeDomino);

    const home = document.getElementById(activeDomino.dataset.homeSlot);
    home.appendChild(activeDomino);

    activeDomino.style.position = "";
    activeDomino.style.left = "";
    activeDomino.style.top = "";
    activeDomino.style.zIndex = "";

    delete activeDomino.dataset.boardRow;
    delete activeDomino.dataset.boardCol;
    delete activeDomino.dataset.boardOrientation;

    activeDomino.classList.remove("horizontal", "vertical");
    activeDomino.classList.add("horizontal");
  }

  dragState = null;
  activeDomino = null;
}
