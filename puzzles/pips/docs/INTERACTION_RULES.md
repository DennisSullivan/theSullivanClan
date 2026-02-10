PIPS Interaction Rules (Authoritative Specification)
This document defines the complete interaction model for Pips, covering tray rotation, board rotation, dragging, and dropping. These rules reflect the current CSS architecture and the intended user experience.

1. Tray Rotation Rules
1.1 Activation
Rotation is triggered by a single‑click anywhere on a domino in the tray.

Movement under 20px is treated as “no movement.”

Dragging does not rotate a domino.

Double‑clicks in the tray are ignored for rotation.

1.2 Geometry
The domino is treated as a single rigid object.

Rotation is always 90° clockwise per click.

Rotation is implemented using CSS transforms on the wrapper:

Code
translate(-50%, -50%) rotate(var(--angle))
No geometric repositioning occurs.

1.3 Anchor
Rotation anchor is the center of the tray slot.

Wrapper remains centered via:

Code
translate(-50%, -50%)
1.4 Notes
Halves do not exist as pivot entities in the tray.

Clicking left or right half has no effect.

Rotation does not affect placement or geometry.

Tray rotation is visual only and does not carry over to board placement.

• Tray rotation uses a monotonically increasing angle (0°, 90°, 180°, 270°, 360°, …).
  The angle is never wrapped modulo 360. This guarantees that CSS transitions
  always animate clockwise and prevents counter‑rotation artifacts.

• Tray rotation is expressed exclusively through the CSS variable --angle.
  JS must not modify the wrapper’s transform property directly.

• Click‑only interactions must not alter the wrapper. No clone creation,
  wrapper hiding, or transform changes occur until drag movement exceeds
  the movement threshold.

• Dragging preserves the domino’s current rotation. The drag clone inherits
  the wrapper’s computed transform, including rotation and nudge.

2. Board Rotation Rules
2.1 Activation
Rotation is triggered by a double‑click on a specific half of a domino already on the board.

Movement under 20px is ignored during double‑click detection.

2.2 Geometry
The clicked half becomes the pivot.

The other half rotates 90° clockwise around the pivot.

Rotation is a geometric operation:

JS computes the new orientation.

JS computes the new cell for the non‑pivot half.

Visual rotation is applied via CSS:

Code
rotate(var(--angle))
2.3 Anchor
The pivot half’s board cell remains fixed.

The wrapper rotates around its center (CSS).

Only the non‑pivot half moves to a new cell.

2.4 Notes
Board rotation is a session of 90° clockwise increments (each double‑click = +90°).

Rotations may be illegal (off‑board, overlapping, region violations).

Illegal rotations are rejected and the domino returns to its former board position.

Rotation mode uses the drag clone and suppresses nudges during drag.

3. Dragging Rules
Dragging consists of pick‑up, motion, and drop phases.

3.1 Pick‑Up Rules
From the Tray
Domino is treated as a single object.

clickedHalf is detected but ignored.

Drag begins from the centered tray position.

A drag clone is created; the original wrapper suppresses transforms.

The domino keeps its current rotation during drag.

From the Board
clickedHalf determines the placement anchor.

Domino is lifted with its current orientation preserved.

The drag clone inherits the wrapper’s --angle.

The domino keeps its current rotation during drag.

3.2 Drag Motion Rules
In the Tray
Wrapper centering is preserved:

Code
translate(-50%, -50%)
Dragging composes on top of rotation:

Code
translate(-50%, -50%) rotate(var(--angle)) translate(dx, dy)
No geometry changes occur.

On the Board
Domino drags as a rigid object.

Orientation is preserved.

Pivot half is conceptual only; both halves move visually.

Rotation does not occur during drag.

Static nudge is removed during drag to avoid cursor mismatch.

4. Drop Rules
4.1 Dropped on a Board Cell
clickedHalf determines which half is placed.

The clicked half is placed into the target cell.

The other half is placed into the adjacent cell based on orientation.

Placement is validated:

Must fit on the board

Must not overlap another domino

Must obey region rules

If valid → commit

If invalid → return to former board position

4.2 Dropped on a Tray Slot
Domino is removed from the board (if applicable).

Domino is placed into its homeSlot.

Orientation is reset to 0°.

Tray renderer centers it.

4.3 Dropped Elsewhere (Invalid Drop)
Domino is returned to the tray.

Orientation is reset to 0°.

Includes dragging off the board or missing a tray slot.

5. Human‑Friendly Input Rules
5.1 Movement Threshold
Movement under 20px is treated as “no movement.”
Applies to:

Double‑click detection

Single‑click detection

Preventing accidental drags

5.2 Double‑Click Protection
If the second click occurs within 250ms and movement is under 20px,
it is always treated as a double‑click, not a drag.

6. Summary
Pips uses two distinct rotation systems (tray vs. board), two anchoring systems (center vs. pivot half), and a unified drag‑and‑drop model with human‑friendly thresholds. These rules ensure predictable, accessible, and consistent behavior across all interactions.
