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

function validateGridPlacementCells(
  cell1Row, cell1Col,
  cell2Row, cell2Col,
  domino,
  options = {}
) {
  const simulate = options.simulate === true;

  // ------------------------------------------------------------
  // 1. Bounds check
  // ------------------------------------------------------------
  const cellA = document.getElementById(`cell-${cell1Row}-${cell1Col}`);
  const cellB = document.getElementById(`cell-${cell2Row}-${cell2Col}`);

  if (!cellA || !cellB) {
    if (!simulate) domino.dataset.dropAttempt = "off-board";
    return false;
  }

  // ------------------------------------------------------------
  // 2. Occupancy check
  // ------------------------------------------------------------
  const keyA = `${cell1Row},${cell1Col}`;
  const keyB = `${cell2Row},${cell2Col}`;

  if (boardOccupancy[keyA] && boardOccupancy[keyA] !== domino) {
    if (!simulate) domino.dataset.dropAttempt = "invalid-on-board";
    return false;
  }

  if (boardOccupancy[keyB] && boardOccupancy[keyB] !== domino) {
    if (!simulate) domino.dataset.dropAttempt = "invalid-on-board";
    return false;
  }

  // ------------------------------------------------------------
  // 3. Commit placement (only if NOT simulating)
  // ------------------------------------------------------------
  if (!simulate) {
    // Clear old occupancy
    for (const key in boardOccupancy) {
      if (boardOccupancy[key] === domino) {
        delete boardOccupancy[key];
      }
    }

    // Mark new occupancy
    boardOccupancy[keyA] = domino;
    boardOccupancy[keyB] = domino;

    // Compute anchor (top-left of the two cells)
    const anchorRow = Math.min(cell1Row, cell2Row);
    const anchorCol = Math.min(cell1Col, cell2Col);

    // Snap domino to anchor
    const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"));
    const cellGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"));
    const stride = cellSize + cellGap;

    domino.style.left = `${anchorCol * stride}px`;
    domino.style.top = `${anchorRow * stride}px`;

    // Store board metadata
    domino.dataset.boardRow = anchorRow;
    domino.dataset.boardCol = anchorCol;
    domino.dataset.dropAttempt = "valid";
  }

  return true;
}


/* ============================================================
   DRAG PLACEMENT
   Uses overlap geometry to determine the anchor cell.
   Then calls validateGridPlacement() to approve/reject.
   ============================================================ */

