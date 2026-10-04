import { Chess, type Square } from 'chess.js';
import type { Color } from './types';

const GLYPH: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

export interface BoardState {
  fen: string;
  orientation: Color;
  lastMove?: { from: string; to: string };
  interactive: boolean;
}

/** Click-to-move board: click a piece, then a highlighted square. */
export class Board {
  private state: BoardState = { fen: new Chess().fen(), orientation: 'w', interactive: false };
  private selected: string | null = null;
  private chess = new Chess();
  /** Called with a legal-or-illegal source/destination pair; promotion is chosen first. */
  onMove: (from: string, to: string, promotion?: string) => void = () => {};
  onIllegal: (from: string, to: string) => void = () => {};

  constructor(private root: HTMLElement) {
    root.classList.add('board');
    root.setAttribute('role', 'grid');
  }

  set(state: Partial<BoardState>) {
    this.state = { ...this.state, ...state };
    this.chess = new Chess(this.state.fen);
    this.selected = null;
    this.render();
  }

  private legalFrom(from: string): string[] {
    return this.chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);
  }

  private render(extra?: { promo?: { from: string; to: string } }) {
    const { orientation, lastMove, interactive } = this.state;
    const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
    const ranks = orientation === 'w' ? '87654321' : '12345678';
    const legal = this.selected ? this.legalFrom(this.selected) : [];
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
        cell.setAttribute('aria-label', s + (piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''));
        if (lastMove && (lastMove.from === s || lastMove.to === s)) cell.classList.add('last');
        if (this.selected === s) cell.classList.add('selected');
        if (legal.includes(s)) cell.classList.add('dest');
        if (check === s) cell.classList.add('check');
        if (piece) {
          const span = document.createElement('span');
          span.className = 'piece ' + (piece.color === 'w' ? 'wp' : 'bp');
          span.textContent = GLYPH[piece.color + piece.type];
          cell.appendChild(span);
        }
        // rank / file labels on the edges
        if (f === files[0]) cell.insertAdjacentHTML('beforeend', `<i class="rk">${r}</i>`);
        if (r === ranks[ranks.length - 1]) cell.insertAdjacentHTML('beforeend', `<i class="fl">${f}</i>`);
        cell.disabled = !interactive;
        cell.addEventListener('click', () => this.click(s));
        this.root.appendChild(cell);
      }
    }
    if (extra?.promo) this.showPromotion(extra.promo.from, extra.promo.to);
  }

  private kingSquare(color: Color): string | null {
    for (const row of this.chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
    return null;
  }

  private click(s: string) {
    if (!this.state.interactive) return;
    const piece = this.chess.get(s as Square);
    if (this.selected) {
      if (s === this.selected) {
        this.selected = null;
        return this.render();
      }
      const moves = this.chess.moves({ square: this.selected as Square, verbose: true }).filter((m) => m.to === s);
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
      b.textContent = label;
      b.addEventListener('click', () => {
        box.remove();
        this.onMove(from, to, p);
      });
      box.appendChild(b);
    }
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => {
      box.remove();
      this.render();
    });
    box.appendChild(cancel);
    this.root.parentElement?.appendChild(box);
  }
}
