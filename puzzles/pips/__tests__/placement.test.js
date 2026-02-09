import { createGrid } from "../engine/grid.js";
import { createDomino } from "../engine/domino.js";
import { rotateDominoOnBoard, commitRotation } from "../engine/placement.js";

describe("placement rotation and commit", () => {
  test("rotateDominoOnBoard rotates 90deg clockwise", () => {
    const d = createDomino("12");
    d.row0 = 2; d.col0 = 2;
    d.row1 = 2; d.col1 = 3;

    rotateDominoOnBoard(d, 0);
    expect(d.row0).toBe(2);
    expect(d.col0).toBe(2);
    expect(d.row1).toBe(3);
    expect(d.col1).toBe(2);

    rotateDominoOnBoard(d, 0);
    expect(d.row1).toBe(2);
    expect(d.col1).toBe(1);
  });

  test("commitRotation rolls back when target occupied", () => {
    const grid = createGrid(5, 5);
    const d = createDomino("34");
    d.row0 = 1; d.col0 = 1;
    d.row1 = 1; d.col1 = 2;
    grid[1][1] = { dominoId: d.id, half: 0 };
    grid[1][2] = { dominoId: d.id, half: 1 };

    d._prevRow0 = d.row0; d._prevCol0 = d.col0;
    d._prevRow1 = d.row1; d._prevCol1 = d.col1;

    grid[2][1] = { dominoId: "BLOCK", half: 0 };

    rotateDominoOnBoard(d, 0);

    const ok = commitRotation(d, grid);
    expect(ok).toBe(false);

    expect(d.row0).toBe(1);
    expect(d.col0).toBe(1);
    expect(d.row1).toBe(1);
    expect(d.col1).toBe(2);

    expect(grid[2][1]).toEqual({ dominoId: "BLOCK", half: 0 });
  });
});
