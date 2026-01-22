/* ============================================================
   PIPS ENGINE — BOARD OCCUPANCY
   Tracks which domino occupies which board cell
   ============================================================

// Tracks the currently active rotation session */
let rotationSession = null;

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
  console.log("=============+===========");
}


/* ============================================================
   GRID BUILDER
   Creates the puzzle grid dynamically
   ============================================================ */

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


/* ============================================================
   REGION RENDERER
   Draws region overlays on top of the grid
   ============================================================ */

function drawRegions(regionList) {
  const regionLayer = document.getElementById("region-layer");
  regionLayer.innerHTML = "";

  regionList.forEach((region, index) => {
    const regionDiv = document.createElement("div");
    regionDiv.classList.add("region");

    const rows = region.map(c => c[0]);
    const cols = region.map(c => c[1]);

    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"));
    const cellGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"));

    const x = minCol * (cellSize + cellGap);
    const y = minRow * (cellSize + cellGap);
    const width = (maxCol - minCol + 1) * (cellSize + cellGap) - cellGap;
    const height = (maxRow - minRow + 1) * (cellSize + cellGap) - cellGap;

    regionDiv.style.left = `${x}px`;
    regionDiv.style.top = `${y}px`;
    regionDiv.style.width = `${width}px`;
    regionDiv.style.height = `${height}px`;

    const label = document.createElement("div");
    label.classList.add("region-label");
    label.textContent = String.fromCharCode(65 + index);

    regionDiv.appendChild(label);
    regionLayer.appendChild(regionDiv);
  });

  console.log("Regions drawn:", regionList.length);
}


/* ============================================================
   DOMINO GENERATOR
   Creates domino tiles and assigns them to tray slots
   ============================================================ */

function buildDominoTray(dominoList) {
  const tray = document.getElementById("domino-tray");

  const traySlots = tray.querySelectorAll(".tray-slot");
  traySlots.forEach(slot => slot.innerHTML = "");

  const newDominoes = [];

  dominoList.forEach((pair, index) => {
    const [a, b] = pair;

    const domino = document.createElement("div");
    domino.classList.add("domino");
    domino.dataset.index = index;
    domino.dataset.valueA = a;
    domino.dataset.valueB = b;

    const pipA = createPipGroup(a);
    const pipB = createPipGroup(b);

    domino.appendChild(pipA);
    domino.appendChild(pipB);

    domino.addEventListener("dblclick", () => {
      domino.classList.toggle("vertical");
    });

   domino.addEventListener("click", () => {
     handleDominoTap(domino);
   });
     
    newDominoes.push(domino);
  });

  newDominoes.forEach((domino, i) => {
    const slot = traySlots[i];
    if (!slot) {
      console.warn("No tray slot for domino index", i, domino);
      return;
    }
    domino.dataset.homeSlot = slot.id;
    slot.appendChild(domino);
  });
}


/* ============================================================
   PIP RENDERING
   Creates a group of pips for a single number (0–6)
   ============================================================ */

function createPipGroup(value) {
  const group = document.createElement("div");
  group.classList.add("pip-group");

  const pipPatterns = {
    0: [],
    1: [ [1,1] ],
    2: [ [0,0], [2,2] ],
    3: [ [0,0], [1,1], [2,2] ],
    4: [ [0,0], [0,2], [2,0], [2,2] ],
    5: [ [0,0], [0,2], [1,1], [2,0], [2,2] ],
    6: [
      [0,0], [0,1], [0,2],
      [2,0], [2,1], [2,2]
    ]
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


/* ============================================================
   PLACEMENT LOGIC
   ============================================================ */

function tryPlaceDomino(domino, options = {}) {
  const simulate = options.simulate === true;
if (simulate) {
  console.log("SIMULATING placement for rotation:", domino);
}
   
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
    if (!simulate) {
      domino.dataset.dropAttempt = "off-board";
    }
    return false;
  }

  const anchor = bestCells[0];
  const anchorRect = anchor.getBoundingClientRect();
  const minArea = (anchorRect.width * anchorRect.height) * 0.25;

  if (bestOverlap < minArea) {
    if (!simulate) {
      domino.dataset.dropAttempt = "off-board";
    }
    return false;
  }

  const row = parseInt(anchor.dataset.row, 10);
  const col = parseInt(anchor.dataset.col, 10);
  const vertical = domino.classList.contains("vertical");

  const cells = vertical
    ? [ [row, col], [row + 1, col] ]
    : [ [row, col], [row, col + 1] ];

  for (const [r, c] of cells) {
    if (!document.getElementById(`cell-${r}-${c}`)) {
      if (!simulate) {
        domino.dataset.dropAttempt = "off-board";
      }
      return false;
    }
  }

  for (const [r, c] of cells) {
    const key = `${r},${c}`;
    if (boardOccupancy[key] && boardOccupancy[key] !== domino) {
      if (!simulate) {
        domino.dataset.dropAttempt = "invalid-on-board";
      }
      return false;
    }
  }

  // From here down: only commit if NOT simulating
  if (!simulate) {
    domino.style.left = `${anchorRect.left - rootRect.left}px`;
    domino.style.top = `${anchorRect.top - rootRect.top}px`;

    cells.forEach(([r, c]) => {
      boardOccupancy[`${r},${c}`] = domino;
    });

    domino.dataset.boardRow = row;
    domino.dataset.boardCol = col;
    domino.dataset.boardOrientation = vertical ? "vertical" : "horizontal";

    domino.dataset.dropAttempt = "valid";
    logBoardOccupancy();
  }

  return true;
}

/* ============================================================
   ROTATION
   ============================================================ */

function startRotationSession(domino) {
  domino._inRotationSession = true;

  domino._originalLeft = domino.style.left;
  domino._originalTop = domino.style.top;
  domino._originalVertical = domino.classList.contains("vertical");
}

function handleDominoTap(domino) {
  // If this is the first tap, begin a rotation session
  if (!domino._inRotationSession) {
    startRotationSession(domino);
  }

  // Toggle orientation (no validation yet)
  domino.classList.toggle("vertical");
}

function endRotationSession(domino) {
  if (!domino._inRotationSession) return;

  domino._inRotationSession = false;

  // Validate final placement
  if (!isDominoPlacementValid(domino)) {
    flashInvalid(domino);
    revertDomino(domino);
  }
}

function isDominoPlacementValid(domino) {
  // Use your existing placement logic here
  return tryPlaceDomino(domino, { simulate: true });
}

function revertDomino(domino) {
  domino.style.left = domino._originalLeft;
  domino.style.top = domino._originalTop;

  if (domino._originalVertical) {
    domino.classList.add("vertical");
  } else {
    domino.classList.remove("vertical");
  }
}


/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

function flashInvalid(domino) {
  domino.classList.add("cell-invalid");
  setTimeout(() => domino.classList.remove("cell-invalid"), 300);
}
