/* ============================================================
   PIPS ENGINE — BOARD OCCUPANCY
   Tracks which domino occupies which board cell.
   This is the authoritative source of truth for placement.
   ============================================================ */

const boardOccupancy = {};

/**
 * Debug helper: prints which domino occupies which cell.
 */
function logBoardOccupancy() {
  console.log("=== BOARD OCCUPANCY ===");
  const entries = Object.entries(boardOccupancy);
  if (entries.length === 0) {
    console.log("  (empty)");
  } else {
    entries.forEach(([key, value]) => {
      const label = value.id ? value.id : "(no id)";
      // console.log(`  cell ${key} -> domino ${label}`);
    });
  }
  console.log("=============+===========");
}


/* ============================================================
   GRID BUILDER
   Creates the puzzle grid dynamically based on rows/cols.
   Each cell gets a unique ID and row/col dataset attributes.
   ============================================================ */

function buildGrid(rows, cols) {
  const grid = document.getElementById("pips-root");
  grid.innerHTML = "";

  // Expose dimensions to CSS Grid
  grid.style.setProperty("--rows", rows);
  grid.style.setProperty("--cols", cols);

  // Create each cell
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
   Draws NYT-style region overlays on top of the grid.
   Each region is a bounding rectangle with a badge.
   ============================================================ */
/*
function drawRegions(regionList) {
  const regionLayer = document.getElementById("region-layer");
  regionLayer.innerHTML = "";

  regionList.forEach((region, index) => {
    const regionDiv = document.createElement("div");
    regionDiv.classList.add("region-cell");
    regionDiv.dataset.region = index;   // Enables CSS coloring

    // Extract row/col lists
    const rows = region.map(c => c[0]);
    const cols = region.map(c => c[1]);

    // Compute bounding rectangle
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    // Convert grid coords → pixel coords
    const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"));
    const cellGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"));

    const x = minCol * (cellSize + cellGap);
    const y = minRow * (cellSize + cellGap);
    const width = (maxCol - minCol + 1) * (cellSize + cellGap) - cellGap;
    const height = (maxRow - minRow + 1) * (cellSize + cellGap) - cellGap;

    // Apply geometry
    regionDiv.style.left = `${x}px`;
    regionDiv.style.top = `${y}px`;
    regionDiv.style.width = `${width}px`;
    regionDiv.style.height = `${height}px`;

    // Add region badge (A, B, C…)
    const label = document.createElement("div");
    label.classList.add("region-badge");
    label.textContent = String.fromCharCode(65 + index);

    regionDiv.appendChild(label);
    regionLayer.appendChild(regionDiv);
  });

  console.log("Regions drawn:", regionList.length);
}
 */

/* ============================================================
   DOMINO GENERATOR
   Creates all domino tiles and assigns them to tray slots.
   ============================================================ */

function buildDominoTray(dominoList) {
  const tray = document.getElementById("domino-tray");

  // Clear existing tray slots
  const traySlots = tray.querySelectorAll(".tray-slot");
  traySlots.forEach(slot => slot.innerHTML = "");

  const newDominoes = [];

  // Build each domino tile
  dominoList.forEach((pair, index) => {
    const [a, b] = pair;

    const domino = document.createElement("div");
    domino.classList.add("domino");
    domino.dataset.index = index;
    domino.dataset.valueA = a;
    domino.dataset.valueB = b;

    // Add pip groups
    domino.appendChild(createPipGroup(a));
    domino.appendChild(createPipGroup(b));

    newDominoes.push(domino);
  });

  // Place dominos into tray slots
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
   Creates a 3×3 pip grid for a single number (0–6).
   ============================================================ */

function createPipGroup(value) {
  const group = document.createElement("div");
  group.classList.add("pip-group");

  // Pip patterns for each number
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

  // 3×3 grid
  group.style.display = "grid";
  group.style.gridTemplateColumns = "repeat(3, 1fr)";
  group.style.gridTemplateRows = "repeat(3, 1fr)";

  // Add pips
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
   NYT-STYLE GRID VALIDATOR
   Shared by drag placement and rotation.
   Ensures:
   - Domino stays on board
   - Domino does not overlap another
   - Occupancy is updated when committed
   ============================================================ */

function validateGridPlacement(row, col, orientation, domino, options = {}) {
  console.log("++++++++++++++ validateGridPlacement called +++++++++++++");
  console.log(row, col, orientation);
  logBoardOccupancy();

  const simulate = options.simulate === true;
  const vertical = (orientation === "vertical");

  // Compute the two cells the domino would occupy
  const cells = vertical
    ? [ [row, col], [row + 1, col] ]
    : [ [row, col], [row, col + 1] ];

  // 1) Bounds check
  for (const [r, c] of cells) {
    const cellEl = document.getElementById(`cell-${r}-${c}`);
    if (!cellEl) {
      if (!simulate) domino.dataset.dropAttempt = "off-board";
      return false;
    }
  }

  // 2) Occupancy check
  for (const [r, c] of cells) {
    const key = `${r},${c}`;
    if (boardOccupancy[key] && boardOccupancy[key] !== domino) {
      if (!simulate) domino.dataset.dropAttempt = "invalid-on-board";
      return false;
    }
  }

  // 3) Commit placement (only if NOT simulating)
  if (!simulate) {
    const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"));
    const cellGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"));

    // Snap domino to grid
    domino.style.left = `${col * (cellSize + cellGap)}px`;
    domino.style.top = `${row * (cellSize + cellGap)}px`;

    // Update occupancy map
    cells.forEach(([r, c]) => {
      boardOccupancy[`${r},${c}`] = domino;
    });

    // Store board metadata
    domino.dataset.boardRow = row;
    domino.dataset.boardCol = col;
    domino.dataset.boardOrientation = vertical ? "vertical" : "horizontal";
    domino.dataset.dropAttempt = "valid";

    logBoardOccupancy();
  }

  return true;
}


/* ============================================================
   DRAG PLACEMENT
   Uses overlap geometry to determine the anchor cell.
   Then calls validateGridPlacement() to approve/reject.
   ============================================================ */

function tryPlaceDomino(domino, options = {}) {
  console.log("===tryPlaceDomino v40 ===");
  const simulate = options.simulate === true;

  // Rotation simulation path
  if (simulate && domino.dataset.boardRow != null) {
    const row = parseInt(domino.dataset.boardRow, 10);
    const col = parseInt(domino.dataset.boardCol, 10);
    const orientation = domino.dataset.boardOrientation;
    return validateGridPlacement(row, col, orientation, domino, { simulate: true });
  }

  // Drag placement path
  const root = document.getElementById("pips-root");
  const rootRect = root.getBoundingClientRect();

  // Domino geometry relative to grid
  const rawDom = domino.getBoundingClientRect();
  const domRect = {
    left: rawDom.left - rootRect.left,
    right: rawDom.right - rootRect.left,
    top: rawDom.top - rootRect.top,
    bottom: rawDom.bottom - rootRect.top,
    width: rawDom.width,
    height: rawDom.height
  };

  // Probe rectangle: top half (vertical) or left half (horizontal)
  let anchorProbe;
  if (domino.classList.contains("vertical")) {
    anchorProbe = {
      left: domRect.left,
      right: domRect.right,
      top: domRect.top,
      bottom: domRect.top + domRect.height / 2
    };
  } else {
    anchorProbe = {
      left: domRect.left,
      right: domRect.left + domRect.width / 2,
      top: domRect.top,
      bottom: domRect.bottom
    };
  }

  // Find best-overlap cell(s)
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

    const overlapLeft = Math.max(anchorProbe.left, rect.left);
    const overlapRight = Math.min(anchorProbe.right, rect.right);
    const overlapTop = Math.max(anchorProbe.top, rect.top);
    const overlapBottom = Math.min(anchorProbe.bottom, rect.bottom);

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

  // No valid overlap
  if (bestCells.length === 0) {
    if (!simulate) domino.dataset.dropAttempt = "off-board";
    return false;
  }

  // Require at least 25% overlap
  const anchor = bestCells[0];
  const anchorRect = anchor.getBoundingClientRect();
  const minArea = (anchorRect.width * anchorRect.height) * 0.25;

  if (bestOverlap < minArea) {
    if (!simulate) domino.dataset.dropAttempt = "off-board";
    return false;
  }

  // Convert anchor cell → grid coords
  const row = parseInt(anchor.dataset.row, 10);
  const col = parseInt(anchor.dataset.col, 10);
  const orientation = domino.classList.contains("vertical") ? "vertical" : "horizontal";

  return validateGridPlacement(row, col, orientation, domino, { simulate });
}


/* ============================================================
   ROTATION — NYT‑STYLE SESSION SYSTEM
   Tracks original position so invalid rotations can revert.
   ============================================================ */
/*
let rotationSession = {
  active: false,
  domino: null,
  originalLeft: null,
  originalTop: null,
  originalOrientation: null
};

function startRotationSession(domino) {
  rotationSession.active = true;
  rotationSession.domino = domino;

  rotationSession.originalLeft = domino.style.left;
  rotationSession.originalTop = domino.style.top;
  rotationSession.originalOrientation =
    domino.classList.contains("vertical") ? "vertical" : "horizontal";

  console.log("Rotation session started for", domino.dataset.index);
}
 */

/* ============================================================
   ROTATION — NYT-STYLE AROUND CLICKED CELL
   Rule:
   - A domino always occupies exactly two grid cells.
   - When you double-click on a domino on the board:
       • The clicked cell becomes the pivot and stays fixed.
       • The other cell rotates one step clockwise around the pivot.
   - Rotation is allowed only if the final two cells:
       • are on the board, and
       • do not overlap another domino.
   - Tray dominos simply toggle orientation with no grid logic.
   ============================================================ */

function rotateDomino(domino, clickX, clickY) {
  console.log("NYT ROTATION ENGINE ACTIVE");

  // ------------------------------------------------------------
  // TRAY ROTATION — always allowed
  // ------------------------------------------------------------
  const isOnBoard =
    domino.dataset.boardRow !== undefined &&
    domino.dataset.boardCol !== undefined;

  if (!isOnBoard) {
    if (
      !domino.classList.contains("horizontal") &&
      !domino.classList.contains("vertical")
    ) {
      domino.classList.add("horizontal");
    }

    const newOrientation = domino.classList.contains("horizontal")
      ? "vertical"
      : "horizontal";

    domino.classList.remove("horizontal", "vertical");
    domino.classList.add(newOrientation);
    return true;
  }

  // ------------------------------------------------------------
  // BOARD ROTATION — NYT RULES
  // ------------------------------------------------------------

  const oldRow = parseInt(domino.dataset.boardRow, 10);
  const oldCol = parseInt(domino.dataset.boardCol, 10);
  const oldOrientation = domino.dataset.boardOrientation;

  // Current two occupied cells
  let cell1Row = oldRow;
  let cell1Col = oldCol;
  let cell2Row, cell2Col;

  if (oldOrientation === "horizontal") {
    cell2Row = oldRow;
    cell2Col = oldCol + 1;
  } else {
    cell2Row = oldRow + 1;
    cell2Col = oldCol;
  }

   // ------------------------------------------------------------
   // PIVOT DETECTION — DOM HALF (STABLE) 
   // ------------------------------------------------------------
   const rect = domino.getBoundingClientRect();
   const localX = clickX - rect.left;
   const localY = clickY - rect.top;
   
   let pivotIsCell1;
   if (oldOrientation === "horizontal") {
     const midX = rect.width / 2;
     pivotIsCell1 = (localX < midX);   // left half → cell1, right half → cell2
   } else {
     const midY = rect.height / 2;
     pivotIsCell1 = (localY < midY);   // top half → cell1, bottom half → cell2
   }

  // ------------------------------------------------------------
  // NYT CLOCKWISE ROTATION — EXPLICIT CASES
  // ------------------------------------------------------------
  let newCell1Row, newCell1Col;
  let newCell2Row, newCell2Col;
  let newOrientation;

  if (oldOrientation === "vertical") {
    newOrientation = "horizontal";

    if (pivotIsCell1) {
      // pivot = top cell
      newCell1Row = cell1Row;
      newCell1Col = cell1Col;
      newCell2Row = cell1Row;
      newCell2Col = cell1Col + 1;
    } else {
      // pivot = bottom cell
      newCell1Row = cell2Row;
      newCell1Col = cell2Col;
      newCell2Row = cell2Row;
      newCell2Col = cell2Col - 1;
    }

  } else {
    newOrientation = "vertical";

    if (pivotIsCell1) {
      // pivot = left cell
      newCell1Row = cell1Row;
      newCell1Col = cell1Col;
      newCell2Row = cell1Row + 1;
      newCell2Col = cell1Col;
    } else {
      // pivot = right cell
      newCell1Row = cell2Row;
      newCell1Col = cell2Col;
      newCell2Row = cell2Row - 1;
      newCell2Col = cell2Col;
    }
  }

  // ------------------------------------------------------------
  // VALIDATION
  // ------------------------------------------------------------
  const cellA = document.getElementById(`cell-${newCell1Row}-${newCell1Col}`);
  const cellB = document.getElementById(`cell-${newCell2Row}-${newCell2Col}`);
  if (!cellA || !cellB) {
    console.warn("Rotation invalid: off-board");
    return false;
  }

  const newRow = Math.min(newCell1Row, newCell2Row);
  const newCol = Math.min(newCell1Col, newCell2Col);

  delete boardOccupancy[`${cell1Row},${cell1Col}`];
  delete boardOccupancy[`${cell2Row},${cell2Col}`];

  const valid = validateGridPlacement(
    newRow,
    newCol,
    newOrientation,
    domino,
    { simulate: true }
  );

  if (!valid) {
    console.warn("Rotation invalid");
    validateGridPlacement(oldRow, oldCol, oldOrientation, domino, { simulate: false });
    return false;
  }

  // Commit
  validateGridPlacement(newRow, newCol, newOrientation, domino, { simulate: false });

  domino.classList.remove("horizontal", "vertical");
  domino.classList.add(newOrientation);

  // ⭐ NO pip swapping. Ever.
  // The two halves keep their pip groups.

  return true;
}
