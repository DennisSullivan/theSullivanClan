/* ============================================================
   PIPS PUZZLE LOADER
   Puzzle lifecycle: build, load, restore, validate
   ============================================================ */

// Read CSS variables for consistent sizing
const rootStyles = getComputedStyle(document.documentElement);
const cellSize = parseInt(rootStyles.getPropertyValue('--cell-size'));
const cellGap = parseInt(rootStyles.getPropertyValue('--cell-gap'));
const stride = cellSize + cellGap;

/* ------------------------------------------------------------
   CHECK WIN CONDITION
   ------------------------------------------------------------ */
function checkWin() {
  const keys = Object.keys(boardOccupancy);

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
      facing: dom.dataset.facing
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
    delete dom.dataset.facing;
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
    dom.dataset.facing = entry.facing;

    reorderPipGroups(dom);
    applyFacingClass(dom);

    const [r1, c1, r2, c2] =
      cellsFromFacing(entry.row, entry.col, entry.facing);

    boardOccupancy[`${r1},${c1}`] = dom;
    boardOccupancy[`${r2},${c2}`] = dom;
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
  buildRegionOverlays(puzzle);
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
    delete dom.dataset.facing;
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
   REGION OVERLAYS
   ------------------------------------------------------------ */
function buildRegionOverlays(puzzle) {
  const regionLayer = document.getElementById("region-layer");
  regionLayer.innerHTML = "";

  puzzle.regions.forEach((region, index) => {
    const cellSet = new Set(region.cells.map(c => `${c.row},${c.col}`));

    const minRow = Math.min(...region.cells.map(c => c.row));
    const minCol = Math.min(...region.cells.map(c => c.col));

    region.cells.forEach(cell => {
      const div = document.createElement("div");
      div.classList.add("region-cell");
      div.dataset.region = index;

      div.style.left = `${cell.col * stride}px`;
      div.style.top = `${cell.row * stride}px`;
      div.style.width = `${cellSize}px`;
      div.style.height = `${cellSize}px`;

      if (cellSet.has(`${cell.row - 1},${cell.col}`)) div.style.borderTop = "none";
      if (cellSet.has(`${cell.row + 1},${cell.col}`)) div.style.borderBottom = "none";
      if (cellSet.has(`${cell.row},${cell.col - 1}`)) div.style.borderLeft = "none";
      if (cellSet.has(`${cell.row},${cell.col + 1}`)) div.style.borderRight = "none";

      if (cell.row === minRow && cell.col === minCol) {
        const badge = document.createElement("div");
        badge.classList.add("region-badge");
        badge.textContent = region.rule || String.fromCharCode(65 + index);
        div.appendChild(badge);
      }

      regionLayer.appendChild(div);
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

  const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"));
  const cellGap  = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"));
  const stride   = cellSize + cellGap;

  puzzle.startingDominos.forEach(entry => {
    const dom = document.querySelector(`.domino[data-index="${entry.index}"]`);
    if (!dom) {
      console.warn("Starting domino not found:", entry.index);
      return;
    }

    const [c1, c2] = entry.cells;

    // Determine facing from the two cells
    let facing;
    if (c1.row === c2.row) {
      // horizontal
      facing = (c1.col < c2.col) ? "A-left" : "A-right";
    } else {
      // vertical
      facing = (c1.row < c2.row) ? "A-top" : "A-bottom";
    }

    dom.dataset.facing = facing;
    reorderPipGroups(dom);
    applyFacingClass(dom);

    // Anchor = top-left of the two cells
    const anchorRow = Math.min(c1.row, c2.row);
    const anchorCol = Math.min(c1.col, c2.col);

    // Convert board cell to pixel position inside pips-root
    const snapLeft = anchorCol * stride;
    const snapTop  = anchorRow * stride;

    // Place the domino
    root.appendChild(dom);
    dom.style.position = "absolute";
    dom.style.left = `${snapLeft}px`;
    dom.style.top  = `${snapTop}px`;

    // Commit placement to boardOccupancy
    const ok = tryPlaceDomino(dom, { simulate: false });
    if (!ok) {
      console.warn("Starting domino failed placement:", entry, dom);
    }
  });
}
