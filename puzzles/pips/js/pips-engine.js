// ============================================================
// PIPS ENGINE — CORE STATE + GRID + PIPS
// ============================================================

// Board occupancy: key "r,c" -> domino element
const boardOccupancy = {};

function logBoardOccupancy() {
  console.log("=== BOARD OCCUPANCY ===");
  const entries = Object.entries(boardOccupancy);
  if (entries.length === 0) {
    console.log("  (empty)");
  } else {
    entries.forEach(([key, value]) => {
      const label = value.id ? value.id : "(no id)";
      console.log(`  cell ${key} -> domino ${label}`);
    });
  }
  console.log("========================");
}

function buildGrid(rows, cols) {
  const grid = document.getElementById("pips-grid");
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.classList.add("pips-cell");
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.id = `cell-${r}-${c}`;
      grid.appendChild(cell);
    }
  }
}

let activeDomino = null;
let offsetX = 0;
let offsetY = 0;

const standardDominos = [
  [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
  [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],
  [2,2],[2,3],[2,4],[2,5],[2,6],
  [3,3],[3,4],[3,5],[3,6],
  [4,4],[4,5],[4,6],
  [5,5],[5,6],
  [6,6]
];

function createPipGroup(value) {
  const group = document.createElement("div");
  group.classList.add("pip-group");

  const pipPatterns = {
    0: [],
    1: [[1,1]],
    2: [[0,0],[2,2]],
    3: [[0,0],[1,1],[2,2]],
    4: [[0,0],[0,2],[2,0],[2,2]],
    5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
    6: [[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]]
  };

  const pattern = pipPatterns[value] || [];

  group.style.display = "grid";
  group.style.gridTemplateColumns = "repeat(3, 1fr)";
  group.style.gridTemplateRows = "repeat(3, 1fr)";

  pattern.forEach(([r, c]) => {
    const pip = document.createElement("div");
    pip.classList.add("pip");
    pip.style.gridRow = r + 1;
    pip.style.gridColumn = c + 1;
    group.appendChild(pip);
  });

  return group;
}

// ============================================================
// DRAG & DROP
// ============================================================

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

function startDrag(e) {
  e.preventDefault();
  activeDomino = e.currentTarget;

  const parent = activeDomino.parentElement;
  const cameFromBoard = parent.classList.contains("pips-cell") || parent.id === "pips-root";

  activeDomino.dataset.origin = cameFromBoard ? "board" : "tray";

  if (cameFromBoard) {
    activeDomino.dataset.prevRow = activeDomino.dataset.boardRow || "";
    activeDomino.dataset.prevCol = activeDomino.dataset.boardCol || "";
    activeDomino.dataset.prevOrientation = activeDomino.dataset.boardOrientation || "";
  }

  activeDomino.dataset.originalLeft = activeDomino.style.left || "";
  activeDomino.dataset.originalTop = activeDomino.style.top || "";
  activeDomino.dataset.originalParent = parent.id || "";

  Object.keys(boardOccupancy).forEach(key => {
    if (boardOccupancy[key] === activeDomino) delete boardOccupancy[key];
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
  activeDomino.style.top  = `${clientY - offsetY - rootRect.top}px`;

  highlightPossibleCells(activeDomino);
}

function drag(e) {
  if (!activeDomino) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const rootRect = document.getElementById("pips-root").getBoundingClientRect();

  activeDomino.style.left = `${clientX - offsetX - rootRect.left}px`;
  activeDomino.style.top  = `${clientY - offsetY - rootRect.top}px`;
}

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
    activeDomino.style.top  = `${anchorRect.top  - rootRect.top}px`;

    const cells = prevOrientation === "vertical"
      ? [[prevRow, prevCol], [prevRow + 1, prevCol]]
      : [[prevRow, prevCol], [prevRow, prevCol + 1]];

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

// ============================================================
// PLACEMENT LOGIC
// ============================================================

function tryPlaceDomino(domino) {
  const root = document.getElementById("pips-root");
  const rootRect = root.getBoundingClientRect();

  const rawDom = domino.getBoundingClientRect();
  const domRect = {
    left: rawDom.left - rootRect.left,
    right: rawDom.right - rootRect.left,
    top: rawDom.top - rootRect.top,
    bottom: rawDom.bottom - rootRect.top,
    width: rawDom.width,
    height: rawDom.height
  };

  const leftHalf = {
    left: domRect.left,
    right: domRect.left + domRect.width / 2,
    top: domRect.top,
    bottom: domRect.bottom
  };

  let bestCells = [];
  let bestOverlap = 0;

  document.querySelectorAll(".pips-cell").forEach(cell => {
    const raw = cell.getBoundingClientRect();
    const rect = {
      left: raw.left - rootRect.left,
      right: raw.right - rootRect.left,
      top: raw.top - rootRect.top,
      bottom: raw.bottom - rootRect.top
    };

    const overlapLeft = Math.max(leftHalf.left, rect.left);
    const overlapRight = Math.min(leftHalf.right, rect.right);
    const overlapTop = Math.max(leftHalf.top, rect.top);
    const overlapBottom = Math.min(leftHalf.bottom, rect.bottom);

    const overlapWidth = overlapRight - overlapLeft;
    const overlapHeight = overlapBottom - overlapTop;

    if (overlapWidth > 0 && overlapHeight > 0) {
      const area = overlapWidth * overlapHeight;

      if (area > bestOverlap) {
        bestOverlap = area;
        bestCells = [cell];
      } else if (Math.abs(area - bestOverlap) < 0.001) {
        bestCells.push(cell);
      }
    }
  });

  if (bestCells.length === 0) {
    domino.dataset.dropAttempt = "off-board";
    return false;
  }

  const anchor = bestCells[0];
  const anchorRect = anchor.getBoundingClientRect();
  const minArea = (anchorRect.width * anchorRect.height) * 0.25;

  if (bestOverlap < minArea) {
    domino.dataset.dropAttempt = "off-board";
    return false;
  }

  const row = parseInt(anchor.dataset.row, 10);
  const col = parseInt(anchor.dataset.col, 10);
  const vertical = domino.classList.contains("vertical");

  const cells = vertical
    ? [[row, col], [row + 1, col]]
    : [[row, col], [row, col + 1]];

  for (const [r, c] of cells) {
    if (!document.getElementById(`cell-${r}-${c}`)) {
      domino.dataset.dropAttempt = "off-board";
      return false;
    }
  }

  for (const [r, c] of cells) {
    const key = `${r},${c}`;
    if (boardOccupancy[key] && boardOccupancy[key] !== domino) {
      domino.dataset.dropAttempt = "invalid-on-board";
      return false;
    }
  }

  domino.style.left = `${anchorRect.left - rootRect.left}px`;
  domino.style.top  = `${anchorRect.top  - rootRect.top}px`;

  cells.forEach(([r, c]) => {
    boardOccupancy[`${r},${c}`] = domino;
  });

  domino.dataset.boardRow = row;
  domino.dataset.boardCol = col;
  domino.dataset.boardOrientation = vertical ? "vertical" : "horizontal";

  domino.dataset.dropAttempt = "valid";
  logBoardOccupancy();
  return true;
}

// ============================================================
// ENGINE — WIN CHECK + SERIALIZATION
// ============================================================

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
    dom.style.top  = `${anchorRect.top  - rootRect.top}px`;

    dom.dataset.boardRow = entry.row;
    dom.dataset.boardCol = entry.col;
    dom.dataset.boardOrientation = entry.orientation;

    const cells = entry.orientation === "vertical"
      ? [[entry.row, entry.col], [entry.row + 1, entry.col]]
      : [[entry.row, entry.col], [entry.row, entry.col + 1]];

    cells.forEach(([r, c]) => {
      boardOccupancy[`${r},${c}`] = dom;
    });
  });

  logBoardOccupancy();
}

