// text.jsx — "Learn a text" builder + fill-in-the-blank recall.
// Paste a poem / notes / passage / vocab list; the system pulls out the
// pieces to hide, you can tap to choose which word is blanked, and it
// auto-trims to fit the chosen palace. Recall is typed (cloze).

const { useState: useTx, useMemo: useTxMemo, useRef: useTxRef, useEffect: useTxEffect } = React;

const TEXT_MODES = [
  { key: 'notes', label: 'Notes', hint: 'Facts & study notes — key words' },
  { key: 'poem', label: 'Poem', hint: 'Remember it line by line' },
  { key: 'passage', label: 'Passage', hint: 'Retell it, sentence by sentence' },
  { key: 'vocab', label: 'Vocab', hint: 'term: definition, one per line' },
];

const SAMPLE_TEXT = {
  notes: 'The water cycle moves water around the Earth.\nThe Sun heats the ocean and water evaporates into vapour.\nThe vapour cools high up and condenses into clouds.\nWhen the drops grow heavy they fall as precipitation.\nWater flows back to the sea as runoff and the cycle repeats.',
  poem: 'Twinkle, twinkle, little star,\nHow I wonder what you are.\nUp above the world so high,\nLike a diamond in the sky.',
  passage: 'A long time ago, a clever fox lived by the river. Every morning she trotted to the old oak to watch the sunrise. One day she found a shiny key hidden under a stone. She carried it home and kept it safe forever.',
  vocab: 'evaporate: water turning into vapour\ncondense: vapour turning back into drops\nprecipitation: rain, snow or hail that falls\nrunoff: water flowing back to the sea',
};

// strip surrounding punctuation from a display token
function cleanWord(t) { return t.replace(/^[^A-Za-z0-9'’]+|[^A-Za-z0-9'’]+$/g, ''); }

