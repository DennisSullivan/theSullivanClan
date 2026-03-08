// ============================================================
// FILE: ui/rotation.js
// PURPOSE:
//   Contract‑pure board rotation with:
//   - BoardRotatePreview from grid
//   - Same‑half double‑click rotation (pivot fixed)
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
//  console.log(`[rotation] ${event}`, data);
}

// ------------------------------------------------------------
// State enum
// ------------------------------------------------------------
const RS = {
  Idle: "Idle",
  Preview: "Preview",
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
  rotatingDomino: null,      // { id, ... } from dominos
  pivotHalf: null,           // 0 or 1, fixed for session
  ghost: null,               // { id,row0,col0,row1,col1 }

  adjustPointerId: null,
  adjustStartCell: null,

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

    this.renderPuzzle();
  },

  // ----------------------------------------------------------
  // Tray rotation (visual‑only, unchanged)
  // ----------------------------------------------------------
  handleTrayClick(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const d = this.dominos.get(id);
    if (!d) return;

    // Only rotate tray dominos (not on board)
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
  // Start rotation session (double‑click on board domino)
  // ----------------------------------------------------------
  handleDblClick(ev) {
    if (isDragDropActive()) return;

    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!this.boardEl.contains(wrapper)) return;

    const id = wrapper.dataset.dominoId;
    const d = this.dominos.get(id);
    if (!d) return;

    const halfEl = ev.target.closest(".half");
    const clickedHalf = halfEl && halfEl.classList.contains("half1") ? 1 : 0;

    // If session active, same‑half double‑click rotates preview again
    if (this.state === RS.Preview && this.rotatingDomino && String(this.rotatingDomino.id) === String(id)) {
      if (clickedHalf === this.pivotHalf && this.ghost) {
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
      }
      return;
    }

    // If session active but not same domino/half, ignore here;
    // Exit Trigger B is handled by pointerDown.
    if (this.isActive()) return;

    // New session: get committed geometry from grid
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
  // PointerDown: Adjust entry or Exit Trigger B
  // ----------------------------------------------------------
  handlePointerDown(ev) {
    if (!this.isActive()) return;

    const wrapper = ev.target.closest(".domino-wrapper");
    const halfEl = ev.target.closest(".half");

    const sameDomino =
      wrapper && this.rotatingDomino && wrapper.dataset.dominoId === String(this.rotatingDomino.id);

    const sameHalf =
      sameDomino &&
      halfEl &&
      ((halfEl.classList.contains("half1") ? 1 : 0) === this.pivotHalf);

    if (sameHalf) {
      // BoardRotateAdjust (terminal, snapped)
      this.state = RS.Adjust;
      this.adjustPointerId = ev.pointerId;
      this.adjustStartCell = this.cellFromPointer(ev);
      logRotation("AdjustStart", {
        id: this.rotatingDomino.id,
        startCell: this.adjustStartCell,
        ghost: this.ghost
      });
      return;
    }

    // Exit Trigger B — pointerDown anywhere else
    logRotation("ExitTriggerB", { id: this.rotatingDomino.id });
    this.emitProposalAndAwait();
  },

  // ----------------------------------------------------------
  // PointerMove during Adjust: snapped translation
  // ----------------------------------------------------------
  handlePointerMove(ev) {
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
  // PointerUp during Adjust: Exit Trigger A
  // ----------------------------------------------------------
  handlePointerUp(ev) {
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

    // Allow events that originate on a domino wrapper to pass through
    // so rotation can see same‑half / other‑half clicks.
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

  // Rotation handlers run in capture phase so they see events
  // before exclusivity stops propagation.
  const capture = true;

  document.addEventListener("dblclick", (ev) => RotationSession.handleDblClick(ev));
  document.addEventListener("pointerdown", (ev) => RotationSession.handlePointerDown(ev), capture);
  document.addEventListener("pointermove", (ev) => RotationSession.handlePointerMove(ev), capture);
  document.addEventListener("pointerup", (ev) => RotationSession.handlePointerUp(ev), capture);
  document.addEventListener("pointercancel", (ev) => RotationSession.handlePointerCancel(ev), capture);

  document.addEventListener("pips:rotate:commit", (ev) => RotationSession.handleEngineCommit(ev));
  document.addEventListener("pips:rotate:reject", (ev) => RotationSession.handleEngineReject(ev));

  // Install exclusivity *after* rotation handlers, also in capture phase.
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
