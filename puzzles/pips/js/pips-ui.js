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
  document.querySelectorAll(".domino").forEach(domino => {
    domino.addEventListener("mousedown", startDrag);
    domino.addEventListener("touchstart", startDrag, { passive: false });
  });

   document.addEventListener("mousemove", drag);
   document.addEventListener("touchmove", drag, { passive: false });

   document.addEventListener("mouseup", endDrag);
   document.addEventListener("touchend", endDrag);
}

/* ------------------------------------------------------------
   START DRAG
   ------------------------------------------------------------ */
function startDrag(e) {
  e.preventDefault();

  activeDomino = e.currentTarget;

  const parent = activeDomino.parentElement;
  const cameFromBoard =
    parent.classList.contains("pips-cell") || parent.id === "pips-root";

  activeDomino.dataset.origin = cameFromBoard ? "board" : "tray";

  if (activeDomino.dataset.origin === "board") {
    activeDomino.dataset.prevRow = activeDomino.dataset.boardRow || "";
    activeDomino.dataset.prevCol = activeDomino.dataset.boardCol || "";
    activeDomino.dataset.prevOrientation =
      activeDomino.dataset.boardOrientation || "";
  }

  activeDomino.dataset.originalLeft = activeDomino.style.left || "";
  activeDomino.dataset.originalTop = activeDomino.style.top || "";
  activeDomino.dataset.originalParent = parent.id || "";

  Object.keys(boardOccupancy).forEach(key => {
    if (boardOccupancy[key] === activeDomino) {
      delete boardOccupancy[key];
    }
  });
  logBoardOccupancy();

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const preRect = activeDomino.getBoundingClientRect();
  offsetX = clientX - preRect.left;
  offsetY = clientY - preRect.top;

  const root = document.getElementById("pips-root");
  const rootRect = root.getBoundingClientRect();

  root.appendChild(activeDomino);

  activeDomino.style.position = "absolute";
  activeDomino.style.zIndex = 1000;
  activeDomino.style.left = `${clientX - offsetX - rootRect.left}px`;
  activeDomino.style.top = `${clientY - offsetY - rootRect.top}px`;

  highlightPossibleCells(activeDomino);
}


/* ------------------------------------------------------------
   DRAG MOVEMENT
   ------------------------------------------------------------ */
function drag(e) {
  if (!activeDomino) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const rootRect = document.getElementById("pips-root").getBoundingClientRect();

  activeDomino.style.left = `${clientX - offsetX - rootRect.left}px`;
  activeDomino.style.top = `${clientY - offsetY - rootRect.top}px`;
}


/* ------------------------------------------------------------
   END DRAG → TRY TO PLACE
   ------------------------------------------------------------ */
function endDrag(e) {
  if (!activeDomino) return;

  clearHighlights();

  const placed = tryPlaceDomino(activeDomino);

  if (placed) {
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
    const home = document.getElementById(activeDomino.dataset.homeSlot);
    home.appendChild(activeDomino);

    activeDomino.style.position = "";
    activeDomino.style.left = "";
    activeDomino.style.top = "";
    activeDomino.style.zIndex = "";

    delete activeDomino.dataset.boardRow;
    delete activeDomino.dataset.boardCol;
    delete activeDomino.dataset.boardOrientation;
  }

  activeDomino = null;
}


/* ============================================================
   HIGHLIGHTING
   ============================================================ */

function highlightPossibleCells(domino) {
  const grid = document.getElementById("pips-root");
  if (!grid) return;

  const cells = grid.querySelectorAll(".pips-cell");
  cells.forEach(cell => cell.classList.add("cell-highlight"));
}

function clearHighlights() {
  document
    .querySelectorAll(".cell-highlight")
    .forEach(c => c.classList.remove("cell-highlight"));
}
