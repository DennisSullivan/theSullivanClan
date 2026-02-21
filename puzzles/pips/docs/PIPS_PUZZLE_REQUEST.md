# PIPS Puzzle Request Guide

This document defines how to generate a new PIPS puzzle for me.
Follow these instructions exactly unless I explicitly override them.

---

## 1. Output format

- Output **one complete puzzle JSON object**
- No commentary before or after the JSON
- JSON must be valid and ready to paste into the repository
- Include a `_solution` section

---

## 2. Board

- Board size: [SPECIFY — e.g. 6x6]
- Use **many blocked cells**
- All non-blocked cells must be covered by dominos
- Avoid disconnected playable areas unless explicitly requested

---

## 3. Dominos

- Use canonical domino IDs only (e.g. "00", "14", "66")
- Include **tray dominos only** unless starting dominos are requested
- Do not include starting dominos unless explicitly requested

---

## 4. Regions

- Regions must:
  - be orthogonally connected
  - not overlap
  - stay within bounds
- Regions may be irregular shapes
- Regions do not need to cover all playable cells unless specified
- Region rules may be simple (e.g. "=5", "<7")

---

## 5. Solution

- Include a `_solution` object
- Solution must list **explicit domino placements**
- Each placement must specify:
  - domino ID
  - exactly two cells
- Solution must cover **all non-blocked cells**
- Do not include solver commentary or reasoning

### Solution schema

```json
"_solution": {
  "placements": [
    {
      "domino": "23",
      "cells": [
        { "row": 1, "col": 2 },
        { "row": 1, "col": 3 }
      ]
    }
  ]
}
