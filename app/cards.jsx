// cards.jsx — "Memorise cards" (Pro). Shuffle a deck (trimmed to your palace's
// spots), turn each card into a vivid character with a rank + suit cue, place
// them along your journey, then recall the cards in order. The classic
// memory-sport discipline, on the same engine as everything else.

const { useState: useC, useMemo: useCM } = React;

function CardFace({ rank, suit, color, big }) {
  return (
    <span className={'card-face' + (big ? ' card-face-big' : '')} style={{ color }}>
      <span className="card-rank">{rank}</span><span className="card-suit">{suit}</span>
    </span>
  );
}

function CardLearnScreen({ palace, onSave, onCancel, audio }) {
  const cap = totalSpots(palace);
  const [title, setTitle] = useC('');
  const [seed, setSeed] = useC(0); // bump to reshuffle
  const deck = useCM(() => shuffled(makeDeck()), [seed]);
  const hand = deck.slice(0, cap);
  useNarrate('Here is a shuffled deck. Turn each card into a character using its rank and suit, and place them one by one along your journey.', audio);

  const build = () => onSave(buildCardList({ cards: deck, title: title || 'A deck of cards', palace }));

  return (
    <div className="screen import card-learn">
      <header className="screen-head">
        <h2 className="screen-title">Memorise cards</h2>
        <p className="screen-lede">A shuffled deck, trimmed to the {cap} spot{cap === 1 ? '' : 's'} of your <strong>{palace.name}</strong>. Turn each card into a character and walk it into place.</p>
      </header>

      <div className="card-toolbar">
        <input className="builder-name" placeholder="Name this deck… (e.g. Speed deck #1)" value={title}
          onChange={(e) => setTitle(e.target.value)} maxLength={40} />
        <BigButton kind="ghost" onClick={() => setSeed((s) => s + 1)}>🔀 Shuffle</BigButton>
      </div>

      <div className="card-hand">
        {hand.map((c, i) => (
          <div key={i} className="card-tile">
            <span className="card-tile-n">{i + 1}</span>
            <CardFace rank={c.rank} suit={c.suit} color={c.color} big />
            <span className="card-tile-cue">{RANK_WORD[c.rank]} · {c.suitName}</span>
          </div>
        ))}
      </div>

      <details className="major-key card-key">
        <summary>How the cue works</summary>
        <p>Each card = <strong>a rank cue + a suit setting</strong>. The <em>King of Hearts</em> might be a king who is madly in love; the <em>2 of Spades</em>, a swan gliding past a sword. Make it move, make it weird — that's what sticks. Bring your own system anytime.</p>
      </details>

      <div className="import-actions">
        <BigButton kind="ghost" onClick={onCancel}>Cancel</BigButton>
        <BigButton onClick={build} disabled={hand.length < 1}>Hide them in my palace →</BigButton>
      </div>
      <p className="store-note center">🔒 Saved only on this device. Recall is timed in Pro mode.</p>
    </div>
  );
}

Object.assign(window, { CardLearnScreen, CardFace });
