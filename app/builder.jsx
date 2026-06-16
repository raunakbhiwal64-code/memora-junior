// builder.jsx — Palace Builder (upload house photos + tap to place spots)
// and List Importer (paste or upload your own data). Both persist locally.

const { useState: useB, useRef: useBR, useEffect: useBE } = React;

// Capture the current video frame, downscaled, as a JPEG data URL.
// Drawing through a fresh canvas means the result carries NO EXIF / GPS.
function frameToDataURL(video, maxDim = 1280, quality = 0.82) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  const sc = Math.min(1, maxDim / Math.max(vw, vh));
  const w = Math.round(vw * sc), h = Math.round(vh * sc);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(video, 0, 0, w, h);
  try { return c.toDataURL('image/jpeg', quality); } catch (e) { return null; }
}

// downscale an uploaded image so many rooms still fit in localStorage.
// Re-encoding through a canvas also DROPS all EXIF / GPS metadata (PRD §7.5):
// the saved photo can never leak where the child lives.
function downscaleImage(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      const sc = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * sc); h = Math.round(h * sc);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try { resolve(c.toDataURL('image/jpeg', quality)); } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ============================================================ PARENTAL GATE
// PRD §7.5: creating a photo palace is parent-gated. A simple times-table
// check keeps the photo features in a grown-up's hands.
function ParentGate({ onPass, onCancel }) {
  const [a] = useB(() => 3 + Math.floor(Math.random() * 6));
  const [b] = useB(() => 4 + Math.floor(Math.random() * 6));
  const [val, setVal] = useB('');
  const [err, setErr] = useB(false);
  const submit = () => { if (parseInt(val, 10) === a * b) onPass(); else { setErr(true); setVal(''); } };
  return (
    <div className="screen gate">
      <div className="gate-card">
        <span className="gate-emoji" aria-hidden="true">🔐</span>
        <h2 className="gate-title">Grown-ups only</h2>
        <p className="gate-lede">Building a palace from real photos needs a parent or guardian. Ask a grown-up to answer this:</p>
        <div className="gate-q">{a} × {b} = ?</div>
        <input className="gate-input" inputMode="numeric" value={val} autoFocus
          onChange={(e) => { setErr(false); setVal(e.target.value.replace(/\D/g, '').slice(0, 3)); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()} aria-label="Answer" />
        {err && <p className="gate-err">Not quite — have another go.</p>}
        <div className="gate-actions">
          <BigButton kind="ghost" onClick={onCancel}>Back</BigButton>
          <BigButton onClick={submit} disabled={!val}>Continue →</BigButton>
        </div>
        <p className="store-note center">🔒 Photos stay on this device and never leave it. A grown-up should take the pictures.</p>
      </div>
    </div>
  );
}

// ============================================================ CAMERA CAPTURE
// Live in-app camera, works on laptop webcams and phones alike via
// getUserMedia. Prefers the rear ("environment") camera on phones, lets you
// flip cameras, snap → preview → keep/retake. Returns a downscaled, EXIF-free
// data URL. getUserMedia needs HTTPS (GitHub Pages is fine) or localhost; if it
// is unavailable we fall back to the OS camera/file picker.
function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useBR(null);
  const streamRef = useBR(null);
  const [facing, setFacing] = useB('environment');
  const [canFlip, setCanFlip] = useB(false);
  const [shot, setShot] = useB(null);   // captured data URL (preview)
  const [error, setError] = useB(null);
  const [ready, setReady] = useB(false);

  const stop = () => {
    const s = streamRef.current;
    if (s) { s.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };

  // (re)start the stream whenever the chosen camera changes
  useBE(() => {
    let cancelled = false;
    if (shot) return;            // paused while previewing a still
    setReady(false); setError(null);
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) { setError('nocam'); return; }
    md.getUserMedia({ video: { facingMode: facing }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
        md.enumerateDevices && md.enumerateDevices()
          .then((ds) => { if (!cancelled) setCanFlip(ds.filter((d) => d.kind === 'videoinput').length > 1); })
          .catch(() => {});
        setReady(true);
      })
      .catch((e) => { if (!cancelled) setError(e && e.name === 'NotAllowedError' ? 'denied' : 'fail'); });
    return () => { cancelled = true; stop(); };
  }, [facing, shot]);

  useBE(() => stop, []); // stop camera on unmount

  const snap = () => {
    const url = frameToDataURL(videoRef.current);
    if (url) { setShot(url); stop(); }
  };
  const retake = () => setShot(null);
  const use = () => { stop(); onCapture(shot); };
  const flip = () => setFacing((f) => (f === 'environment' ? 'user' : 'environment'));

  return (
    <div className="cam-overlay" role="dialog" aria-label="Take a photo">
      <div className="cam-frame">
        {shot ? (
          <img className="cam-view" src={shot} alt="Captured photo preview" />
        ) : (
          <video ref={videoRef} className={'cam-view' + (facing === 'user' ? ' is-mirror' : '')} playsInline muted />
        )}

        {error && (
          <div className="cam-error">
            <span className="cam-error-emoji" aria-hidden="true">📷</span>
            <p>{error === 'denied'
              ? 'Camera access was blocked. Allow the camera in your browser, or pick a photo instead.'
              : 'No camera available here. You can pick a photo instead.'}</p>
            <CamFallbackButton onPick={(url) => onCapture(url)} />
          </div>
        )}

        {!shot && !error && !ready && <div className="cam-loading">Starting camera…</div>}
      </div>

      <div className="cam-bar">
        {shot ? (
          <>
            <BigButton kind="ghost" onClick={retake}>↺ Retake</BigButton>
            <BigButton onClick={use}>Use photo ✓</BigButton>
          </>
        ) : (
          <>
            <BigButton kind="ghost" onClick={() => { stop(); onCancel(); }}>Cancel</BigButton>
            <button type="button" className="cam-shutter" onClick={snap} disabled={!ready} aria-label="Take photo" />
            <button type="button" className="cam-flip" onClick={flip} disabled={!ready || !canFlip} aria-label="Flip camera">🔄</button>
          </>
        )}
      </div>
      <p className="store-note center">🔒 Photos stay on this device. Location info is removed automatically.</p>
    </div>
  );
}

