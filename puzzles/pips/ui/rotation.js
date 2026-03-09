// ============================================================
// FILE: ui/rotation.js
// PURPOSE:
//   Contract‑pure board rotation with:
//   - BoardRotatePreview from grid
//   - Same‑half double‑click rotation (pivot fixed)
//   - Same‑Half Click Disambiguation (§7.5.5)
//   - Optional Adjust (terminal, snapped translation)
//   - Exit Trigger A/B → single proposal
//   - Await engine authority (commit/reject)
//   - Pointer exclusivity on the board
//   Tray rotation remains visual‑only.
// ============================================================

import { findDominoCells } from "../engine/grid.js";
import { isDragDropActive } from "./dragDrop.js";

// ------------------------------------------------------------
// Logging (kept lightweight)
// ------------------------------------------------------------
function logRotation(event, data = {}) {
  console.log(`[rotation] ${event}`, data);
}

// ------------------------------------------------------------
// State enum
// ------------------------------------------------------------
const RS = {
  Idle: "Idle",
  Preview: "Preview",
  Ambiguous: "Ambiguous",
  Adjust: "Adjust",
  AwaitResult: "AwaitResult"
};

// ------------------------------------------------------------
// RotationSession singleton
// ------------------------------------------------------------
const RotationSession = {
  dominos: null,
  grid: null,
  trayEl: null,
  boardEl: null,
  renderPuzzle: null,

  state: RS.Idle,
  rotatingDomino: null,
  pivotHalf: null,
  ghost: null,

  adjustPointerId: null,
  adjustStartCell: null,

  // Ambiguous click fields
  ambigPointerId: null,
  ambigStartXY: null,
  ambigStartTime: null,
  ambigHalf: null,

  // Passive OS double‑click interval learning
  lastNativeDblClickInterval: 350,
  lastClickTime: null,

  configure(dominos, grid, trayEl, boardEl, renderPuzzle) {
    this.dominos = dominos;
    this.grid = grid;
    this.trayEl = trayEl;
    this.boardEl = boardEl;
    this.renderPuzzle = renderPuzzle;
  },

  isActive() {
    return this.state !== RS.Idle;
  },

  clearSession() {
    logRotation("SessionClear", {
      id: this.rotatingDomino?.id ?? null,
      state: this.state
    });

    this.state = RS.Idle;
    this.rotatingDomino = null;
    this.pivotHalf = null;
    this.ghost = null;

    this.adjustPointerId = null;
    this.adjustStartCell = null;

    this.ambigPointerId = null;
    this.ambigStartXY = null;
    this.ambigStartTime = null;
    this.ambigHalf = null;

    this.renderPuzzle();
  },

  // ----------------------------------------------------------
  // Tray rotation (visual‑only)
  // ----------------------------------------------------------
  handleTrayClick(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const d = this.dominos.get(id);
    if (!d) return;

    if (d.row0 !== null || d.row1 !== null) return;

    d.trayOrientation = ((d.trayOrientation || 0) + 90) % 360;
    logRotation("TrayRotate", { id, orientation: d.trayOrientation });
    this.renderPuzzle();
  },

  // ----------------------------------------------------------
  // Helpers: rotation geometry
  // ----------------------------------------------------------
  rotateOnce(prev, pivotHalf) {
    const half0 = { r: prev.row0, c: prev.col0 };
    const half1 = { r: prev.row1, c: prev.col1 };

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

  cellFromPointer(ev) {
    const rows = this.grid.length;
    const cols = this.grid[0].length;

    const rect = this.boardEl.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

    const cellW = rect.width / cols;
    const cellH = rect.height / rows;

    return {
      r: Math.floor(y / cellH),
      c: Math.floor(x / cellW)
    };
  },

  // ----------------------------------------------------------
  // Start rotation session (double‑click)
  // ----------------------------------------------------------
  handleDblClick(ev) {
    const now = performance.now();
    if (this.lastClickTime != null) {
      this.lastNativeDblClickInterval = now - this.lastClickTime;
    }
    this.lastClickTime = now;

    if (isDragDropActive()) return;

    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!this.boardEl.contains(wrapper)) return;

    const id = wrapper.dataset.dominoId;
    const d = this.dominos.get(id);
    if (!d) return;

    const halfEl = ev.target.closest(".half");
    const clickedHalf = halfEl && halfEl.classList.contains("half1") ? 1 : 0;

    const sameDomino =
      this.rotatingDomino && String(this.rotatingDomino.id) === String(id);

    // Ambiguous → RotateAgain
    if (this.state === RS.Ambiguous && sameDomino && clickedHalf === this.ambigHalf) {
      const now2 = performance.now();
      if (now2 - this.ambigStartTime <= this.lastNativeDblClickInterval) {
        const next = this.rotateOnce(this.ghost, this.pivotHalf);
        this.ghost = {
          id: this.rotatingDomino.id,
          row0: next.row0,
          col0: next.col0,
          row1: next.row1,
          col1: next.col1
        };
        this.state = RS.Preview;
        logRotation("Ambiguous→RotateAgain", { id, ghost: this.ghost });
        this.renderPuzzle();
        return;
      }
    }

    // Preview → RotateAgain (normal dblclick)
    if (this.state === RS.Preview && sameDomino && clickedHalf === this.pivotHalf && this.ghost) {
      const next = this.rotateOnce(this.ghost, this.pivotHalf);
      this.ghost = {
        id: this.rotatingDomino.id,
        row0: next.row0,
        col0: next.col0,
        row1: next.row1,
        col1: next.col1
      };
      logRotation("PreviewRotateAgain", { id, ghost: this.ghost });
      this.renderPuzzle();
      return;
    }

    // If session active but not same domino/half, ignore here
    if (this.isActive()) return;

    // New session
    const cells = findDominoCells(this.grid, String(id));
    if (!cells || cells.length !== 2) return;

    const c0 = cells.find(c => c.half === 0);
    const c1 = cells.find(c => c.half === 1);
    if (!c0 || !c1) return;

    const prev = {
      row0: c0.row,
      col0: c0.col,
      row1: c1.row,
      col1: c1.col
    };

    const next = this.rotateOnce(prev, clickedHalf);

    this.rotatingDomino = d;
    this.pivotHalf = clickedHalf;
    this.ghost = {
      id: d.id,
      row0: next.row0,
      col0: next.col0,
      row1: next.row1,
      col1: next.col1
    };

    this.state = RS.Preview;
    logRotation("SessionStartPreview", { id, pivotHalf: clickedHalf, ghost: this.ghost });
    this.renderPuzzle();
  },

  // ----------------------------------------------------------
  // PointerDown: Ambiguous start or Exit Trigger B
  // ----------------------------------------------------------
  handlePointerDown(ev) {
    // Ambiguous timeout check
    if (this.state === RS.Ambiguous) {
      const now = performance.now();
      if (now - this.ambigStartTime > this.lastNativeDblClickInterval) {
        logRotation("AmbiguousTimeout→ExitA", { id: this.rotatingDomino.id });
        this.emitProposalAndAwait();
        return;
      }
    }

    if (!this.isActive()) return;

    const wrapper = ev.target.closest(".domino-wrapper");
    const halfEl = ev.target.closest(".half");

    const sameDomino =
      wrapper && this.rotatingDomino && wrapper.dataset.dominoId === String(this.rotatingDomino.id);

    const clickedHalf =
      halfEl && halfEl.classList.contains("half1") ? 1 : 0;

    const sameHalf =
      sameDomino && halfEl && clickedHalf === this.pivotHalf;

    // Preview → Ambiguous
    if (sameHalf && this.state === RS.Preview) {
      this.state = RS.Ambiguous;
      this.ambigPointerId = ev.pointerId;
      this.ambigStartXY = { x: ev.clientX, y: ev.clientY };
      this.ambigStartTime = performance.now();
      this.ambigHalf = this.pivotHalf;
      logRotation("AmbiguousStart", {
        id: this.rotatingDomino.id,
        xy: this.ambigStartXY,
        interval: this.lastNativeDblClickInterval
      });
      return;
    }

    // Exit Trigger B
    logRotation("ExitTriggerB", { id: this.rotatingDomino.id });
    this.emitProposalAndAwait();
  },

  // ----------------------------------------------------------
  // PointerMove: Ambiguous → Adjust or Adjust move
  // ----------------------------------------------------------
  handlePointerMove(ev) {
    // Ambiguous timeout check
    if (this.state === RS.Ambiguous) {
      const now = performance.now();
      if (now - this.ambigStartTime > this.lastNativeDblClickInterval) {
        logRotation("AmbiguousTimeout→ExitA", { id: this.rotatingDomino.id });
        this.emitProposalAndAwait();
        return;
      }
    }

    // Ambiguous → Adjust on movement
    if (this.state === RS.Ambiguous && ev.pointerId === this.ambigPointerId) {
      const dx = ev.clientX - this.ambigStartXY.x;
      const dy = ev.clientY - this.ambigStartXY.y;

      if (dx !== 0 || dy !== 0) {
        this.state = RS.Adjust;
        this.adjustPointerId = ev.pointerId;
        this.adjustStartCell = this.cellFromPointer(ev);
        logRotation("Ambiguous→Adjust", {
          id: this.rotatingDomino.id,
          startCell: this.adjustStartCell
        });
        return;
      }
    }

    // Adjust move
    if (this.state !== RS.Adjust) return;
    if (ev.pointerId !== this.adjustPointerId) return;
    if (!this.ghost) return;

    const cell = this.cellFromPointer(ev);
    if (!cell || !this.adjustStartCell) return;

    const dr = cell.r - this.adjustStartCell.r;
    const dc = cell.c - this.adjustStartCell.c;

    if (dr === 0 && dc === 0) return;

    this.adjustStartCell = cell;

    this.ghost.row0 += dr;
    this.ghost.col0 += dc;
    this.ghost.row1 += dr;
    this.ghost.col1 += dc;

    logRotation("AdjustMove", { ghost: this.ghost });
    this.renderPuzzle();
  },

  // ----------------------------------------------------------
  // PointerUp: Ambiguous stays ambiguous; Adjust → Exit A
  // ----------------------------------------------------------
  handlePointerUp(ev) {
    // Ambiguous timeout check
    if (this.state === RS.Ambiguous) {
      const now = performance.now();
      if (now - this.ambigStartTime > this.lastNativeDblClickInterval) {
        logRotation("AmbiguousTimeout→ExitA", { id: this.rotatingDomino.id });
        this.emitProposalAndAwait();
        return;
      }
    }

    // Ambiguous pointerUp does not resolve
    if (this.state === RS.Ambiguous && ev.pointerId === this.ambigPointerId) {
      logRotation("AmbiguousPointerUp", { id: this.rotatingDomino.id });
      return;
    }

    // Adjust → Exit Trigger A
    if (this.state !== RS.Adjust) return;
    if (ev.pointerId !== this.adjustPointerId) return;

    logRotation("ExitTriggerA", { id: this.rotatingDomino.id, ghost: this.ghost });
    this.emitProposalAndAwait();
  },

  handlePointerCancel(ev) {
    if (!this.isActive()) return;
    logRotation("PointerCancel", { id: this.rotatingDomino?.id ?? null });
    this.clearSession();
  },

  // ----------------------------------------------------------
  // Proposal + AwaitResult
  // ----------------------------------------------------------
  emitProposalAndAwait() {
    if (!this.ghost || !this.rotatingDomino) {
      this.clearSession();
      return;
    }

    const proposal = { ...this.ghost };
    logRotation("ProposalEmit", { proposal });

    this.state = RS.AwaitResult;

    this.boardEl.dispatchEvent(
      new CustomEvent("pips:rotate:proposal", {
        bubbles: true,
        detail: { proposal }
      })
    );
  },

  handleEngineCommit(ev) {
    if (this.state !== RS.AwaitResult) return;
    if (!this.rotatingDomino) return;

    const { id } = ev.detail || {};
    if (String(id) !== String(this.rotatingDomino.id)) return;

    logRotation("EngineCommit", { id });
    this.clearSession();
  },

  handleEngineReject(ev) {
    if (this.state !== RS.AwaitResult) return;
    if (!this.rotatingDomino) return;

    const { id } = ev.detail || {};
    if (String(id) !== String(this.rotatingDomino.id)) return;

    logRotation("EngineReject", { id });
    this.clearSession();
  }
};

