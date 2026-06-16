// screens-b.jsx — Placement coach, The walk, Recall test, Celebration.
// All palace + list generic: works for the Treehouse demo, a child's own
// photo palace, and imported lists of up to 100 items.

const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM } = React;

function placedMap(flat, items, count) {
  const m = {};
  for (let i = 0; i < count && i < flat.length && i < items.length; i++) m[flat[i].id] = items[i];
  return m;
}
function ItemGlyph({ item, cls }) {
  return item.emoji
    ? <span className={cls + '-emoji'} aria-hidden="true">{item.emoji}</span>
    : <span className={cls + '-initial'} style={{ background: item.color }}>{item.label[0].toUpperCase()}</span>;
}

// ---- PLACEMENT COACH --------------------------------------------------------
function PlaceScreen({ palace, list, flat, index, onPlace, audio }) {
  const total = Math.min(flat.length, list.items.length);
  const spot = flat[index];
  const item = list.items[index];
  const room = palace.rooms[spot.roomIndex];
  const prompt = promptFor(item, spot, index);
  useNarrate(prompt, audio);
  const placed = placedMap(flat, list.items, index);

  return (
    <div className="screen split">
      <div className="split-scene">
        <PalaceScene room={room} placedById={placed} activeId={spot.id} />
        <div className="scene-caption">Spot {spot.globalN} &middot; {spot.name}</div>
      </div>
      <div className="split-panel">
        <div className="place-step">Spot {index + 1} of {total}</div>
        <div className="place-item" style={{ '--chip-accent': item.color }}>
          <span className="place-emoji">
            {item.emoji ? item.emoji : <span className="place-initial" style={{ background: item.color }}>{item.label[0].toUpperCase()}</span>}
          </span>
          <div>
            <div className="place-where">Put <strong>{item.label}</strong> at</div>
            <div className="place-spot">{spot.name}</div>
          </div>
        </div>
        <CoachBubble mood="happy">
          {prompt}
          <SpeakerButton on={audio} text={prompt} />
        </CoachBubble>
        {item.context && (
          <p className="place-source"><span className="place-source-tag">{item.isVocab ? 'Means' : 'From your text'}</span> {item.context}</p>
        )}
        <p className="place-hint">Close your eyes for a second and really <em>see</em> it. Got the picture?</p>
        <BigButton onClick={onPlace} full>
          {index + 1 < total ? 'I can see it! →' : 'I can see it! Walk the palace →'}
        </BigButton>
      </div>
    </div>
  );
}

