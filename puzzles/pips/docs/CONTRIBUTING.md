# Contributing

Thanks for helping improve this project. A few guidelines to keep contributions smooth.

## How to contribute

1. Fork the repository and create a feature branch.
2. Make changes and run the app locally to verify behavior.
3. Open a pull request describing the change and why it’s needed.

## Coding style

- JavaScript: ES6 modules, prefer `const`/`let`, keep functions small and focused.
- CSS: use variables for geometry (`--cell-size`, `--cell-gap`, `--domino-thickness`).
- Keep UI logic (renderers) separate from engine logic (placement, validation).

## Testing & debugging

- Use DevTools console logs in `dragDrop.js` and `syncCheck.js` to debug drag/drop and geometry issues.
- When changing placement logic, add unit tests for `placeDomino` and `moveDomino` if possible.

## Reporting bugs

- Include steps to reproduce, browser and OS, and any console output.
- If possible, include a minimal puzzle JSON that reproduces the issue.

