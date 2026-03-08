// ============================================================
// FILE: ui/rotation.js
// PURPOSE: Clean, contract‑pure rotation session with normalized
//          logging, RotationSession singleton, exclusivity guard,
//          cleaned computePivotPreview, and drop‑in compatibility.
// ============================================================

import { findDominoCells } from "../engine/grid.js";
import { isDragDropActive } from "./dragDrop.js";

// ------------------------------------------------------------
// Debug logger (normalized L2 style)
// ------------------------------------------------------------
function logRotation(event, data = {}) {
  console.log(
    `%c[ROTATION] ${event}`,
    "color:#c71585;font-weight:bold;",
    data
  );
}

// ------------------------------------------------------------
// RotationSession singleton
// ------------------------------------------------------------
const RotationSession = {
  dominos: null,
  grid: null,
  trayEl: null,
  boardEl: null,
  renderPuzzle: null,

  rotatingDomino: null,
  rotationGhost: null,
  rotationPointerId: null,
  rotationSessionHalf: null,

  DoubleClickWindow: 250,
  pendingExitTimeoutId: null,

  configure(dominos, grid, trayEl, boardEl, renderPuzzle) {
    this.dominos = dominos;
    this.grid = grid;
    this.trayEl = trayEl;
    this.boardEl = boardEl;
    this.renderPuzzle = renderPuzzle;
  },

  isActive() {
    return this.rotatingDomino !== null;
  },

  clearSession() {
    logRotation("Rotation.SessionCleared");

    this.rotationGhost = null;
    this.rotatingDomino = null;
    this.rotationPointerId = null;
    this.rotationSessionHalf = null;

    if (this.pendingExitTimeoutId !== null) {
      clearTimeout(this.pendingExitTimeoutId);
      this.pendingExitTimeoutId = null;
    }

    this.renderPuzzle();
  },

  dispatchCommit(ghost) {
    logRotation("Rotation.CommitDispatched", { proposal: ghost });

    this.boardEl.dispatchEvent(
      new CustomEvent("pips:rotate:proposal", {
        bubbles: true,
        detail: { proposal: ghost }
      })
    );
  },

  computePreview(prev, pivotHalf) {
    const half0 = { r: prev.r0, c: prev.c0 };
    const half1 = { r: prev.r1, c: prev.c1 };

    const pivot = pivotHalf === 0 ? half0 : half1;
    const other = pivotHalf === 0 ? half1 : half0;

    const dr = other.r - pivot.r;
    const dc = other.c - pivot.c;

    const rotatedOther = {
      r: pivot.r + dc,
      c: pivot.c - dr
    };

    if (pivotHalf === 0) {
      return {
        row0: pivot.r,
        col0: pivot.c,
        row1: rotatedOther.r,
        col1: rotatedOther.c
      };
    } else {
      return {
        row0: rotatedOther.r,
        col0: rotatedOther.c,
        row1: pivot.r,
        col1: pivot.c
      };
    }
  },

  handleTrayClick(event) {
    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const domino = this.dominos.get(id);
    if (!domino) return;

    if (domino.row0 !== null || domino.row1 !== null) return;

    domino.trayOrientation = ((domino.trayOrientation || 0) + 90) % 360;

    logRotation("Rotation.TrayRotate", {
      id,
      newOrientation: domino.trayOrientation
    });

    this.renderPuzzle();
  },

  handleDblClick(event) {
    if (isDragDropActive()) return;

    const wrapper = event.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!this.boardEl.contains(wrapper)) return;

    const id = wrapper.dataset.dominoId;
    const domino = this.dominos.get(id);
    if (!domino) return;

    const halfEl = event.target.closest(".half");
    const clickedHalf = halfEl
      ? (halfEl.classList.contains("half1") ? 1 : 0)
      : 0;

    if (this.rotatingDomino && this.rotationSessionHalf !== null) {
      const sameDomino = String(this.rotatingDomino.id) === String(id);
      const sameHalf = sameDomino && clickedHalf === this.rotationSessionHalf;

      if (!sameHalf) {
        logRotation("Rotation.Exit.Outside", {
          id: this.rotatingDomino.id,
          ghost: this.rotationGhost
        });

        if (this.rotationGhost) {
          this.dispatchCommit(this.rotationGhost);
        }

        this.clearSession();
      } else {
        if (this.pendingExitTimeoutId !== null) {
          clearTimeout(this.pendingExitTimeoutId);
          this.pendingExitTimeoutId = null;
        }
      }
    }

    const cells = findDominoCells(this.grid, String(id));
    if (!cells || cells.length !== 2) return;

    const cell0 = cells.find(c => c.half === 0);
    const cell1 = cells.find(c => c.half === 1);
    if (!cell0 || !cell1) return;

    const prev = {
      r0: cell0.row,
      c0: cell0.col,
      r1: cell1.row,
      c1: cell1.col
    };

    logRotation("Rotation.SessionStart", {
      id,
      clickedHalf,
      prev
    });

    const pivotHalf =
      this.rotatingDomino && this.rotationSessionHalf !== null
        ? this.rotationSessionHalf
        : clickedHalf;

    const preview = this.computePreview(prev, pivotHalf);
    if (!preview) return;

    logRotation("Rotation.PreviewComputed", {
      id,
      pivotHalf,
      preview
    });

    this.rotatingDomino = domino;
    this.rotationSessionHalf = pivotHalf;
    this.rotationGhost = {
      id: domino.id,
      row0: preview.row0,
      col0: preview.col0,
      row1: preview.row1,
      col1: preview.col1
    };
    this.rotationPointerId = null;

    this.renderPuzzle();

    logRotation("Rotation.PreviewRendered", {
      id: domino.id,
      ghost: this.rotationGhost
    });
  },

  handlePointerDown(event) {
    if (!this.rotatingDomino) return;

    const wrapper = event.target.closest(".domino-wrapper");
    const halfEl = event.target.closest(".half");

    const sameDomino =
      wrapper && wrapper.dataset.dominoId === String(this.rotatingDomino.id);

    const sameHalf =
      sameDomino &&
      halfEl &&
      ((halfEl.classList.contains("half1") ? 1 : 0) === this.rotationSessionHalf);

    if (sameHalf) {
      this.rotationPointerId = event.pointerId;

      logRotation("Rotation.AdjustStart", {
        id: this.rotatingDomino.id,
        pointerId: event.pointerId,
        ghost: this.rotationGhost
      });

      return;
    }

    logRotation("Rotation.Exit.Outside", {
      id: this.rotatingDomino.id,
      ghost: this.rotationGhost
    });

    if (this.pendingExitTimeoutId !== null) {
      clearTimeout(this.pendingExitTimeoutId);
      this.pendingExitTimeoutId = null;
    }

    if (this.rotationGhost) {
      this.dispatchCommit(this.rotationGhost);
    }

    this.clearSession();
  },

  handlePointerUp(event) {
    if (!this.rotatingDomino) return;

    if (this.rotationPointerId !== null && event.pointerId === this.rotationPointerId) {
      logRotation("Rotation.AdjustEnd", {
        id: this.rotatingDomino.id,
        pointerId: event.pointerId,
        ghost: this.rotationGhost
      });

      this.rotationPointerId = null;

      if (this.pendingExitTimeoutId !== null) {
        clearTimeout(this.pendingExitTimeoutId);
        this.pendingExitTimeoutId = null;
      }

      if (this.rotationGhost) {
        this.pendingExitTimeoutId = setTimeout(() => {
          logRotation("Rotation.Exit.SameHalf", {
            id: this.rotatingDomino.id,
            ghost: this.rotationGhost
          });

          this.dispatchCommit(this.rotationGhost);
          this.clearSession();
        }, this.DoubleClickWindow);
      }

      return;
    }

    const wrapper = event.target.closest(".domino-wrapper");
    const halfEl = event.target.closest(".half");

    const sameDomino =
      wrapper && this.rotatingDomino && wrapper.dataset.dominoId === String(this.rotatingDomino.id);

    const sameHalf =
      sameDomino &&
      halfEl &&
      ((halfEl.classList.contains("half1") ? 1 : 0) === this.rotationSessionHalf);

    if (sameHalf) {
      if (this.pendingExitTimeoutId !== null) {
        clearTimeout(this.pendingExitTimeoutId);
        this.pendingExitTimeoutId = null;
      }

      if (this.rotationGhost) {
        this.pendingExitTimeoutId = setTimeout(() => {
          logRotation("Rotation.Exit.SameHalf", {
            id: this.rotatingDomino.id,
            ghost: this.rotationGhost
          });

          this.dispatchCommit(this.rotationGhost);
          this.clearSession();
        }, this.DoubleClickWindow);
      }
    }
  },

  handlePointerCancel(event) {
    if (!this.rotatingDomino) return;
    if (this.rotationPointerId !== null && event.pointerId !== this.rotationPointerId) return;

    logRotation("Rotation.Cancel", {
      id: this.rotatingDomino?.id
    });

    if (this.pendingExitTimeoutId !== null) {
      clearTimeout(this.pendingExitTimeoutId);
      this.pendingExitTimeoutId = null;
    }

    this.clearSession();
  }
};

// ------------------------------------------------------------
// Public initializer
// ------------------------------------------------------------
export function initRotation(dominos, grid, trayEl, boardEl, renderPuzzle) {
  RotationSession.configure(dominos, grid, trayEl, boardEl, renderPuzzle);

  trayEl.addEventListener("click", RotationSession.handleTrayClick.bind(RotationSession));
  document.addEventListener("dblclick", RotationSession.handleDblClick.bind(RotationSession));
  document.addEventListener("pointerdown", RotationSession.handlePointerDown.bind(RotationSession));
  document.addEventListener("pointerup", RotationSession.handlePointerUp.bind(RotationSession));
  document.addEventListener("pointercancel", RotationSession.handlePointerCancel.bind(RotationSession));
}

// ------------------------------------------------------------
// Public helpers
// ------------------------------------------------------------
export function getRotatingDominoId() {
  return RotationSession.rotatingDomino?.id ?? null;
}

export function getRotationGhost() {
  return RotationSession.rotationGhost;
}

export function isRotationSessionActive() {
  return RotationSession.isActive();
}