// Fallback when getUserMedia is unavailable/blocked: the OS picker, which on
// phones still offers "Take Photo" directly.
function CamFallbackButton({ onPick }) {
  const ref = useBR(null);
  return (
    <>
      <BigButton onClick={() => ref.current && ref.current.click()}>📁 Choose / take a photo</BigButton>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) { try { onPick(await downscaleImage(f)); } catch (err) {} } }} />
    </>
  );
}

// ============================================================ PALACE BUILDER
function PalaceBuilderScreen({ initial, onSave, onCancel }) {
  const [palace, setPalace] = useB(initial || { id: 'pal-' + Date.now(), name: '', kind: 'custom', rooms: [] });
  const [roomIdx, setRoomIdx] = useB(0);
  const [busy, setBusy] = useB(false);
  const [camOpen, setCamOpen] = useB(false);
  const fileRef = useBR(null);

  const rooms = palace.rooms;
  const room = rooms[roomIdx] || null;
  const total = totalSpots(palace);

  // append a room from an already-encoded (downscaled, EXIF-free) data URL
  const addRoomFromURL = (img) => {
    const next = [...rooms, { id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6), name: 'Room ' + (rooms.length + 1), type: 'photo', img, spots: [] }];
    setPalace({ ...palace, rooms: next });
    setRoomIdx(next.length - 1);
  };

  const addPhotos = async (files) => {
    if (!files || !files.length) return;
    setBusy(true);
    const next = [...rooms];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const img = await downscaleImage(f);
        next.push({ id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6), name: 'Room ' + (next.length + 1), type: 'photo', img, spots: [] });
      } catch (e) { /* skip */ }
    }
    setPalace({ ...palace, rooms: next });
    setRoomIdx(next.length - 1);
    setBusy(false);
  };

  const addSpot = (x, y) => {
    if (total >= MAX_ITEMS) return;
    const next = rooms.map((r, i) => i === roomIdx
      ? { ...r, spots: [...r.spots, { id: r.id + '-' + Date.now(), localN: r.spots.length + 1, x, y }] }
      : r);
    setPalace({ ...palace, rooms: next });
  };
  const removeSpot = (sp) => {
    const next = rooms.map((r, i) => i === roomIdx
      ? { ...r, spots: r.spots.filter((s) => s.id !== sp.id).map((s, k) => ({ ...s, localN: k + 1 })) }
      : r);
    setPalace({ ...palace, rooms: next });
  };
  const removeRoom = (idx) => {
    const next = rooms.filter((_, i) => i !== idx);
    setPalace({ ...palace, rooms: next });
    setRoomIdx(Math.max(0, Math.min(idx, next.length - 1)));
  };
  const renameRoom = (idx, name) => {
    setPalace({ ...palace, rooms: rooms.map((r, i) => i === idx ? { ...r, name } : r) });
  };

  const canSave = palace.name.trim() && total >= 1;

  return (
    <div className="screen split">
      <div className="split-scene builder-scene">
        {room ? (
          <PalaceScene room={room} builderMode onPhotoTap={addSpot} onRemoveSpot={removeSpot} showNumbers />
        ) : (
          <div className="builder-empty">
            <span className="builder-empty-emoji" aria-hidden="true">🏠📸</span>
            <p>Add photos of rooms in your home.<br />A bedroom, the kitchen, the hallway&hellip;</p>
            <div className="builder-empty-actions">
              <BigButton onClick={() => setCamOpen(true)}>📷 Take a photo</BigButton>
              <BigButton kind="ghost" onClick={() => fileRef.current && fileRef.current.click()}>🖼️ Choose photos</BigButton>
            </div>
          </div>
        )}
        {room && <div className="scene-caption">Tap the photo to drop a spot &middot; {room.spots.length} here</div>}
      </div>

      <div className="split-panel builder-panel">
        <div className="builder-head">
          <div>
            <div className="place-step">Build your palace</div>
            <input className="builder-name" placeholder="Name your palace…" value={palace.name}
              onChange={(e) => setPalace({ ...palace, name: e.target.value })} maxLength={28} />
          </div>
          <span className="builder-count" data-full={total >= MAX_ITEMS ? 'true' : 'false'}>{total}<small>/{MAX_ITEMS} spots</small></span>
        </div>

        <p className="builder-tip">
          📸 Add a photo for each room, then <strong>tap the picture</strong> to drop numbered spots on things you&rsquo;ll
          remember &mdash; the bed, a lamp, the fridge. <strong>Snap places, not people</strong> &mdash; keep faces out.
        </p>

        <div className="room-strip">
          {rooms.map((r, i) => (
            <div key={r.id} className={'room-thumb' + (i === roomIdx ? ' is-active' : '')} onClick={() => setRoomIdx(i)}>
              <img src={r.img} alt="" />
              <span className="room-thumb-n">{r.spots.length}</span>
              <button type="button" className="room-thumb-del" onClick={(e) => { e.stopPropagation(); removeRoom(i); }} aria-label="Remove room">×</button>
            </div>
          ))}
          <button type="button" className="room-add room-cam" onClick={() => setCamOpen(true)} disabled={busy} aria-label="Take a photo">📷</button>
          <button type="button" className="room-add" onClick={() => fileRef.current && fileRef.current.click()} disabled={busy} aria-label="Add photos from device">
            {busy ? '…' : '＋'}
          </button>
        </div>

        {room && (
          <input className="builder-room-name" value={room.name} onChange={(e) => renameRoom(roomIdx, e.target.value)} maxLength={24} aria-label="Room name" />
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={(e) => { addPhotos([...e.target.files]); e.target.value = ''; }} />

        <div className="builder-actions">
          <BigButton kind="ghost" onClick={onCancel}>Cancel</BigButton>
          <BigButton onClick={() => canSave && onSave(palace)} disabled={!canSave} style={{ flex: 1 }}>
            Save palace ✓
          </BigButton>
        </div>
        <p className="store-note">🔒 Saved only on this device. Photo location info is removed automatically &mdash; nothing is uploaded.</p>
      </div>

      {camOpen && (
        <CameraCapture
          onCancel={() => setCamOpen(false)}
          onCapture={(img) => { setCamOpen(false); if (img) addRoomFromURL(img); }} />
      )}
    </div>
  );
}

// ============================================================ LIST IMPORTER
function ListImportScreen({ onSave, onCancel }) {
  const [title, setTitle] = useB('');
  const [raw, setRaw] = useB('');
  const fileRef = useBR(null);
  const preview = parseList(raw, title || 'My list');
  const tooMany = preview.items.length >= MAX_ITEMS;

  const loadFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRaw(String(reader.result || ''));
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    };
    reader.readAsText(f);
  };

  return (
    <div className="screen import">
      <header className="screen-head">
        <h2 className="screen-title">Bring your own list</h2>
        <p className="screen-lede">Spelling words, French vocab, a shopping list &mdash; up to {MAX_ITEMS} things.</p>
      </header>

      <div className="import-grid">
        <div className="import-left">
          <input className="builder-name" placeholder="List name… (e.g. Friday spellings)" value={title}
            onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          <textarea className="import-area" placeholder={'Type or paste here — one thing per line.\n\nmercury\nvenus\nearth\n…'}
            value={raw} onChange={(e) => setRaw(e.target.value)} />
          <div className="import-tools">
            <BigButton kind="ghost" onClick={() => fileRef.current && fileRef.current.click()}>📄 Upload .txt / .csv</BigButton>
            <input ref={fileRef} type="file" accept=".txt,.csv,text/plain,text/csv" style={{ display: 'none' }}
              onChange={(e) => { loadFile(e.target.files[0]); e.target.value = ''; }} />
          </div>
        </div>

        <div className="import-right">
          <div className="import-count" data-full={tooMany ? 'true' : 'false'}>
            <strong>{preview.items.length}</strong> item{preview.items.length === 1 ? '' : 's'}
            {tooMany && <span className="import-cap"> (kept the first {MAX_ITEMS})</span>}
          </div>
          <div className="import-preview">
            {preview.items.length === 0
              ? <p className="import-empty">Your items will show up here as you type.</p>
              : preview.items.map((it, i) => (
                <span key={it.id} className="prev-chip" style={{ '--chip-accent': it.color }}>
                  <span className="prev-n">{i + 1}</span>{it.label}
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="import-actions">
        <BigButton kind="ghost" onClick={onCancel}>Cancel</BigButton>
        <BigButton onClick={() => onSave(preview)} disabled={preview.items.length < 1}>Use this list →</BigButton>
      </div>
      <p className="store-note center">🔒 Your list is saved only on this device.</p>
    </div>
  );
}

Object.assign(window, { ParentGate, PalaceBuilderScreen, ListImportScreen, downscaleImage, CameraCapture, frameToDataURL });
