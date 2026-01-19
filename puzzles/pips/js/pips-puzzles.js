/* ============================================================
   PIPS PUZZLES
   This file stores puzzle definitions only.
   No engine logic.
   No UI logic.
   No puzzle-loading logic.
   ============================================================ */

/*
  A puzzle object looks like this:

  {
    id: "puzzle-001",
    title: "Sample Puzzle",
    width: 7,
    height: 8,

    blocked: [
      { row: 2, col: 3 },
      { row: 4, col: 1 }
    ],

    regions: [
      {
        id: "A",
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 0 }
        ]
      },
      {
        id: "B",
        cells: [
          { row: 3, col: 4 },
          { row: 3, col: 5 },
          { row: 4, col: 4 }
        ]
      }
    ],

    startingDominos: [
      { index: 12, row: 0, col: 0, orientation: "horizontal" },
      { index: 7,  row: 4, col: 3, orientation: "vertical" }
    ]
  }
*/


/* ============================================================
   PUZZLE COLLECTION
   Add your puzzles here.
   ============================================================ */

const PIPS_PUZZLES = {
  // Example placeholder puzzle
  sample: {
    id: "sample",
    title: "Sample Puzzle",
    width: 6,
    height: 6,
    blocked: [],
    regions: [],
    startingDominos: []
  }

  // Add more puzzles here...
};


/* ============================================================
   GET PUZZLE BY ID
   ============================================================ */

function getPuzzle(id) {
  return PIPS_PUZZLES[id] || null;
}
