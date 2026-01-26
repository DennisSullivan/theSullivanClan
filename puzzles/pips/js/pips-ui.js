/* ============================================================
   PIPS UI — DRAG & DROP INTERACTIONS 
   Purely visual / interaction layer
   ============================================================ */

let activeDomino = null;
let offsetX = 0;
let offsetY = 0;

let highlightedCells = [];

function clearHighlights() {
  highlightedCells.forEach(cell => {
    cell.classList.remove("cell-highlight-valid", "cell-highlight-invalid");
  });
  highlightedCells = [];
}

function highlightCells(cells, isValid) {
  clearHighlights();
  cells.forEach(([r, c]) => {
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell) {
      cell.classList.add(isValid ? "cell-highlight-valid" : "cell-highlight-invalid");
      highlightedCells.push(cell);
    }
  });
}

let selectedDomino = null;

function selectDomino(domino) {
  if (selectedDomino && selectedDomino !== domino) {
    selectedDomino.classList.remove("domino-selected");
  }
  selectedDomino = domino;
  selectedDomino.classList.add("domino-selected");
}

function clearSelection() {
  if (selectedDomino) {
    selectedDomino.classList.remove("domino-selected");
    selectedDomino = null;
  }
}

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
  selectDomino(domino);

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

  if (!dragState.dragging && Math.abs(dx) + Math.abs(dy) > 3) {
    dragState.dragging = true;

    activeDomino = dragState.domino;

    const preRect = activeDomino.getBoundingClientRect();
    offsetX = dragState.startX - preRect.left;
    offsetY = dragState.startY - preRect.top;

    const root = document.getElementById("pips-root");
    root.appendChild(activeDomino);
    activeDomino.style.position = "absolute";
    activeDomino.style.zIndex = 1000;
  }

  if (!dragState.dragging) return;

  const root = document.getElementById("pips-root");
  const rootRect = root.getBoundingClientRect();

  activeDomino.style.left = `${clientX - offsetX - rootRect.left}px`;
  activeDomino.style.top = `${clientY - offsetY - rootRect.top}px`;

  const rect = activeDomino.getBoundingClientRect();
  const boardX = rect.left - rootRect.left;
  const boardY = rect.top - rootRect.top;

  const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"));
  const cellGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"));
  const step = cellSize + cellGap;

  const col = Math.round(boardX / step);
  const row = Math.round(boardY / step);

  const orientation = activeDomino.classList.contains("vertical") ? "vertical" : "horizontal";

  const cells =
    orientation === "vertical"
      ? [
          [row, col],
          [row + 1, col]
        ]
      : [
          [row, col],
          [row, col + 1]
        ];

  const sim = activeDomino.cloneNode(true);
  sim.dataset.boardRow = row;
  sim.dataset.boardCol = col;
  sim.dataset.boardOrientation = orientation;

  const valid = validateGridPlacement(row, col, orientation, sim, { simulate: true });

  highlightCells(cells, valid);
}

/* ------------------------------------------------------------
   END DRAG → TRY TO PLACE
   ------------------------------------------------------------ */
function endDrag(e) {
  clearHighlights();
  clearSelection();
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
   
     // Reset positioning so flexbox can center it
     activeDomino.style.position = "";
     activeDomino.style.left = "";
     activeDomino.style.top = "";
     activeDomino.style.zIndex = "";
     activeDomino.style.margin = "auto";
   
     // Reset orientation for tray consistency
     activeDomino.classList.remove("horizontal", "vertical");
     activeDomino.classList.add("horizontal");
   
     delete activeDomino.dataset.boardRow;
     delete activeDomino.dataset.boardCol;
     delete activeDomino.dataset.boardOrientation;
  }

  dragState = null;
  activeDomino = null;
}
