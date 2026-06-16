// main.jsx — Memora Junior app shell, state machine, and Tweaks.

const { useState: useMS, useEffect: useME, useMemo: useMM } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "parchment",
  "font": "editorial",
  "dyslexia": false,
  "motion": "calm",
  "audio": true,
  "mode": "junior"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [step, setStep] = useMS('home');
  const [palace, setPalace] = useMS(() => buildTreehousePalace());
  const [list, setList] = useMS(() => PLANET_LIST);
  const [placeIndex, setPlaceIndex] = useMS(0);
  const [result, setResult] = useMS({ score: 0, total: 8, placed: {} });
  const [savedSets, setSavedSets] = useMS(() => Store.saved());
  const [customLists, setCustomLists] = useMS(() => Store.lists());
  const [customPalaces, setCustomPalaces] = useMS(() => Store.palaces());
  const [stats, setStats] = useMS(() => Store.stats());
  const [preview, setPreview] = useMS(null);
  const [recallDir, setRecallDir] = useMS('forward');
  const [aiCfg, setAiCfg] = useMS(() => AI.config());
  const updateAi = (patch) => { const next = { ...aiCfg, ...patch }; AI.setConfig(next); setAiCfg(next); };

  const audio = t.audio;
  const pro = t.mode === 'pro';
  const flat = useMM(() => flattenSpots(palace), [palace]);
  // saved sets whose spaced-repetition review has come due
  const dueSets = useMM(() => savedSets.filter((s) => s.srs && s.srs.due != null && s.srs.due <= Date.now()), [savedSets]);

  useME(() => { if (!audio) Narrator.stop(); }, [audio, step]);
  const go = (s) => { Narrator.stop(); setStep(s); };

  // builtin treehouse + planets, used by the Tweaks "jump" shortcuts
  const loadDemo = () => { setPalace(buildTreehousePalace()); setList(PLANET_LIST); setPlaceIndex(0); };

  const persistSet = (score, total, seconds) => {
    const id = (palace.kind === 'builtin' ? 'set-treehouse-' : 'set-' + palace.id + '-') + list.id;
    const prev = savedSets.find((x) => x.id === id);
    let bestScore = score, bestTotal = total;
    if (prev && prev.score != null && prev.score > score) { bestScore = prev.score; bestTotal = prev.total; }
    const now = Date.now();
    const accuracy = total > 0 ? score / total : 0;
    const srs = srsSchedule(prev && prev.srs ? prev.srs.stage : 0, accuracy, now);
    const attempt = { date: now, score, total, seconds: seconds || 0 };
    const history = [...(prev && prev.history ? prev.history : []), attempt].slice(-30);
    const set = {
      id, name: palace.name || 'Treehouse',
      palaceRef: palace.kind === 'builtin' ? { kind: 'builtin', id: palace.id } : { kind: 'custom', id: palace.id },
      spots: totalSpots(palace), listTitle: list.title, list,
      score: bestScore, total: bestTotal,
      lastScore: score, lastTotal: total, lastSeconds: seconds || 0,
      srs, history, reviews: (prev && prev.reviews ? prev.reviews : 0) + 1,
      thumb: (palace.rooms.find((r) => r.type === 'photo') || {}).img || null,
      date: now,
    };
    Store.upsertSaved(set); setSavedSets(Store.saved());
    setStats(Store.recordPractice());
    return set;
  };

  const playSaved = (s) => {
    const pal = s.palaceRef.kind === 'builtin' ? buildReadyPalace(s.palaceRef.id) : Store.palaces().find((p) => p.id === s.palaceRef.id);
    if (!pal) { setSavedSets(Store.saved()); return; }
    setPalace(pal); setList(s.list); setPlaceIndex(0); go('walk');
  };

  // best recall result recorded for a given palace (across the lists tried in it)
  const bestFor = (palaceId) => {
    const sets = savedSets.filter((s) => s.palaceRef && s.palaceRef.id === palaceId && s.score != null);
    if (!sets.length) return null;
    return sets.reduce((a, b) => (b.score / b.total > a.score / a.total ? b : a));
  };

  const total = Math.min(flat.length, list.items.length);
  const ribbonKey = ({ home: 'pick', pick: 'pick', preview: 'pick', gate: 'pick', build: 'pick', list: 'meet', import: 'meet', text: 'meet', numbers: 'meet', cards: 'meet', meet: 'meet', place: 'place', walk: 'walk', recall: 'recall', done: 'done' })[step];
  const showRibbon = !['home', 'done', 'gate', 'build', 'import', 'text', 'numbers', 'cards', 'preview'].includes(step);

  return (
    <div className="app-root" data-theme={t.theme} data-font={t.font} data-dys={t.dyslexia ? 'true' : 'false'} data-motion={t.motion}>
      <div className="app-card">
        <header className="app-bar">
          <BrandMark small />
          {showRibbon && <ProgressRibbon current={ribbonKey} />}
          <div className="app-bar-right">
            <SpeakerButton on={audio} onToggle={() => setTweak('audio', !audio)} />
          </div>
        </header>

        <main className="app-stage">
          {step === 'home' && (
            <HomeScreen audio={audio} hasSaved={customPalaces.length > 0}
              stats={stats} dueCount={dueSets.length}
              onReview={() => { if (dueSets[0]) playSaved(dueSets[0]); }}
              onStart={() => go('pick')} onContinue={() => go('pick')} />
          )}

          {step === 'pick' && (
            <PickerScreen audio={audio} library={customPalaces} bestFor={bestFor}
              dueSets={dueSets} onReview={playSaved}
              onPickReady={(id) => { setPalace(buildReadyPalace(id)); go('list'); }}
              onPreview={(id) => { setPreview(buildReadyPalace(id)); go('preview'); }}
              onBuild={() => go('gate')}
              onOpenPalace={(p) => { setPalace(p); go('list'); }}
              onDeletePalace={(p) => { Store.removePalace(p.id); setCustomPalaces(Store.palaces()); setSavedSets(Store.saved()); }} />
          )}

          {step === 'preview' && preview && (
            <PalacePreviewScreen palace={preview} audio={audio}
              onBack={() => go('pick')}
              onUse={() => { setPalace(preview); go('list'); }} />
          )}

          {step === 'gate' && (
            <ParentGate onCancel={() => go('pick')} onPass={() => go('build')} />
          )}

          {step === 'build' && (
            <PalaceBuilderScreen
              onCancel={() => go('pick')}
              onSave={(p) => { Store.upsertPalace(p); setCustomPalaces(Store.palaces()); setPalace(p); go('list'); }} />
          )}

          {step === 'list' && (
            <ListPickScreen audio={audio} palace={palace} lists={customLists} pro={pro}
              onChoose={(l) => { setList(l); go('meet'); }}
              onImport={() => go('import')}
              onLearnText={() => go('text')}
              onNumbers={() => go('numbers')}
              onCards={() => go('cards')}
              onDeleteList={(l) => { Store.removeList(l.id); setCustomLists(Store.lists()); }} />
          )}

          {step === 'numbers' && (
            <NumberLearnScreen palace={palace} audio={audio}
              onCancel={() => go('list')}
              onSave={(l) => { Store.upsertList(l); setCustomLists(Store.lists()); setList(l); setPlaceIndex(0); go('meet'); }} />
          )}

          {step === 'cards' && (
            <CardLearnScreen palace={palace} audio={audio}
              onCancel={() => go('list')}
              onSave={(l) => { Store.upsertList(l); setCustomLists(Store.lists()); setList(l); setPlaceIndex(0); go('meet'); }} />
          )}

          {step === 'text' && (
            <TextLearnScreen palace={palace} audio={audio}
              onCancel={() => go('list')}
              onSave={(l) => { Store.upsertList(l); setCustomLists(Store.lists()); setList(l); setPlaceIndex(0); go('meet'); }} />
          )}

          {step === 'import' && (
            <ListImportScreen
              onCancel={() => go('list')}
              onSave={(l) => { Store.upsertList(l); setCustomLists(Store.lists()); setList(l); go('meet'); }} />
          )}

          {step === 'meet' && (
            <MeetScreen list={list} palace={palace} audio={audio}
              onNext={() => { setPlaceIndex(0); go('place'); }}
              onPickBigger={() => go('pick')} />
          )}

          {step === 'place' && (
            <PlaceScreen palace={palace} list={list} flat={flat} index={placeIndex} audio={audio}
              onPlace={() => { if (placeIndex + 1 < total) setPlaceIndex(placeIndex + 1); else go('walk'); }} />
          )}

          {step === 'walk' && (
            <WalkScreen palace={palace} list={list} flat={flat} audio={audio}
              onReady={(d) => { setRecallDir(d || 'forward'); go('recall'); }} />
          )}

          {step === 'recall' && (list.kind === 'text'
            ? <TextRecallScreen palace={palace} list={list} flat={flat} audio={audio} pro={pro} dir={recallDir}
                onDone={(score, tot, placed, secs) => { const set = persistSet(score, tot, secs); setResult({ score, total: tot, placed, seconds: secs || 0, due: set.srs.due, streak: set ? Store.stats().streak : 0 }); go('done'); }} />
            : <RecallScreen palace={palace} list={list} flat={flat} audio={audio} pro={pro} dir={recallDir}
                onDone={(score, tot, placed, secs) => { const set = persistSet(score, tot, secs); setResult({ score, total: tot, placed, seconds: secs || 0, due: set.srs.due, streak: set ? Store.stats().streak : 0 }); go('done'); }} />
          )}

          {step === 'done' && (
            <DoneScreen palace={palace} list={list} flat={flat} saved
              score={result.score} total={result.total} placed={result.placed} audio={audio}
              seconds={result.seconds} due={result.due} streak={result.streak} dir={recallDir}
              onWalkAgain={() => go('walk')}
              onNewList={() => { setRecallDir('forward'); go('recall'); }}
              onTryBack={() => { setRecallDir('back'); go('recall'); }}
              onHome={() => { setPlaceIndex(0); go('home'); }} />
          )}
        </main>
      </div>

      <TweaksPanel>
        <TweakSection label="Look & feel" />
        <TweakRadio label="Theme" value={t.theme} options={['parchment', 'dusk', 'meadow']} onChange={(v) => setTweak('theme', v)} />
        <TweakRadio label="Type" value={t.font} options={['editorial', 'rounded', 'plain']} onChange={(v) => setTweak('font', v)} />
        <TweakToggle label="Dyslexia-friendly type" value={t.dyslexia} onChange={(v) => setTweak('dyslexia', v)} />

        <TweakSection label="Experience" />
        <TweakRadio label="Mode" value={t.mode} options={['junior', 'pro']} onChange={(v) => setTweak('mode', v)} />
        <TweakRadio label="Motion" value={t.motion} options={['calm', 'lively']} onChange={(v) => setTweak('motion', v)} />
        <TweakToggle label="Audio narration" value={t.audio} onChange={(v) => setTweak('audio', v)} />

        <TweakSection label="Idea helper (optional AI)" />
        <TweakToggle label="Use a local AI for silly ideas" value={aiCfg.enabled} onChange={(v) => updateAi({ enabled: v })} />
        {aiCfg.enabled && (
          <div className="ai-fields">
            <input className="ai-input" placeholder="Endpoint, e.g. http://localhost:11434" value={aiCfg.url}
              onChange={(e) => updateAi({ url: e.target.value })} aria-label="AI endpoint URL" />
            <input className="ai-input" placeholder="Model, e.g. llama3.2" value={aiCfg.model}
              onChange={(e) => updateAi({ model: e.target.value })} aria-label="AI model name" />
            <p className="ai-note">OpenAI-compatible (Ollama, LM Studio, …). When off or unreachable, free offline ideas are used instead. Settings stay on this device.</p>
          </div>
        )}

        <TweakSection label="Jump to a step" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <TweakButton label="Home" onClick={() => go('home')} />
          <TweakButton label="Pick" onClick={() => go('pick')} />
          <TweakButton label="Build palace" onClick={() => go('gate')} />
          <TweakButton label="Import list" onClick={() => go('import')} />
          <TweakButton label="Demo · Place" onClick={() => { loadDemo(); go('place'); }} />
          <TweakButton label="Demo · Walk" onClick={() => { loadDemo(); go('walk'); }} />
          <TweakButton label="Demo · Recall" onClick={() => { loadDemo(); go('recall'); }} />
          <TweakButton label="Demo · Done" onClick={() => { loadDemo(); setResult({ score: 7, total: 8, placed: placedAllDemo() }); go('done'); }} />
        </div>
      </TweaksPanel>
    </div>
  );
}

function placedAllDemo() {
  const out = {};
  TREEHOUSE_SPOTS.forEach((s, i) => { out[s.key] = PLANET_LIST.items[i]; });
  return out;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