// ---- LEARN A TEXT -----------------------------------------------------------
function TextLearnScreen({ palace, onSave, onCancel, audio }) {
  const [mode, setMode] = useTx('notes');
  const [title, setTitle] = useTx('');
  const [raw, setRaw] = useTx('');
  const [overrides, setOverrides] = useTx({}); // unitIndex -> chosen answer word
  const fileRef = useTxRef(null);

  useNarrate('Paste a poem, some notes, or a passage. I\u2019ll pull out the words to hide \u2014 tap any word to choose it yourself.', audio);

  const cap = totalSpots(palace);
  const units = useTxMemo(() => parseTextUnits(raw, mode), [raw, mode]);
  const merged = useTxMemo(() => units.map((u, i) => (overrides[i] ? { ...u, answer: overrides[i] } : u)), [units, overrides]);
  const keep = useTxMemo(() => new Set(keptUnitIndices(merged, mode, cap)), [merged, mode, cap]);

  const reset = () => { setOverrides({}); };
  const changeMode = (m) => { setMode(m); setOverrides({}); };
  const loadSample = () => { setRaw(SAMPLE_TEXT[mode]); if (!title) setTitle({ notes: 'Water cycle', poem: 'Twinkle Twinkle', passage: 'The clever fox', vocab: 'Science words' }[mode]); };

  const loadFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setRaw(String(reader.result || '')); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); };
    reader.readAsText(f);
  };

  const pickWord = (unitIdx, word) => {
    const w = cleanWord(word);
    if (!w) return;
    setOverrides((o) => ({ ...o, [unitIdx]: w }));
  };

  const build = () => onSave(buildTextList({ raw, title, mode, palace, overrides }));

  const total = merged.length;
  const kept = keep.size;
  const trimmed = total > kept;
  let keptN = 0;

  return (
    <div className="screen import text-learn">
      <header className="screen-head">
        <h2 className="screen-title">Learn a text</h2>
        <p className="screen-lede">Paste it in, then tap any word to pick what gets hidden. We’ll fit the best bits into your <strong>{palace.name}</strong>.</p>
      </header>

      <div className="text-modes" role="tablist">
        {TEXT_MODES.map((m) => (
          <button key={m.key} type="button" role="tab" className={'seg-btn' + (mode === m.key ? ' is-active' : '')}
            onClick={() => changeMode(m.key)} title={m.hint}>
            {m.label}
          </button>
        ))}
        <span className="text-mode-hint">{(TEXT_MODES.find((m) => m.key === mode) || {}).hint}</span>
      </div>

      <div className="import-grid text-grid">
        <div className="import-left">
          <input className="builder-name" placeholder="Name this text… (e.g. Friday poem)" value={title}
            onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          <textarea className="import-area" placeholder={'Paste or type your text here…\n\n' + (mode === 'vocab' ? 'star: a ball of burning gas\nplanet: a world that orbits a star' : 'The Sun heats the ocean and water evaporates.\nThe vapour cools and forms clouds.')}
            value={raw} onChange={(e) => setRaw(e.target.value)} />
          <div className="import-tools">
            <BigButton kind="ghost" onClick={loadSample}>✨ Use a sample</BigButton>
            <BigButton kind="ghost" onClick={() => fileRef.current && fileRef.current.click()}>📄 Upload .txt</BigButton>
            <input ref={fileRef} type="file" accept=".txt,.csv,text/plain,text/csv" style={{ display: 'none' }}
              onChange={(e) => { loadFile(e.target.files[0]); e.target.value = ''; }} />
          </div>
        </div>

        <div className="import-right">
          <div className="import-count">
            <strong>{kept}</strong> of {total || 0} hidden{trimmed ? '' : ''}
            <button type="button" className="text-reset" onClick={reset} disabled={!Object.keys(overrides).length}>↺ Auto-pick</button>
          </div>
          {trimmed && <p className="text-trim-note">Your {palace.name} has {cap} spots, so we kept the {kept} most important. {mode === 'poem' || mode === 'passage' ? 'Kept in order.' : 'Kept the strongest keywords.'}</p>}
          <div className="text-units">
            {total === 0 && <p className="import-empty">Your text will break into spots here as you type.</p>}
            {merged.map((u, i) => {
              const isKept = keep.has(i);
              if (isKept) keptN += 1;
              const n = isKept ? keptN : null;
              return (
                <div key={i} className={'text-unit' + (isKept ? '' : ' is-dropped')}>
                  <span className="text-unit-n">{isKept ? n : '–'}</span>
                  {u.isVocab ? (
                    <span className="text-unit-body">
                      <button type="button" className="tok is-ans" onClick={() => {}}>{u.answer}</button>
                      <span className="text-vocab-arrow"> → </span>
                      <span className="text-vocab-def">{u.context}</span>
                    </span>
                  ) : (
                    <span className="text-unit-body">
                      {u.context.split(/(\s+)/).map((tok, k) => {
                        if (/^\s+$/.test(tok)) return tok;
                        const cw = cleanWord(tok);
                        if (!cw) return <span key={k}>{tok}</span>;
                        const isAns = cw.toLowerCase() === String(u.answer || '').toLowerCase();
                        return (
                          <button key={k} type="button" className={'tok' + (isAns ? ' is-ans' : '')}
                            onClick={() => pickWord(i, tok)}>{tok}</button>
                        );
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="import-actions">
        <BigButton kind="ghost" onClick={onCancel}>Cancel</BigButton>
        <BigButton onClick={build} disabled={kept < 1}>Hide it in my palace →</BigButton>
      </div>
      <p className="store-note center">🔒 Your text is saved only on this device.</p>
    </div>
  );
}

// ---- TEXT RECALL (fill in the blank) ----------------------------------------
function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9'’]/g, ''); }

function TextRecallScreen({ palace, list, flat, onDone, audio, pro, dir = 'forward' }) {
  const isNumber = list.system === 'number';
  const hideClue = isNumber && pro; // pure recall: decode the image yourself
  const n = Math.min(flat.length, list.items.length);
  const [idx, setIdx] = useTx(0);
  const [val, setVal] = useTx('');
  const [results, setResults] = useTx([]);
  const [attempts, setAttempts] = useTx(0);
  const [placed, setPlaced] = useTx({});
  const [feedback, setFeedback] = useTx(null);
  const [reveal, setReveal] = useTx(false);
  const inputRef = useTxRef(null);
  const startRef = useTxRef(Date.now());

  const pairs = useTxMemo(() => {
    const ps = [];
    for (let i = 0; i < n; i++) ps.push({ spot: flat[i], item: list.items[i] });
    if (dir === 'back') ps.reverse();
    return ps;
  }, [dir, n]);
  const spot = pairs[idx].spot;
  const item = pairs[idx].item;
  const room = palace.rooms[spot.roomIndex];

  useTxEffect(() => {
    setVal(''); setReveal(false); setFeedback(null);
    if (inputRef.current) inputRef.current.focus();
    if (audio) Narrator.speak('What did you hide at ' + spot.name + '?');
  }, [idx]);

  const advance = (firstTry, np) => {
    const next = idx + 1;
    setTimeout(() => {
      setFeedback(null); setAttempts(0);
      if (next >= n) { const final = [...results, firstTry]; onDone(final.filter(Boolean).length, final.length, np, Math.round((Date.now() - startRef.current) / 1000)); }
      else setIdx(next);
    }, 950);
  };

  const submit = () => {
    if (!val.trim()) return;
    if (normalize(val) === normalize(item.answer)) {
      const firstTry = attempts === 0;
      const np = { ...placed, [spot.id]: item };
      setPlaced(np);
      setResults((r) => [...r, firstTry]);
      setFeedback({ tone: 'yay', text: firstTry ? 'Yes! Word-perfect. 🎉' : 'There it is! Nice. 😊' });
      advance(firstTry, np);
    } else {
      const a = attempts + 1;
      setAttempts(a);
      setFeedback({ tone: 'soft', text: a >= 2 ? `So close — it was “${item.answer}”. Type it to lock it in.` : 'Not quite — picture the spot and try again. 🙂' });
      if (a >= 2) setReveal(true);
    }
  };

  // split prompt around the blank so we can show a styled gap
  const parts = String(item.prompt || '').split('—————');
  const showBlank = parts.length > 1 && !item.isVocab;

  return (
    <div className="screen split">
      <div className="split-scene">
        <PalaceScene room={room} placedById={placed} recallId={spot.id} showNumbers />
        <div className="scene-caption">Spot {spot.globalN} · {spot.name}</div>
      </div>
      <div className="split-panel">
        <div className="place-step">Your turn · {idx + 1} of {n}<RecallTimer show={pro} /></div>
        <h3 className="recall-q">{isNumber ? <>Which digits are at <em>{spot.name}</em>?</> : <>What goes at <em>{spot.name}</em>?</>}</h3>

        {!hideClue && (
          <div className="cloze-card">
            {item.isVocab
              ? <p className="cloze-text"><span className="cloze-label">{isNumber ? 'Sounds' : 'Clue'}:</span> {item.context}</p>
              : showBlank
                ? <p className="cloze-text">{parts[0]}<span className="cloze-blank">{reveal ? item.answer : '?'}</span>{parts.slice(1).join('—————')}</p>
                : <p className="cloze-text">{item.context}</p>}
          </div>
        )}

        <CoachBubble mood={feedback && feedback.tone === 'soft' ? 'think' : 'happy'} compact>
          {feedback ? feedback.text : (isNumber ? 'Recall the picture you hid here, then type its digits.' : item.isVocab ? 'Type the word this clue describes.' : 'Type the missing word — picture it sitting at the spot.')}
        </CoachBubble>

        <form className="cloze-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input ref={inputRef} className="cloze-input" value={val} autoFocus
            inputMode={isNumber ? 'numeric' : 'text'}
            placeholder={isNumber ? 'Type the digits…' : 'Type your answer…'}
            onChange={(e) => setVal(e.target.value)} aria-label="Your answer" />
          <BigButton onClick={submit} disabled={!val.trim()}>Check →</BigButton>
        </form>
        {reveal && <p className="place-hint">Hint: it’s “{item.answer}” — type it to carry on. 💛</p>}
      </div>
    </div>
  );
}

Object.assign(window, { TextLearnScreen, TextRecallScreen, TEXT_MODES });
