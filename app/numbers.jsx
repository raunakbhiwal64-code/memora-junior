// numbers.jsx — "Memorise a number" (Pro). Key in any digit string — a date,
// a phone number, the first digits of π — and we split it into two-digit
// chunks and show the Major System sounds for each. You craft a vivid image
// per chunk, place them in your palace, then recall by typing the digits.

const { useState: useN, useMemo: useNM } = React;

const NUMBER_SAMPLES = [
  { label: 'π to 24 digits', value: '314159265358979323846264' },
  { label: 'A phone number', value: '02079460958' },
  { label: 'A date', value: '14071789' },
];

function NumberLearnScreen({ palace, onSave, onCancel, audio }) {
  const [title, setTitle] = useN('');
  const [raw, setRaw] = useN('');
  useNarrate('Type any number. I’ll break it into pairs and show you the Major System sounds for each — turn every pair into a picture and hide it in your palace.', audio);

  const cap = totalSpots(palace);
  const digits = (raw.match(/\d/g) || []).join('');
  const chunks = useNM(() => chunkDigits(raw), [raw]);
  const kept = Math.min(chunks.length, cap);
  const trimmed = chunks.length > cap;

  const build = () => onSave(buildNumberList({ raw, title: title || 'A number', palace }));

  return (
    <div className="screen import number-learn">
      <header className="screen-head">
        <h2 className="screen-title">Memorise a number</h2>
        <p className="screen-lede">Type the digits — we split them into pairs and give you the <strong>Major System</strong> sounds to turn each pair into a picture for your <strong>{palace.name}</strong>.</p>
      </header>

      <div className="import-grid number-grid">
        <div className="import-left">
          <input className="builder-name" placeholder="Name it… (e.g. π, Mum's number)" value={title}
            onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          <textarea className="import-area number-area" inputMode="numeric"
            placeholder={'Type or paste digits here…\n\n3141592653\n589793238…'}
            value={raw} onChange={(e) => setRaw(e.target.value)} />
          <div className="import-tools number-samples">
            {NUMBER_SAMPLES.map((s) => (
              <BigButton key={s.label} kind="ghost" onClick={() => { setRaw(s.value); if (!title) setTitle(s.label); }}>{s.label}</BigButton>
            ))}
          </div>
          <details className="major-key">
            <summary>The Major System key</summary>
            <div className="major-key-grid">
              {MAJOR.map((m) => (
                <span key={m.d} className="major-key-row"><b>{m.d}</b> {m.cons}</span>
              ))}
            </div>
            <p>String the sounds of a pair together and add vowels to make a word. <em>42 → r·n → “rain”.</em> Vowels and the sounds w, h, y are free.</p>
          </details>
        </div>

        <div className="import-right">
          <div className="import-count" data-full={trimmed ? 'true' : 'false'}>
            <strong>{digits.length}</strong> digit{digits.length === 1 ? '' : 's'} · <strong>{kept}</strong> chunk{kept === 1 ? '' : 's'}
            {trimmed && <span className="import-cap"> (palace fits {cap})</span>}
          </div>
          <div className="number-chunks">
            {chunks.length === 0
              ? <p className="import-empty">Your number breaks into pairs here as you type.</p>
              : chunks.map((c, i) => {
                const peg = MAJOR_EXAMPLES[c] || (c.length === 1 ? RHYME_PEGS[+c] : null);
                return (
                  <div key={i} className={'number-chunk' + (i >= cap ? ' is-dropped' : '')}>
                    <span className="number-chunk-n">{i < cap ? i + 1 : '–'}</span>
                    <span className="number-chunk-d">{c}</span>
                    <span className="number-chunk-s">{majorSounds(c)}{peg ? <em> → “{peg}”</em> : null}</span>
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
      <p className="store-note center">🔒 Saved only on this device. Recall is timed and typed.</p>
    </div>
  );
}

Object.assign(window, { NumberLearnScreen, NUMBER_SAMPLES });
