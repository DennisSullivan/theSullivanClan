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
  id: "easy-6x6-starter",
  name: "Easy 6×6 Starter",
  rows: 6,
  cols: 6,

  // Three simple starter dominos
  starters: [
    { r: 0, c: 0, v1: 1, v2: 2, vertical: false },
    { r: 2, c: 3, v1: 3, v2: 3, vertical: true },
    { r: 4, c: 1, v1: 0, v2: 4, vertical: false }
  ],

  // Regions with rules
  regions: [
    {
      id: "A",
      rule: "=6",          // sum of pips must equal 6
      cells: [ [0,0], [0,1], [1,0] ]
    },
    {
      id: "B",
      rule: "≠",           // two dominos must be different
      cells: [ [0,2], [0,3], [1,2] ]
    },
    {
      id: "C",
      rule: "<",           // left < right or top < bottom
      cells: [ [0,4], [0,5], [1,5] ]
    },
    {
      id: "D",
      rule: ">7",          // sum must be greater than 7
      cells: [ [1,1], [2,1], [2,2], [3,2] ]
    },
    {
      id: "E",
      rule: "=4",          // sum must equal 4
      cells: [ [1,3], [1,4], [2,4] ]
    },
    {
      id: "F",
      rule: "≠",           // inequality region
      cells: [ [2,0], [3,0], [3,1] ]
    },
    {
      id: "G",
      rule: "<",           // comparison region
      cells: [ [2,3], [3,3], [3,4], [4,4] ]
    }
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
