# Installation & Local Development

These instructions assume a simple static site setup. Adjust for your build system if you use bundlers (Webpack, Vite, etc.).

## Prerequisites

- Node.js (optional, for a local static server)
- A modern browser (Chrome, Edge, Firefox, Safari)

## Run locally (simple)

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd <repo-folder>







---

#### `API.md`
```markdown
# Internal API Reference

This document describes the primary functions and modules used by the app.

## Engine: placement.js

**Functions**
- `placeDomino(domino, row, col, grid, clickedHalf)`  
  Attempts to place a domino (from tray) at board coordinates. Returns `true` on success.

- `moveDomino(domino, row, col, grid)`  
  Moves an existing domino already on the board to a new location. Returns `true` on success.

- `removeDominoToTray(domino, grid)`  
  Removes a domino from the board and returns it to the tray model.

## Engine: syncCheck.js

- `syncCheck(dominos, grid)`  
  Validates that the model and grid are consistent. Logs issues to console and returns boolean status.

## UI: boardRenderer.js

- `renderBoard(dominos, grid, regionMap, blocked, regions, boardEl)`  
  Renders the board DOM from the model. Responsible for setting `.board-cell` attributes and `.domino-wrapper.on-board` positions.

## UI: trayRenderer.js

- `renderTray(puzzleJson, dominos, trayEl)`  
  Renders tray slots and dominos. Applies `--angle` CSS variable for tray rotation.

## UI: dragDrop.js

- `enableDrag(puzzleJson, dominos, grid, regionMap, blocked, regions, boardEl, trayEl)`  
  Attaches pointer handlers to board and tray. Must be called after `renderBoard` and `renderTray`.

- `endDrag` (exported object)  
  - `endDrag.registerCallback(fn)` — register callbacks invoked when a drag ends.  
  - `endDrag.fire(domino, row, col, grid)` — invoked internally; callbacks receive `(domino, row, col, grid)`.

**Notes on drag behavior**
- Dragging uses a visual clone appended to `document.body` with `pointer-events: none`.
- Hit testing uses `document.elementsFromPoint(x, y)` and prefers `.board-cell` elements.
- Double-click on a tray domino rotates it by updating `domino.trayOrientation` and re-rendering the tray.

