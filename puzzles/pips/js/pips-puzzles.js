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
  // ------------------------------------------------------------
  // Small, easy 6×6 beginner puzzle
  // ------------------------------------------------------------
  easy6x6: {
    id: "easy6x6",
    title: "Easy 6×6 Starter",
    width: 6,
    height: 6,

    blocked: [],   // no blocked cells
    regions: [],   // no regions
    regions: [
     {
       id: "A",
       cells: [
         { row: 0, col: 0 },
         { row: 0, col: 1 },
         { row: 1, col: 0 },
         { row: 2, col: 0 }
       ]
     },
     {
       id: "B",
       cells: [
         { row: 0, col: 2 },
         { row: 1, col: 1 },
         { row: 1, col: 2 },
         { row: 2, col: 1 }
       ]
     },
     {
       id: "C",
       cells: [
         { row: 0, col: 3 },
         { row: 0, col: 4 },
         { row: 1, col: 3 },
         { row: 2, col: 3 }
       ]
     },
     {
       id: "D",
       cells: [
         { row: 0, col: 5 },
         { row: 1, col: 4 },
         { row: 1, col: 5 },
         { row: 2, col: 5 },
         { row: 3, col: 5 }
       ]
     },
     {
       id: "E",
       cells: [
         { row: 2, col: 2 },
         { row: 3, col: 2 },
         { row: 3, col: 1 },
         { row: 4, col: 1 }
       ]
     },
     {
       id: "F",
       cells: [
         { row: 2, col: 4 },
         { row: 3, col: 4 },
         { row: 4, col: 4 },
         { row: 4, col: 3 },
         { row: 5, col: 3 }
       ]
     },
     {
       id: "G",
       cells: [
         { row: 3, col: 0 },
         { row: 4, col: 0 },
         { row: 5, col: 0 },
         { row: 5, col: 1 },
         { row: 5, col: 2 }
       ]
     }
   ]

    startingDominos: [
      { index: 0, row: 0, col: 0, orientation: "horizontal" }, // 0–0
      { index: 5, row: 2, col: 2, orientation: "vertical" },   // 0–5
      { index: 12, row: 4, col: 1, orientation: "horizontal" } // 1–3
    ]
  },

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
}

/* ============================================================
   GET PUZZLE BY ID
   ============================================================ */

function getPuzzle(id) {
  return PIPS_PUZZLES[id] || null;
}