function tryPlaceDomino(domino, options = {}) {
  console.log("=== tryPlaceDomino (no H/V) ===");
  const simulate = options.simulate === true;

  // ------------------------------------------------------------
  // SIMULATION PATH (rotation)
  // ------------------------------------------------------------
  if (simulate && domino.dataset.boardRow != null) {
    const oldRow = parseInt(domino.dataset.boardRow, 10);
    const oldCol = parseInt(domino.dataset.boardCol, 10);

    const [cell1Row, cell1Col, cell2Row, cell2Col] =
      cellsFromFacing(oldRow, oldCol, domino.dataset.facing);

    return validateGridPlacementCells(
      cell1Row, cell1Col,
      cell2Row, cell2Col,
      domino,
      { simulate: true }
    );
  }

  // ------------------------------------------------------------
  // LOADER ANCHOR OVERRIDE
  // If loader provides anchorRow/anchorCol, skip drag geometry
  // ------------------------------------------------------------
  if (options.anchorRow != null && options.anchorCol != null) {
    const anchorRow = options.anchorRow;
    const anchorCol = options.anchorCol;
    const facing = domino.dataset.facing || "A-left";

    const [cell1Row, cell1Col, cell2Row, cell2Col] =
      cellsFromFacing(anchorRow, anchorCol, facing);

    console.log("Valid placement (loader)", cell1Row, cell1Col, cell2Row, cell2Col, domino);
    return validateGridPlacementCells(
      cell1Row, cell1Col,
      cell2Row, cell2Col,
      domino,
      { simulate: false }
    );
  }

  // ------------------------------------------------------------
  // DRAG PLACEMENT PATH (UI-driven)
  // ------------------------------------------------------------
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

  let anchorProbe;
  const facing = domino.dataset.facing || "A-left";

  if (facing === "A-top" || facing === "A-bottom") {
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

  if (bestCells.length === 0) {
    if (!simulate) domino.dataset.dropAttempt = "off-board";
    return false;
  }

  const anchor = bestCells[0];
  const anchorRect = anchor.getBoundingClientRect();
  const minArea = (anchorRect.width * anchorRect.height) * 0.25;

  if (bestOverlap < minArea) {
    if (!simulate) domino.dataset.dropAttempt = "off-board";
    return false;
  }

  const anchorRow = parseInt(anchor.dataset.row, 10);
  const anchorCol = parseInt(anchor.dataset.col, 10);

  const [cell1Row, cell1Col, cell2Row, cell2Col] =
    cellsFromFacing(anchorRow, anchorCol, facing);

  console.log("Valid placement", cell1Row, cell1Col, cell2Row, cell2Col, domino);
  return validateGridPlacementCells(
    cell1Row, cell1Col,
    cell2Row, cell2Col,
    domino,
    { simulate }
  );
}

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
  console.log("=== ROTATE START (facing model, no H/V) ===");

  // ------------------------------------------------------------
  // Ensure facing exists (tray dominos start as A-left)
  // ------------------------------------------------------------
  if (!domino.dataset.facing) {
    domino.dataset.facing = "A-left";
  }

  const isOnBoard = domino.dataset.boardRow != null;

  // ------------------------------------------------------------
  // TRAY ROTATION — rotate facing only
  // ------------------------------------------------------------
  if (!isOnBoard) {
    domino.dataset.facing = rotateFacingClockwise(domino.dataset.facing);
    reorderPipGroups(domino);
    applyFacingClass(domino);
    return true;
  }

  // ------------------------------------------------------------
  // BOARD ROTATION — NYT RULES
  // ------------------------------------------------------------
  const oldRow = parseInt(domino.dataset.boardRow, 10);
  const oldCol = parseInt(domino.dataset.boardCol, 10);

  // Determine current two occupied cells from facing
  const [cell1Row, cell1Col, cell2Row, cell2Col] =
    cellsFromFacing(oldRow, oldCol, domino.dataset.facing);

  // ------------------------------------------------------------
  // Determine clicked cell
  // ------------------------------------------------------------
  const root = document.getElementById("pips-root");
  const rootRect = root.getBoundingClientRect();
  const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"));
  const cellGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"));
  const stride = cellSize + cellGap;

  const clickedCol = Math.floor((clickX - rootRect.left) / stride);
  const clickedRow = Math.floor((clickY - rootRect.top) / stride);

  // ------------------------------------------------------------
  // Determine pivot cell and clicked half (A or B)
  // ------------------------------------------------------------
  let pivotRow, pivotCol, otherRow, otherCol;
  let clickedHalf;

  const firstIsA = domino.dataset.facing.startsWith("A-");
  const clickedIsCell1 = (clickedRow === cell1Row && clickedCol === cell1Col);

  if (clickedIsCell1) {
    pivotRow = cell1Row;
    pivotCol = cell1Col;
    otherRow = cell2Row;
    otherCol = cell2Col;
    clickedHalf = firstIsA ? "A" : "B";
  } else {
    pivotRow = cell2Row;
    pivotCol = cell2Col;
    otherRow = cell1Row;
    otherCol = cell1Col;
    clickedHalf = firstIsA ? "B" : "A";
  }

  // ------------------------------------------------------------
  // Rotate geometry clockwise around pivot
  // ------------------------------------------------------------
  const dr = otherRow - pivotRow;
  const dc = otherCol - pivotCol;

  const newOtherRow = pivotRow + dc;
  const newOtherCol = pivotCol - dr;

  // New two cells
  const newCell1Row = pivotRow;
  const newCell1Col = pivotCol;
  const newCell2Row = newOtherRow;
  const newCell2Col = newOtherCol;

  // ------------------------------------------------------------
  // Rotate facing clockwise
  // ------------------------------------------------------------
  let newFacing = rotateFacingClockwise(domino.dataset.facing);

  // ------------------------------------------------------------
  // Ensure clicked half remains the pivot half
  // ------------------------------------------------------------
  const pivotIsCell1 = (pivotRow === newCell1Row && pivotCol === newCell1Col);
  const newFirstHalf = newFacing.startsWith("A-") ? "A" : "B";

  if (pivotIsCell1 && newFirstHalf !== clickedHalf) {
    newFacing = flipFacing(newFacing);
  }

  if (!pivotIsCell1 && newFirstHalf === clickedHalf) {
    newFacing = flipFacing(newFacing);
  }

  domino.dataset.facing = newFacing;

  // ------------------------------------------------------------
  // Validate placement using the two cell pairs
  // ------------------------------------------------------------
  const valid = validateGridPlacementCells(
    newCell1Row, newCell1Col,
    newCell2Row, newCell2Col,
    domino,
    { simulate: true }
  );

  if (!valid) {
    // revert to old placement
    validateGridPlacementCells(
      cell1Row, cell1Col,
      cell2Row, cell2Col,
      domino,
      { simulate: false }
    );
    return false;
  }

  // Commit placement
  validateGridPlacementCells(
    newCell1Row, newCell1Col,
    newCell2Row, newCell2Col,
    domino,
    { simulate: false }
  );

  // ------------------------------------------------------------
  // Reorder pip groups to match final facing
  // ------------------------------------------------------------
  reorderPipGroups(domino);

  // ------------------------------------------------------------
  // Apply CSS class for facing
  // ------------------------------------------------------------
  applyFacingClass(domino);

  console.log("=== ROTATE END ===");
  return true;
}

// Helper functions

function rotateFacingClockwise(facing) {
  return {
    "A-top": "A-right",
    "A-right": "A-bottom",
    "A-bottom": "A-left",
    "A-left": "A-top"
  }[facing];
}

function flipFacing(facing) {
  return {
    "A-top": "A-bottom",
    "A-bottom": "A-top",
    "A-left": "A-right",
    "A-right": "A-left"
  }[facing];
}

function cellsFromFacing(row, col, facing) {
  switch (facing) {
    case "A-top":    return [row, col, row + 1, col];
    case "A-bottom": return [row + 1, col, row, col];
    case "A-left":   return [row, col, row, col + 1];
    case "A-right":  return [row, col + 1, row, col];
  }
}

function reorderPipGroups(domino) {
  const firstIsA = domino.dataset.facing.startsWith("A-");
  const a = domino.children[0];
  const b = domino.children[1];

  const valA = domino.dataset.valueA;
  const valB = domino.dataset.valueB;

  if (firstIsA) {
    if (a.dataset.value !== valA) domino.insertBefore(b, a);
  } else {
    if (a.dataset.value !== valB) domino.insertBefore(b, a);
  }
}

function applyFacingClass(domino) {
  domino.classList.remove("A-top", "A-right", "A-bottom", "A-left");
  domino.classList.add(domino.dataset.facing);
}
