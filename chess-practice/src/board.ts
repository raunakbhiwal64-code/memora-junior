import { Chess, type Square } from 'chess.js';
import { pieceSvg } from './pieces';
import type { Color } from './types';

export interface Arrow {
  from: string;
  to: string;
  /** CSS colour. */
  color: string;
  /** Dashed line, so arrows are told apart by more than colour. */
  dashed?: boolean;
}

export interface BoardState {
  fen: string;
  orientation: Color;
  lastMove?: { from: string; to: string };
  interactive: boolean;
  arrows?: Arrow[];
}

const DRAG_PX = 6;

/**
 * Click / tap / drag board. Pick up a piece (click or drag), then drop it on a highlighted square.
 * Legality comes from chess.js; this class only draws and reports attempted moves.
 */
export class Board {
  private state: BoardState = { fen: new Chess().fen(), orientation: 'w', interactive: false };
  private selected: string | null = null;
  private chess = new Chess();
  private drag: { from: string; x: number; y: number; active: boolean; ghost?: HTMLElement } | null = null;
  private suppressClick = false;
  /** Called with a source / destination pair (promotion already chosen). */
  onMove: (from: string, to: string, promotion?: string) => void = () => {};
  onIllegal: (from: string, to: string) => void = () => {};

  constructor(private root: HTMLElement) {
    root.classList.add('board');
    root.setAttribute('role', 'grid');
    root.setAttribute('aria-label', 'Chess board');
    root.addEventListener('pointerdown', (e) => this.pointerDown(e));
    window.addEventListener('pointermove', (e) => this.pointerMove(e));
    window.addEventListener('pointerup', (e) => this.pointerUp(e));
    window.addEventListener('pointercancel', () => this.endDrag());
  }

  set(state: Partial<BoardState>) {
    this.state = { ...this.state, ...state };
    this.chess = new Chess(this.state.fen);
    this.selected = null;
    this.render();
  }

  /** Clears selection and any floating piece (used when the position is reset). */
  clearSelection() {
    this.selected = null;
    this.endDrag();
    this.render();
  }

  private legalFrom(from: string) {
    return this.chess.moves({ square: from as Square, verbose: true });
  }