// ---- THE WALK ---------------------------------------------------------------
function WalkScreen({ palace, list, flat, onReady, audio }) {
  const n = Math.min(flat.length, list.items.length);
  const [step, setStep] = useS(-1);
  const [playing, setPlaying] = useS(true);
  const timer = useR(null);

  useE(() => {
    if (!playing || step >= n) return;
    timer.current = setTimeout(() => setStep((s) => s + 1), step < 0 ? 900 : (n > 20 ? 1500 : 2100));
    return () => clearTimeout(timer.current);
  }, [step, playing, n]);

  useE(() => {
    if (!audio) return;
    if (step >= 0 && step < n) Narrator.speak(list.items[step].label + ' is at ' + flat[step].name + '.');
    else if (step < 0) Narrator.speak('Now let\u2019s walk the palace and visit each spot in order.');
  }, [step]);

  const finished = step >= n;
  const visible = {};
  for (let i = 0; i <= step && i < n; i++) visible[flat[i].id] = list.items[i];

  const curRoomIdx = step >= 0 && step < n ? flat[step].roomIndex : (n > 0 ? flat[Math.max(0, n - 1)].roomIndex : 0);
  const room = palace.rooms[curRoomIdx];
  const pathPts = flat.filter((s, i) => i <= step && s.roomIndex === curRoomIdx).map((s) => ({ x: s.x, y: s.y }));
  const cur = step >= 0 && step < n ? { item: list.items[step], spot: flat[step] } : null;
  const replay = () => { setStep(-1); setPlaying(true); };

  return (
    <div className="screen split">
      <div className="split-scene">
        <PalaceScene room={room} placedById={visible} walkId={cur ? cur.spot.id : null} walkPathPts={pathPts} />
        <div className="scene-caption">{finished ? 'You walked the whole palace!' : (palace.rooms.length > 1 ? room.name + ' — walking…' : 'Walking the palace…')}</div>
      </div>
      <div className="split-panel">
        <div className="place-step">The walk</div>
        {!finished
          ? <CoachBubble mood="happy">
              {step < 0
                ? 'Let\u2019s stroll through your palace and visit every spot, in order. Watch each thing pop up where you hid it!'
                : <span>Spot {cur.spot.globalN}: <strong>{cur.item.label}</strong> is at {cur.spot.name}.</span>}
            </CoachBubble>
          : <CoachBubble mood="cheer">
              That\u2019s the whole walk! Now the fun part &mdash; let\u2019s see how many you can remember on your own.
            </CoachBubble>}

        <div className="walk-progress">
          <div className="walk-progress-bar"><div style={{ width: ((Math.max(0, step) / n) * 100) + '%' }} /></div>
          <span>{Math.min(Math.max(0, step), n)} / {n}</span>
        </div>

        <div className="walk-controls">
          {!finished && <BigButton kind="ghost" onClick={() => setPlaying((p) => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</BigButton>}
          {(finished || step >= 0) && <BigButton kind="ghost" onClick={replay}>↺ Walk again</BigButton>}
        </div>

        <BigButton onClick={onReady} full kind={finished ? 'primary' : 'soft'}>
          {finished ? 'I\u2019m ready to remember! →' : 'Skip ahead →'}
        </BigButton>
      </div>
    </div>
  );
}

// ---- RECALL TEST ------------------------------------------------------------
function RecallScreen({ palace, list, flat, onDone, audio }) {
  const n = Math.min(flat.length, list.items.length);
  const [idx, setIdx] = useS(0);
  const [results, setResults] = useS([]);
  const [attempts, setAttempts] = useS(0);
  const [placed, setPlaced] = useS({});
  const [feedback, setFeedback] = useS(null);
  const [wobbleId, setWobbleId] = useS(null);
  const [revealHint, setRevealHint] = useS(false);

  const order = useM(() => {
    const a = list.items.slice(0, n).map((x) => x.id);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }, []);

  const spot = flat[idx];
  const answer = list.items[idx];
  const room = palace.rooms[spot.roomIndex];
  const placedIds = new Set(Object.values(placed).map((x) => x.id));
  const pool = order.map((id) => list.items.find((x) => x.id === id)).filter((x) => x && !placedIds.has(x.id));

  useE(() => { setRevealHint(false); if (audio) Narrator.speak('What did you hide at ' + spot.name + '?'); }, [idx]);

  const pick = (item) => {
    if (item.id === answer.id) {
      const firstTry = attempts === 0;
      const np = { ...placed, [spot.id]: item };
      setPlaced(np);
      setResults((r) => [...r, firstTry]);
      setFeedback({ tone: 'yay', text: firstTry ? 'Yes! Spot on. 🎉' : 'There it is! Nice memory. 😊' });
      const next = idx + 1;
      setTimeout(() => {
        setFeedback(null); setAttempts(0);
        if (next >= n) { const final = [...results, firstTry]; onDone(final.filter(Boolean).length, final.length, np); }
        else setIdx(next);
      }, 950);
    } else {
      setAttempts((a) => a + 1);
      setWobbleId(item.id);
      setTimeout(() => setWobbleId(null), 500);
      setFeedback({ tone: 'soft', text: 'Not quite — let\u2019s try that spot again. 🙂' });
      if (attempts + 1 >= 2) setRevealHint(true);
    }
  };

  return (
    <div className="screen split">
      <div className="split-scene">
        <PalaceScene room={room} placedById={placed} recallId={spot.id} showNumbers />
        <div className="scene-caption">Spot {spot.globalN} &middot; {spot.name}</div>
      </div>
      <div className="split-panel">
        <div className="place-step">Your turn &middot; {idx + 1} of {n}</div>
        <h3 className="recall-q">What did you hide at <em>{spot.name}</em>?</h3>
        <CoachBubble mood={feedback && feedback.tone === 'soft' ? 'think' : 'happy'} compact>
          {feedback ? feedback.text : 'Take your time. Picture the spot, then tap what you hid there.'}
          {revealHint && !feedback && <span className="recall-hintline"> Hint: it starts with “{answer.label[0]}”.</span>}
        </CoachBubble>
        <div className="recall-pool">
          {pool.map((it) => (
            <ItemChip key={it.id} item={it} big state={wobbleId === it.id ? 'wrong' : 'idle'} onClick={() => pick(it)} />
          ))}
        </div>
        {revealHint && <p className="place-hint">Stuck? That&rsquo;s okay &mdash; any answer is a good try. 💛</p>}
      </div>
    </div>
  );
}

// ---- CELEBRATION ------------------------------------------------------------
function DoneScreen({ palace, list, flat, score, total, placed, saved, onWalkAgain, onNewList, onHome, audio }) {
  const pct = Math.round((score / total) * 100);
  const allRight = score === total;
  const baseline = Math.max(1, Math.round(total * 0.25));
  const [viewRoom, setViewRoom] = useS(0);
  useNarrate(
    allRight ? 'Amazing! You remembered every single one. Your palace really works!'
      : 'Great job! You remembered ' + score + ' out of ' + total + '. The palace is working — walk it again to lock in the rest!',
    audio
  );
  return (
    <div className="screen done">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="conf" style={{ left: (6 + i * 6.5) + '%', animationDelay: (i * 0.18) + 's', '--h': (i * 47) % 360 }} />
        ))}
      </div>
      <div className="done-grid">
        <div className="done-left">
          <p className="done-kicker">{allRight ? 'Perfect palace!' : 'You did it!'}</p>
          <h2 className="done-score">You remembered <span className="done-big">{score}</span> of {total}</h2>
          <p className="done-sub">
            {allRight ? 'Every one, in the right order. That\u2019s the memory palace working its magic. 🌟'
              : 'On your very first try! Walk the palace once more and you\u2019ll catch the rest. 💛'}
          </p>
          <div className="masterbar" role="img" aria-label={pct + ' percent recalled'}>
            <div className="masterbar-fill" style={{ width: pct + '%' }} />
            <span className="masterbar-num">{pct}%</span>
          </div>
          {saved && <p className="saved-pill">💾 Saved to <strong>Your palaces</strong> on this device</p>}
          <div className="done-actions">
            <BigButton onClick={onWalkAgain} kind="ghost">↺ Walk it again</BigButton>
            <BigButton onClick={onNewList} kind="ghost">Try the recall again</BigButton>
            <BigButton onClick={onHome}>Finish ✓</BigButton>
          </div>
          <div className="parent-strip">
            <span className="parent-tag">For grown-ups</span>
            <p>
              Palace recall: <strong>{score}/{total} ({pct}%)</strong> on the first attempt.
              After a single look, rote guessing of {total} ordered items typically lands around <strong>{baseline}/{total}</strong>.
              <br />This palace is saved only on this device — nothing is uploaded.
            </p>
          </div>
        </div>
        <div className="done-scene">
          <PalaceScene room={palace.rooms[viewRoom]} placedById={placed} showNumbers={false} />
          {palace.rooms.length > 1 && (
            <div className="room-dots">
              {palace.rooms.map((r, i) => (
                <button key={r.id} type="button" className={'room-dot' + (i === viewRoom ? ' on' : '')} onClick={() => setViewRoom(i)} aria-label={r.name} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlaceScreen, WalkScreen, RecallScreen, DoneScreen });
