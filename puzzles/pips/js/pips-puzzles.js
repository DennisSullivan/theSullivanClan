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
      {
        index: 12,
        cells: [
          { row: 0, col: 0 }, // left side (valueA)
          { row: 0, col: 1 }  // right side (valueB)
        ]
      },
      {
        index: 7,
        cells: [
          { row: 4, col: 3 }, // left side (valueA)
          { row: 5, col: 3 }  // right side (valueB)
        ]
      }
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
    title: "Easy 6×6 Starter",

    width: 6,
    height: 6,

    blocked: [],

    regions: [
      {
        id: "A",
        rule: "=6", // sum of pips must equal 6
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 0 }
        ]
      },
      {
        id: "B",
        rule: "≠", // two dominos must be different
        cells: [
          { row: 0, col: 2 },
          { row: 0, col: 3 },
          { row: 1, col: 2 }
        ]
      },
      {
        id: "C",
        rule: "<", // left < right or top < bottom
        cells: [
          { row: 0, col: 4 },
          { row: 0, col: 5 },
          { row: 1, col: 5 }
        ]
      },
      {
        id: "D",
        rule: ">7", // sum must be greater than 7
        cells: [
          { row: 1, col: 1 },
          { row: 2, col: 1 },
          { row: 2, col: 2 },
          { row: 3, col: 2 }
        ]
      },
      {
        id: "E",
        rule: "=4", // sum must equal 4
        cells: [
          { row: 1, col: 3 },
          { row: 1, col: 4 },
          { row: 2, col: 4 }
        ]
      },
      {
        id: "F",
        rule: "≠", // inequality region
        cells: [
          { row: 2, col: 0 },
          { row: 3, col: 0 },
          { row: 3, col: 1 }
        ]
      },
      {
        id: "G",
        rule: "<", // comparison region
        cells: [
          { row: 2, col: 3 },
          { row: 3, col: 3 },
          { row: 3, col: 4 },
          { row: 4, col: 4 }
        ]
      }
    ],

    startingDominos: [
      // { index: 0, row: 0, col: 0, orientation: "horizontal" }
      {
        index: 0,
        cells: [
          { row: 0, col: 0 }, // left side (valueA)
          { row: 0, col: 1 }  // right side (valueB)
        ]
      },
      // { index: 1, row: 2, col: 3, orientation: "vertical" }
      {
        index: 1,
        cells: [
          { row: 2, col: 3 }, // left side (valueA)
          { row: 3, col: 3 }  // right side (valueB)
        ]
      },
      // { index: 2, row: 4, col: 1, orientation: "horizontal" }
      {
        index: 2,
        cells: [
          { row: 4, col: 1 }, // left side (valueA)
          { row: 4, col: 2 }  // right side (valueB)
        ]
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
