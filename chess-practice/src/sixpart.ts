import { Chess } from 'chess.js';
import { NAME, VALUE, describeFork, material, materialLabel, opp, pieceAt, playLine, sq, threatenedPieces } from './facts';
import { moveFromUci } from './pgn';
import { describeScore, formatScore } from './score';
import type { Moment, Score } from './types';

/** One reusable habit per tag. Only used when the tag has concrete evidence. */
export const RULES: Record<string, string> = {
  'hung piece': 'Before every move: is each of my pieces protected, or safe from a cheaper attacker?',
  'knight fork': 'Where can their knights land next move, and what would they attack from there?',
  'missed check/capture/threat scan': 'What did his last move attack or threaten?',
  'forcing move without capture-check': 'After my check or capture, what can they take or check in reply?',
  'king safety / castling into attack': 'Before castling, what lines are open at that king?',
  'early queen move': 'If I move the queen now, can their pieces hit it with tempo?',
  'loosening pawn move': 'Before a pawn move near my king: which checks and captures does it allow?',
  'missed pawn break': 'Which pawn break would change the structure in my favour before I make a waiting move?',
  'rook placement': 'Which file is open or half-open for my rooks? Pawn up: where are my rooks?',
  'missed tactic (other)': 'After either side\'s forcing move, scan checks, captures and threats before answering.',
  'allowed mate threat': 'Is my king about to get mated before this quiet move?',
  'endgame technique: king activity': 'Where does my king help most right now, and is it as active as it can be?',
  'endgame technique: opposition': 'Who has the opposition, and does this king move keep or win it?',
  'endgame technique: rook behind passed pawn': 'Is my rook behind the passed pawn, where it works best?',
  'endgame technique: passed-pawn race': 'Who queens first, and can my passed pawn move now?',
  'endgame technique: wrong trade': 'Does this trade help me, or does it trade away the pieces I need?',
  'endgame technique: missed win/draw': 'What is the one move that keeps the win or the draw here?',
};

export interface SixPart {
  /** 1. Position. */
  position: string;
  /** 2. What you played (in the real game). */
  played: string;
  /** 3. Why it fails. */
  whyFails: string;
  /** 4. Better move and the idea. */
  better: string;
  /** 5. Pattern tag, or an honest "none". */
  tag: string;
  /** 6. One reusable rule, or null when no evidence-backed tag exists. */
  rule: string | null;
  /** Said plainly when the top two moves are close or the engine disagrees with the obvious idea. */
  closeCall?: string;
  /** Where this mistake sits in its game, when that is known. */
  context?: string;
  /** True when a section could not be explained from the board and the engine line. */
  needsReview: boolean;
  betterLineSan: string[];
  refutationSan: string[];
}

const numbered = (fen: string, sans: string[], startsWithWhite: boolean, startMove: number): string => {
  void fen;
  const out: string[] = [];
  let n = startMove;
  let white = startsWithWhite;
  sans.forEach((s, i) => {
    if (white) out.push(`${n}.${s}`);
    else out.push(i === 0 ? `${n}...${s}` : s);
    if (!white) n++;
    white = !white;
  });
  return out.join(' ');
};

/** Plain words for what the opponent's first reply does. */
function describeReply(fenAfter: string, ref: ReturnType<typeof playLine>, mine: 'w' | 'b'): string | null {
  const r1 = ref.moves[0];
  if (!r1) return null;
  const finalMate = ref.fens.some((f) => new Chess(f).isCheckmate());
  if (finalMate) {
    const idx = ref.fens.findIndex((f) => new Chess(f).isCheckmate());
    return `they have a forced checkmate: ${ref.sans.slice(0, idx).join(' ')}`;
  }
  const after = new Chess(ref.fens[1]);
  if (r1.captured && r1.color === opp(mine)) {
    const defended = new Chess(fenAfter).attackers(sq(r1.to), mine).length > 0;
    return `${r1.san} takes your ${NAME[r1.captured]} on ${r1.to}${defended ? ' (it was defended, but the trade favours them)' : ', and nothing of yours protected it'}`;
  }
  const fork = describeFork(ref.fens[1], r1.to);
  if (fork) return `${r1.san} ${fork}`;
  if (after.inCheck()) return `${r1.san} gives check and takes the initiative`;
  const newThreats = threatenedPieces(ref.fens[1], mine).filter((t) => !threatenedPieces(fenAfter, mine).some((o) => o.square === t.square));
  if (newThreats.length) return `${r1.san} attacks your ${NAME[newThreats[0].type]} on ${newThreats[0].square}`;
  return null;
}

