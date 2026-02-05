# Changelog

All notable changes to this project should be documented here.

## [Unreleased]
- Introduced clone-based drag visuals to avoid hit-test interference.
- Improved hit detection using `document.elementsFromPoint(...)` and preference for `.board-cell`.
- Tray double-click rotation persisted to model via `domino.trayOrientation`.
- Added `--angle` CSS variable usage for rotation.

## [2026-02-05] Initial dev snapshot
- Basic board/tray rendering.
- Placement engine with `placeDomino`, `moveDomino`, `removeDominoToTray`.
- `syncCheck` for model/grid consistency.
- Basic drag & drop implementation (visual clone added later).