// ------------------------------------------------------------
// Exclusivity: capture‑phase interception of board pointer events
// ------------------------------------------------------------
function installExclusivity(boardEl) {
  const capture = true;

  function intercept(ev) {
    if (!RotationSession.isActive()) return;
    if (!boardEl.contains(ev.target)) return;

    const wrapper = ev.target.closest(".domino-wrapper");
    if (wrapper) return;

    ev.stopImmediatePropagation();
    ev.preventDefault();
  }

  document.addEventListener("pointerdown", intercept, capture);
  document.addEventListener("pointermove", intercept, capture);
  document.addEventListener("pointerup", intercept, capture);
  document.addEventListener("pointercancel", intercept, capture);
}

// ------------------------------------------------------------
// Public initializer
// ------------------------------------------------------------
export function initRotation(dominos, grid, trayEl, boardEl, renderPuzzle) {
  RotationSession.configure(dominos, grid, trayEl, boardEl, renderPuzzle);

  trayEl.addEventListener("click", (ev) => RotationSession.handleTrayClick(ev));

  const capture = true;

  document.addEventListener("dblclick", (ev) => RotationSession.handleDblClick(ev));
  document.addEventListener("pointerdown", (ev) => RotationSession.handlePointerDown(ev), capture);
  document.addEventListener("pointermove", (ev) => RotationSession.handlePointerMove(ev), capture);
  document.addEventListener("pointerup", (ev) => RotationSession.handlePointerUp(ev), capture);
  document.addEventListener("pointercancel", (ev) => RotationSession.handlePointerCancel(ev), capture);

  document.addEventListener("pips:rotate:commit", (ev) => RotationSession.handleEngineCommit(ev));
  document.addEventListener("pips:rotate:reject", (ev) => RotationSession.handleEngineReject(ev));

  installExclusivity(boardEl);
}

// ------------------------------------------------------------
// Public helpers
// ------------------------------------------------------------
export function getRotatingDominoId() {
  return RotationSession.rotatingDomino?.id ?? null;
}

export function getRotationGhost() {
  return RotationSession.ghost;
}

export function isRotationSessionActive() {
  return RotationSession.isActive();
}
