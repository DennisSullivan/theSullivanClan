/* ============================================================
   PIPS PUZZLE LOADER
   Puzzle lifecycle: build, load, restore, validate
   ============================================================ */


/* ------------------------------------------------------------
   CHECK WIN CONDITION
   ------------------------------------------------------------ */
function checkWin() {
  const keys = Object.keys(boardOccupancy);

  // Full 7×8 board = 56 cells = 28 dominos × 2
  if (keys.length !== 56) return false;

  for (const key of keys) {
    if (!boardOccupancy[key]) return false;
  }

  const dominoCellCount = {};
  for (const key of keys) {
    const dom = boardOccupancy[key];
    dominoCellCount[dom.dataset.index] =
      (dominoCellCount[dom.dataset.index] || 0) + 1;
  }

  for (const index in dominoCellCount) {
    if (dominoCellCount[index] !== 2) return false;
  }

  return true;
}


/* ------------------------------------------------------------
   SERIALIZE CURRENT BOARD STATE
   ------------------------------------------------------------ */
function serializeBoard() {
  const state = [];

  document.querySelectorAll(".domino").forEach(dom => {
    if (!dom.dataset.boardRow) return;

    state.push({
      index: dom.dataset.index,
      row: parseInt(dom.dataset.boardRow, 10),
      col: parseInt(dom.dataset.boardCol, 10),
      orientation: dom.dataset.boardOrientation
    });
  });

  return state;
}


/* ------------------------------------------------------------
   LOAD A SAVED BOARD STATE
   ------------------------------------------------------------ */
function loadBoardState(state) {
  Object.keys(boardOccupancy).forEach(key => delete boardOccupancy[key]);

  document.querySelectorAll(".domino").forEach(dom => {
    const home = document.getElementById(dom.dataset.homeSlot);
    home.appendChild(dom);

    dom.style.position = "";
    dom.style.left = "";
    dom.style.top = "";
    dom.style.zIndex = "";

    delete dom.dataset.boardRow;
    delete dom.dataset.boardCol;
    delete dom.dataset.boardOrientation;
  });

  const root = document.getElementById("pips-root");
  const rootRect = root.getBoundingClientRect();

  state.forEach(entry => {
    const dom = document.querySelector(`.domino[data-index="${entry.index}"]`);
    const anchor = document.getElementById(`cell-${entry.row}-${entry.col}`);
    const anchorRect = anchor.getBoundingClientRect();

    root.appendChild(dom);

    dom.style.position = "absolute";
    dom.style.left = `${anchorRect.left - rootRect.left}px`;
    dom.style.top = `${anchorRect.top - rootRect.top}px`;

    dom.dataset.boardRow = entry.row;
    dom.dataset.boardCol = entry.col;
    dom.dataset.boardOrientation = entry.orientation;

    const cells =
      entry.orientation === "vertical"
        ? [
            [entry.row, entry.col],
            [entry.row + 1, entry.col]
          ]
        : [
            [entry.row, entry.col],
            [entry.row, entry.col + 1]
          ];

    cells.forEach(([r, c]) => {
      boardOccupancy[`${r},${c}`] = dom;
    });
  });

  logBoardOccupancy();
}


/* ------------------------------------------------------------
   LOAD A PUZZLE
   ------------------------------------------------------------ */
function loadPuzzle(puzzle) {
  console.log(`Loading puzzle: ${puzzle.id} — ${puzzle.title}`);

  clearBoard();
  buildBoardFromPuzzle(puzzle);
  applyBlockedCells(puzzle);
  applyRegions(puzzle);
  applyStartingDominos(puzzle);

  logBoardOccupancy();
}


/* ------------------------------------------------------------
   CLEAR BOARD
   ------------------------------------------------------------ */
function clearBoard() {
  Object.keys(boardOccupancy).forEach(key => delete boardOccupancy[key]);

  const root = document.getElementById("pips-root");
  root.innerHTML = "";

  document.querySelectorAll(".domino").forEach(dom => {
    const home = document.getElementById(dom.dataset.homeSlot);
    home.appendChild(dom);

    dom.style.position = "";
    dom.style.left = "";
    dom.style.top = "";
    dom.style.zIndex = "";

    delete dom.dataset.boardRow;
    delete dom.dataset.boardCol;
    delete dom.dataset.boardOrientation;
  });
}


/* ------------------------------------------------------------
   BUILD BOARD FROM PUZZLE METADATA
   ------------------------------------------------------------ */
function buildBoardFromPuzzle(puzzle) {
  const root = document.getElementById("pips-root");
  root.style.setProperty("--rows", puzzle.height);
  root.style.setProperty("--cols", puzzle.width);

  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      const cell = document.createElement("div");
      cell.className = "pips-cell";
      cell.id = `cell-${r}-${c}`;
      cell.dataset.row = r;
      cell.dataset.col = c;
      root.appendChild(cell);
    }
  }
}


/* ------------------------------------------------------------
   APPLY BLOCKED CELLS
   ------------------------------------------------------------ */
function applyBlockedCells(puzzle) {
  if (!puzzle.blocked) return;

  puzzle.blocked.forEach(({ row, col }) => {
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (cell) {
      cell.classList.add("blocked");
      cell.style.visibility = "hidden";
    }
  });
}


/* ------------------------------------------------------------
   APPLY REGIONS
   ------------------------------------------------------------ */
function applyRegions(puzzle) {
  if (!puzzle.regions) return;

  puzzle.regions.forEach(region => {
    region.cells.forEach(({ row, col }) => {
      const cell = document.getElementById(`cell-${row}-${col}`);
      if (cell) {
        cell.dataset.region = region.id;
        cell.classList.add(`region-${region.id}`);
      }
    });
  });
}


/* ------------------------------------------------------------
   APPLY STARTING DOMINOS
   ------------------------------------------------------------ */
function applyStartingDominos(puzzle) {
  if (!puzzle.startingDominos) return;

  const root = document.getElementById("pips-root");
  const rootRect = root.getBoundingClientRect();

  puzzle.startingDominos.forEach(entry => {
    const dom = document.querySelector(`.domino[data-index="${entry.index}"]`);
    const anchor = document.getElementById(`cell-${entry.row}-${entry.col}`);
    const anchorRect = anchor.getBoundingClientRect();

    root.appendChild(dom);

    dom.style.position = "absolute";
    dom.style.left = `${anchorRect.left - rootRect.left}px`;
    dom.style.top = `${anchorRect.top - rootRect.top}px`;

    dom.dataset.boardRow = entry.row;
    dom.dataset.boardCol = entry.col;
    dom.dataset.boardOrientation = entry.orientation;

    const cells =
      entry.orientation === "vertical"
        ? [
            [entry.row, entry.col],
            [entry.row + 1, entry.col]
          ]
        : [
            [entry.row, entry.col],
            [entry.row, entry.col + 1]
          ];

    cells.forEach(([r, c]) => {
      boardOccupancy[`${r},${c}`] = dom;
    });
  });
}
