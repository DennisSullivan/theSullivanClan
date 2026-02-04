PIPS Interaction Rules
This document defines the complete interaction model for Pips, covering
tray rotation, board rotation, dragging, and dropping. These rules form
the authoritative specification for how dominos behave in all user
interactions.

1. Tray Rotation Rules
1.1 Activation
Rotation is triggered by a double‑click anywhere on a domino while
it is in the tray.

Small human micro‑movement is allowed (movement under 20px does not
cancel the double‑click).

Dragging does not rotate a domino.

1.2 Geometry
The domino is treated as a single rigid object.

It rotates 90° clockwise.

Rotation is implemented using CSS transforms, not geometric
repositioning.

1.3 Anchor
The rotation anchor is the exact center of the tray slot.

The wrapper remains centered using:

Code
translate(-50%, -50%)
1.4 Notes
Halves do not exist as pivot entities in the tray.

Clicking left or right half has no effect on rotation behavior.

Rotation does not affect placement or geometry.

2. Board Rotation Rules
2.1 Activation
Rotation is triggered by a double‑click on a specific half of a
domino that is already on the board.

Micro‑movement under 20px is ignored during double‑click detection.

2.2 Geometry
The clicked half becomes the pivot.

The other half rotates clockwise around the pivot.

Rotation is a geometric operation, not a CSS transform.

2.3 Anchor
The pivot half’s board cell remains fixed.

Only the non‑pivot half moves to its new cell.

2.4 Notes
Rotations may be illegal (off‑board, overlapping, region violations).

Illegal rotations are rejected on commit.

3. Dragging Rules
Dragging behavior is divided into pick‑up, motion, and drop phases.

3.1 Pick‑Up Rules
From the tray
The domino is treated as a single object.

clickedHalf is detected but ignored for tray logic.

Drag begins from the centered tray position.

From the board
clickedHalf determines the placement anchor.

The domino is lifted with its current orientation preserved.

3.2 Drag Motion Rules
In the tray
The wrapper must preserve its centering translation:

Code
translate(-50%, -50%)
Dragging composes on top of this:

Code
translate(-50%, -50%) rotate(var(--angle)) translate(dx, dy)
No geometry changes occur during drag.

On the board
The domino drags as a rigid object.

Orientation is preserved.

Pivot half is conceptual only; both halves move visually.

Rotation does not occur during drag.

4. Drop Rules
4.1 Dropped on a board cell
The system uses clickedHalf to determine which half is being placed.

The clicked half is placed into the target cell.

The other half is placed into the adjacent cell based on orientation.

Placement is validated:

Must fit on the board

Must not overlap another domino

Must obey region rules

If valid → commit

If invalid → return to tray (see 4.3)

4.2 Dropped on a tray slot
The domino is removed from the board (if applicable).

The domino is placed into its homeSlot.

Orientation is reset to 0°.

The tray renderer centers it.

4.3 Dropped elsewhere (invalid drop)
The domino is returned to the tray.

Orientation is reset to 0°.

This includes dragging off the board or missing a tray slot.

5. Human‑Friendly Input Rules
5.1 Movement Threshold
Movement under 20px is treated as “no movement.”

This threshold applies to:

Double‑click detection

Click‑only detection

Preventing accidental drags

5.2 Double‑Click Protection
If the second click occurs within the double‑click window (250ms)
and movement is under 20px,
it is always treated as a double‑click, not a drag.

6. Summary
Pips uses two distinct rotation systems (tray vs. board), two anchoring
systems (center vs. pivot half), and a unified drag‑and‑drop model with
human‑friendly thresholds. These rules ensure predictable, accessible,
and consistent behavior across all interactions.