  private render(extra?: { promo?: { from: string; to: string } }) {
    const { orientation, lastMove, interactive } = this.state;
    const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
    const ranks = orientation === 'w' ? '87654321' : '12345678';
    const legal = this.selected ? this.legalFrom(this.selected) : [];
    const dests = new Map(legal.map((m) => [m.to as string, !!m.captured]));
    const check = this.chess.inCheck() ? this.kingSquare(this.chess.turn()) : null;
    this.root.innerHTML = '';
    for (const r of ranks) {
      for (const f of files) {
        const s = f + r;
        const piece = this.chess.get(s as Square);
        const dark = (f.charCodeAt(0) - 97 + Number(r)) % 2 === 1;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'sq ' + (dark ? 'dark' : 'light');
        cell.dataset.sq = s;
        cell.setAttribute('aria-label', s + (piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${NAMES[piece.type]}` : ' empty'));
        if (lastMove && (lastMove.from === s || lastMove.to === s)) cell.classList.add('last');
        if (this.selected === s) cell.classList.add('selected');
        if (dests.has(s)) cell.classList.add(dests.get(s) ? 'dest-capture' : 'dest');
        if (check === s) cell.classList.add('check');
        if (this.drag?.active && this.drag.from === s) cell.classList.add('dragging');
        if (piece) cell.insertAdjacentHTML('beforeend', pieceSvg(piece.color, piece.type));
        if (f === files[0]) cell.insertAdjacentHTML('beforeend', `<i class="rk">${r}</i>`);
        if (r === ranks[ranks.length - 1]) cell.insertAdjacentHTML('beforeend', `<i class="fl">${f}</i>`);
        cell.disabled = !interactive;
        cell.addEventListener('click', () => {
          if (this.suppressClick) return;
          this.click(s);
        });
        this.root.appendChild(cell);
      }
    }
    this.root.insertAdjacentHTML('beforeend', this.arrowsSvg());
    if (extra?.promo) this.showPromotion(extra.promo.from, extra.promo.to);
  }

  /** Centre of a square as a percentage of the board, for the current orientation. */
  private centre(sq: string): [number, number] {
    const file = sq.charCodeAt(0) - 97;
    const rank = Number(sq[1]) - 1;
    const flip = this.state.orientation === 'b';
    const col = flip ? 7 - file : file;
    const row = flip ? rank : 7 - rank;
    return [(col + 0.5) * 12.5, (row + 0.5) * 12.5];
  }

  private arrowsSvg(): string {
    const arrows = this.state.arrows ?? [];
    if (!arrows.length) return '';
    const parts = arrows.map((a, i) => {
      const [x1, y1] = this.centre(a.from);
      const [x2, y2] = this.centre(a.to);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const head = 4.6;
      const bx = x2 - ux * head;
      const by = y2 - uy * head;
      const sx = x1 + ux * 2.2;
      const sy = y1 + uy * 2.2;
      const nx = -uy * 2.6;
      const ny = ux * 2.6;
      return (
        `<g class="arrow" opacity="0.82"><line x1="${sx}" y1="${sy}" x2="${bx}" y2="${by}" stroke="${a.color}" stroke-width="2.2" stroke-linecap="round"${a.dashed ? ' stroke-dasharray="3.4 2.6"' : ''}/>` +
        `<polygon points="${x2},${y2} ${bx + nx},${by + ny} ${bx - nx},${by - ny}" fill="${a.color}" stroke="${a.color}" stroke-width="0.6" stroke-linejoin="round"/></g>`
      ).replace('class="arrow"', `class="arrow" data-i="${i}"`);
    });
    return `<svg class="arrows" viewBox="0 0 100 100" aria-hidden="true">${parts.join('')}</svg>`;
  }

  private kingSquare(color: Color): string | null {
    for (const row of this.chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
    return null;
  }

  // ---- drag ----------------------------------------------------------------
  private squareAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('.sq');
    return el && this.root.contains(el) ? (el.dataset.sq ?? null) : null;
  }

  private pointerDown(e: PointerEvent) {
    if (!this.state.interactive || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('.sq');
    const s = el?.dataset.sq;
    if (!s) return;
    const piece = this.chess.get(s as Square);
    if (!piece || piece.color !== this.chess.turn()) return;
    this.drag = { from: s, x: e.clientX, y: e.clientY, active: false };
  }

  private pointerMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_PX) return;
      d.active = true;
      this.selected = d.from;
      this.render();
      const piece = this.chess.get(d.from as Square)!;
      const size = this.root.getBoundingClientRect().width / 8;
      const ghost = document.createElement('div');
      ghost.className = 'ghost';
      ghost.style.width = ghost.style.height = `${size * 1.15}px`;
      ghost.innerHTML = pieceSvg(piece.color, piece.type);
      document.body.appendChild(ghost);
      d.ghost = ghost;
    }
    if (d.ghost) {
      const w = d.ghost.offsetWidth;
      d.ghost.style.left = `${e.clientX - w / 2}px`;
      d.ghost.style.top = `${e.clientY - w / 2}px`;
    }
  }

  private pointerUp(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    if (!d.active) {
      this.drag = null;
      return;
    }
    const to = this.squareAt(e.clientX, e.clientY);
    this.endDrag();
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false), 0);
    if (to && to !== d.from) {
      this.selected = d.from;
      this.click(to);
    } else {
      this.selected = d.from;
      this.render();
    }
  }

  private endDrag() {
    this.drag?.ghost?.remove();
    this.drag = null;
  }

  // ---- click ---------------------------------------------------------------
  private click(s: string) {
    if (!this.state.interactive) return;
    const piece = this.chess.get(s as Square);
    if (this.selected) {
      if (s === this.selected) {
        this.selected = null;
        return this.render();
      }
      const moves = this.legalFrom(this.selected).filter((m) => m.to === s);
      if (moves.length) {
        const from = this.selected;
        if (moves.some((m) => m.promotion)) {
          this.selected = null;
          return this.render({ promo: { from, to: s } });
        }
        this.selected = null;
        return this.onMove(from, s);
      }
      if (piece && piece.color === this.chess.turn()) {
        this.selected = s;
        return this.render();
      }
      const from = this.selected;
      this.selected = null;
      this.render();
      return this.onIllegal(from, s);
    }
    if (piece && piece.color === this.chess.turn()) {
      this.selected = s;
      this.render();
    }
  }

  private showPromotion(from: string, to: string) {
    const box = document.createElement('div');
    box.className = 'promo';
    box.innerHTML = '<p>Promote to:</p>';
    for (const [p, label] of [['q', 'Queen'], ['r', 'Rook'], ['b', 'Bishop'], ['n', 'Knight']] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = label;
      b.addEventListener('click', () => {
        box.remove();
        this.onMove(from, to, p);
      });
      box.appendChild(b);
    }
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => {
      box.remove();
      this.render();
    });
    box.appendChild(cancel);
    // placed below the board, never over the squares
    this.root.parentElement?.appendChild(box);
  }
}

const NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
