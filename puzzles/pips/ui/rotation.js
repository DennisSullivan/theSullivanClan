// ============================================================
// FILE: ui/rotation.js
// PURPOSE:
//   Contract‑pure board rotation with explicit state machine,
//   pointer exclusivity, correct same‑half disambiguation,
//   simple Adjust translation (option B), and engine‑authority
//   handshake. Tray rotation unchanged.
// ============================================================

import { findDominoCells } from "../engine/grid.js";
import { isDragDropActive } from "./dragDrop.js";

// ------------------------------------------------------------
// Logging (L2 normalized)
// ------------------------------------------------------------
function logRotation(event, data = {}) {
  console.log(
    `%c[ROTATION] ${event}`,
    "color:#c71585;font-weight:bold;",
    data
  );
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
  rotationSessionHalf: null,
  rotationGhost: null,

  ambiguousTimer: null,
  ambiguousStartX: 0,
  ambiguousStartY: 0,
  ambiguousPointerId: null,

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
    logRotation("SessionCleared");

    this.state = RS.Idle;
    this.rotatingDomino = null;
    this.rotationSessionHalf = null;
    this.rotationGhost = null;

    if (this.ambiguousTimer) {
      clearTimeout(this.ambiguousTimer);
      this.ambiguousTimer = null;
    }

    this.ambiguousPointerId = null;
    this.adjustPointerId = null;
    this.adjustStartCell = null;

    this.renderPuzzle();
  },

  // ------------------------------------------------------------
  // Tray rotation (visual‑only)
  // ------------------------------------------------------------
  handleTrayClick(ev) {
    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;

    const id = wrapper.dataset.dominoId;
    const d = this.dominos.get(id);
    if (!d) return;

    if (d.row0 !== null || d.row1 !== null) return;

    d.trayOrientation = ((d.trayOrientation || 0) + 90) % 360;

    logRotation("TrayRotate", { id, newOrientation: d.trayOrientation });
    this.renderPuzzle();
  },

  // ------------------------------------------------------------
  // Compute 90° rotation preview around pivot half
  // ------------------------------------------------------------
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

    return pivotHalf === 0
      ? { row0: pivot.r, col0: pivot.c, row1: rotatedOther.r, col1: rotatedOther.c }
      : { row0: rotatedOther.r, col0: rotatedOther.c, row1: pivot.r, col1: pivot.c };
  },

  // ------------------------------------------------------------
  // Begin rotation session (double‑click)
  // ------------------------------------------------------------
  handleDblClick(ev) {
    if (isDragDropActive()) return;

    const wrapper = ev.target.closest(".domino-wrapper");
    if (!wrapper) return;
    if (!this.boardEl.contains(wrapper)) return;

    const id = wrapper.dataset.dominoId;
    const d = this.dominos.get(id);
    if (!d) return;

    const halfEl = ev.target.closest(".half");
    const clickedHalf = halfEl
      ? (halfEl.classList.contains("half1") ? 1 : 0)
      : 0;

    // If session active, check same‑half priority
    if (this.state !== RS.Idle) {
      const sameDomino = String(this.rotatingDomino.id) === String(id);
      const sameHalf = sameDomino && clickedHalf === this.rotationSessionHalf;

      if (!sameHalf) {
        // Exit Trigger B
        logRotation("ExitTriggerB", { id: this.rotatingDomino.id });
        this.emitProposalAndAwait();
        return;
      }

      // Same‑half double‑click → rotate again
      this.applyNextRotation(d, clickedHalf);
      return;
    }

    // Start new session
    const cells = findDominoCells(this.grid, String(id));
    if (!cells || cells.length !== 2) return;

    const c0 = cells.find(c => c.half === 0);
    const c1 = cells.find(c => c.half === 1);
    if (!c0 || !c1) return;

    const prev = { r0: c0.row, c0: c0.col, r1: c1.row, c1: c1.col };

    logRotation("SessionStart", { id, clickedHalf, prev });

    const preview = this.computePreview(prev, clickedHalf);
    if (!preview) return;

    this.rotatingDomino = d;
    this.rotationSessionHalf = clickedHalf;
    this.rotationGhost = {
      id: d.id,
      row0: preview.row0,
      col0: preview.col0,
      row1: preview.row1,
      col1: preview.col1
    };

    this.state = RS.Preview;
    this.renderPuzzle();

    logRotation("PreviewRendered", { id: d.id, ghost: this.rotationGhost });
  },

  // ------------------------------------------------------------
  // Apply next rotation during active session
  // ------------------------------------------------------------
  applyNextRotation(domino, pivotHalf) {
    const cells = findDominoCells(this.grid, String(domino.id));
    if (!cells || cells.length !== 2) return;

    const c0 = cells.find(c => c.half === 0);
    const c1 = cells.find(c => c.half === 1);
    if (!c0 || !c1) return;

    const prev = { r0: c0.row, c0: c0.col, r1: c1.row, c1: c1.col };
    const preview = this.computePreview(prev, pivotHalf);

    this.rotationGhost = {
      id: domino.id,
      row0: preview.row0,
      col0: preview.col0,
      row1: preview.row1,
      col1: preview.col1
    };

    this.state = RS.Preview;
    this.renderPuzzle();

    logRotation("PreviewUpdated", { id: domino.id, ghost: this.rotationGhost });
  },

  // ------------------------------------------------------------
  // PointerDown → Ambiguous (same‑half) or ExitTriggerB
  // ------------------------------------------------------------
  handlePointerDown(ev) {
    if (this.state === RS.Idle) return;

    const wrapper = ev.target.closest(".domino-wrapper");
    const halfEl = ev.target.closest(".half");

    const sameDomino =
      wrapper && wrapper.dataset.dominoId === String(this.rotatingDomino.id);

    const sameHalf =
      sameDomino &&
      halfEl &&
      ((halfEl.classList.contains("half1") ? 1 : 0) === this.rotationSessionHalf);

    if (!sameHalf) {
      // Exit Trigger B
      logRotation("ExitTriggerB", { id: this.rotatingDomino.id });
      this.emitProposalAndAwait();
      return;
    }

    // Same‑half pointerDown → Ambiguous
    this.state = RS.Ambiguous;
    this.ambiguousPointerId = ev.pointerId;
    this.ambiguousStartX = ev.clientX;
    this.ambiguousStartY = ev.clientY;

    // Timeout → ExitTriggerA
    this.ambiguousTimer = setTimeout(() => {
      if (this.state === RS.Ambiguous) {
        logRotation("ExitTriggerA", { id: this.rotatingDomino.id });
        this.emitProposalAndAwait();
      }
    }, 250);
  },

  // ------------------------------------------------------------
  // PointerMove → movement before timeout → Adjust
  // ------------------------------------------------------------
  handlePointerMove(ev) {
    if (this.state !== RS.Ambiguous && this.state !== RS.Adjust) return;
    if (ev.pointerId !== this.ambiguousPointerId && ev.pointerId !== this.adjustPointerId) return;

    if (this.state === RS.Ambiguous) {
      const dx = Math.abs(ev.clientX - this.ambiguousStartX);
      const dy = Math.abs(ev.clientY - this.ambiguousStartY);
      if (dx > 0 || dy > 0) {
        // Movement → Adjust
        clearTimeout(this.ambiguousTimer);
        this.ambiguousTimer = null;

        this.state = RS.Adjust;
        this.adjustPointerId = this.ambiguousPointerId;
        this.adjustStartCell = this.cellFromPointer(ev);

        logRotation("AdjustStart", {
          id: this.rotatingDomino.id,
          startCell: this.adjustStartCell
        });
      }
      return;
    }

    if (this.state === RS.Adjust) {
      const currentCell = this.cellFromPointer(ev);
      if (!currentCell) return;

      const dr = currentCell.r - this.adjustStartCell.r;
      const dc = currentCell.c - this.adjustStartCell.c;

      if (dr !== 0 || dc !== 0) {
        this.adjustStartCell = currentCell;

        this.rotationGhost.row0 += dr;
        this.rotationGhost.col0 += dc;
        this.rotationGhost.row1 += dr;
        this.rotationGhost.col1 += dc;

        logRotation("AdjustMove", { ghost: this.rotationGhost });
        this.renderPuzzle();
      }
    }
  },

  // ------------------------------------------------------------
  // PointerUp during Ambiguous → wait for timeout
  // PointerUp during Adjust → return to Ambiguous window
  // ------------------------------------------------------------
  handlePointerUp(ev) {
    if (this.state === RS.Ambiguous) {
      // Do nothing; timeout will classify ExitTriggerA
      return;
    }

    if (this.state === RS.Adjust && ev.pointerId === this.adjustPointerId) {
      // After adjust ends, return to Ambiguous window
      this.state = RS.Ambiguous;
      this.ambiguousPointerId = ev.pointerId;
      this.ambiguousStartX = ev.clientX;
      this.ambiguousStartY = ev.clientY;

      this.ambiguousTimer = setTimeout(() => {
        if (this.state === RS.Ambiguous) {
          logRotation("ExitTriggerA", { id: this.rotatingDomino.id });
          this.emitProposalAndAwait();
        }
      }, 250);

      logRotation("AdjustEnd", { id: this.rotatingDomino.id });
    }
  },

  // ------------------------------------------------------------
  // PointerCancel → cancel session
  // ------------------------------------------------------------
  handlePointerCancel(ev) {
    if (!this.isActive()) return;
    logRotation("PointerCancel", { id: this.rotatingDomino?.id });
    this.clearSession();
  },

  // ------------------------------------------------------------
  // Convert pointer → board cell (simple)
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // Emit proposal and wait for engine authority
  // ------------------------------------------------------------
  emitProposalAndAwait() {
    if (!this.rotationGhost) {
      this.clearSession();
      return;
    }

    const ghost = this.rotationGhost;
    logRotation("ProposalEmitted", { ghost });

    this.state = RS.AwaitResult;

    this.boardEl.dispatchEvent(
      new CustomEvent("pips:rotate:proposal", {
        bubbles: true,
        detail: { proposal: ghost }
      })
    );
  },

  // ------------------------------------------------------------
  // Engine result handlers
  // ------------------------------------------------------------
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
    if (RotationSession.isActive()) {
      if (boardEl.contains(ev.target)) {
        ev.stopImmediatePropagation();
        ev.preventDefault();
      }
    }
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

  installExclusivity(boardEl);

  trayEl.addEventListener("click", RotationSession.handleTrayClick.bind(RotationSession));

  document.addEventListener("dblclick", RotationSession.handleDblClick.bind(RotationSession));
  document.addEventListener("pointerdown", RotationSession.handlePointerDown.bind(RotationSession));
  document.addEventListener("pointermove", RotationSession.handlePointerMove.bind(RotationSession));
  document.addEventListener("pointerup", RotationSession.handlePointerUp.bind(RotationSession));
  document.addEventListener("pointercancel", RotationSession.handlePointerCancel.bind(RotationSession));

  document.addEventListener("pips:rotate:commit", RotationSession.handleEngineCommit.bind(RotationSession));
  document.addEventListener("pips:rotate:reject", RotationSession.handleEngineReject.bind(RotationSession));
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