/** Short idea behind the engine's move, from board facts only. Null when no concrete idea is found. */
function describeIdea(m: Moment): string | null {
  const before = new Chess(m.fen);
  const best = playLine(m.fen, m.bestLine, 6);
  const b1 = best.moves[0];
  if (!b1) return null;
  const facts: string[] = [];
  const after = new Chess(best.fens[1]);
  if (m.kind === 'missedMate') return `a forced checkmate: ${best.sans.join(' ')}`;
  if (after.isCheckmate()) return 'it is checkmate';
  if (b1.captured) {
    const defended = before.attackers(sq(b1.to), opp(m.myColor)).length > 0;
    facts.push(`it takes the ${defended ? '' : 'unprotected '}${NAME[b1.captured]} on ${b1.to}`);
  }
  if (after.inCheck()) facts.push('it gives check');
  const fork = describeFork(best.fens[1], b1.to);
  if (fork) facts.push(`it ${fork}`);
  const threatsBefore = threatenedPieces(m.fen, m.myColor);
  const threatsAfter = threatenedPieces(best.fens[1], m.myColor).map((t) => t.square);
  const saved = threatsBefore.find((t) => t.square === b1.from || !threatsAfter.includes(t.square));
  if (saved) facts.push(saved.square === b1.from ? `it moves your ${NAME[saved.type]} on ${saved.square} out of danger` : `it protects or saves your ${NAME[saved.type]} on ${saved.square}`);
  if (b1.san.startsWith('O-O')) facts.push('it castles and brings the king to safety');
  // does it stop the opponent's best idea after my played move? (their reply to my move would have been legal-impossible)
  if (!facts.length && m.refutation[0]) {
    const refFrom = m.refutation[0].slice(0, 2);
    const refTo = m.refutation[0].slice(2, 4);
    const afterBest = new Chess(best.fens[1]);
    const stillPossible = afterBest.moves({ verbose: true }).some((x) => x.from === refFrom && x.to === refTo);
    const target = pieceAt(before, refTo);
    if (!stillPossible && !target) facts.push(`it stops ${m.refutation[0].slice(0, 2)}-${refTo}, the reply that hurt after ${m.playedSan}`);
  }
  return facts.length ? facts.join(' and ') : null;
}

export function sixPart(m: Moment): SixPart {
  const mine = m.myColor;
  const dots = mine === 'w' ? '.' : '...';
  const mark = m.kind !== 'cp' || m.loss >= 100 ? '?' : '';
  const fenAfter = (() => {
    const c = new Chess(m.fen);
    moveFromUci(c, m.playedUci);
    return c.fen();
  })();
  const refLine = playLine(fenAfter, m.refutation, 5);
  const bestLine = playLine(m.fen, m.bestLine, 6);
  let needsReview = false;

  const position = `Move ${m.moveNumber}, you to move as ${mine === 'w' ? 'White' : 'Black'}, ${describeScore(m.before)}${m.before.mate === undefined ? `, ${formatScore(m.before)}` : ` (${formatScore(m.before)})`}. ${
    materialLabel(m.fen, mine).replace(/^./, (c) => c.toUpperCase())
  }.`;

  const played = `In the game you played ${m.moveNumber}${dots}${m.playedSan}${mark} → ${m.after.mate !== undefined ? formatScore(m.after) : formatScore(m.after)} (${describeScore(m.after)}).`;

  // 3. why it fails
  const reply = describeReply(fenAfter, refLine, mine);
  const lineText = refLine.sans.length ? numbered(fenAfter, [m.playedSan, ...refLine.sans.slice(0, 4)], mine === 'w', m.moveNumber) : '';
  let whyFails: string;
  if (m.tagEvidence) {
    whyFails = m.tagEvidence + (lineText ? ` Line: ${lineText}.` : '');
  } else if (reply) {
    whyFails = `Their best reply: ${reply}.${lineText ? ` Line: ${lineText}.` : ''}`;
  } else {
    needsReview = true;
    whyFails = `I can't name one concrete threat from the board${lineText ? `. The engine's line is ${lineText}` : ''}. Needs review: study the line.`;
  }

  // 4. better move
  const idea = describeIdea(m);
  let better: string;
  if (idea) better = `${m.bestSan} (${formatScore(m.before)}): ${idea}.`;
  else {
    needsReview = true;
    better = `${m.bestSan} (${formatScore(m.before)}). I could not establish a concrete idea from the board; study the engine line: ${numbered(m.fen, bestLine.sans.slice(0, 4), mine === 'w', m.moveNumber)}. Needs review.`;
  }

  const tag = m.tag ? `Pattern: ${m.tag}` : 'Pattern: none identified (no concrete evidence on the board)';
  const rule = m.tag ? (RULES[m.tag] ?? null) : null;

  let closeCall: string | undefined;
  if (m.second && m.second.score.cp !== undefined && m.before.cp !== undefined && m.before.cp - m.second.score.cp <= 30) {
    closeCall = `The top two moves are close: ${m.bestSan} (${formatScore(m.before)}) and ${m.second.san} (${formatScore(m.second.score)}).`;
  }
  const playedWasCapture = (() => {
    const c = new Chess(m.fen);
    return !!moveFromUci(c, m.playedUci).captured;
  })();
  if (playedWasCapture && !bestLine.moves[0]?.captured) {
    closeCall = (closeCall ? closeCall + ' ' : '') + `The capture ${m.playedSan} looks natural, but the engine prefers the quieter ${m.bestSan}.`;
  }
  void material;
  void VALUE;
  const context = m.cause ? 'This is the earliest costly mistake in this game: the point where it started going wrong.' : undefined;
  return { position, played, whyFails, better, tag, rule, closeCall, context, needsReview, betterLineSan: bestLine.sans, refutationSan: refLine.sans };
}

/** An optional hint shown BEFORE the attempt. It states a board fact or a general checklist and never names the answer. */
export function hintFor(m: Pick<Moment, 'fen' | 'myColor'>): string {
  const c = new Chess(m.fen);
  if (c.inCheck()) return 'Your king is in check. List every way to deal with it before you pick one.';
  const threatened = threatenedPieces(m.fen, m.myColor);
  if (threatened.length) {
    const t = threatened[0];
    return `Your ${NAME[t.type]} on ${t.square} can be captured. Ask yourself what your opponent's last move is aiming at.`;
  }
  return "Before you move, list your opponent's checks, captures and threats, then your own. Which of them matters most?";
}

export type { Score };
