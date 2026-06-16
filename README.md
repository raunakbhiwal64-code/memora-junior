# Memora Junior

A memory palace web app for kids (and curious adults). Build a visual memory palace, hide items at spots, walk through it, and test your recall — all in the browser, no sign-in, no data uploaded.

## What it does

**Full core loop:**
- **Home** → pick a palace or build one from your own room photos
- **Meet the list** — see what you're going to memorise
- **Placement coach** — steps through each spot with vivid, silly imagery prompts
- **The walk** — auto-playing rehearsal with a glowing path
- **Active recall** — spot-by-spot pick-from-pool or fill-in-the-blank
- **Celebration** — mastery score + parent-friendly explanation

**Three ready-made palaces (60+ spots total):**
| Palace | Rooms | Spots |
|--------|-------|-------|
| 🌳 Treehouse | Exterior · Playhouse · Garden | 30 |
| 🐠 Aquarium | Big Tank · Glass Tunnel | 18 |
| 🏡 Dummy House | Living Room · Kitchen · Bedroom | 24 |

**Your own house** — upload room photos, tap to pin numbered spots (parent-gated, EXIF stripped).

**What to memorise:**
- Built-in: the eight planets demo list
- Import any list — up to 100 items, from .txt/.csv or paste
- Learn a text — paste a poem, notes, passage, or vocab list; the system pulls keywords for fill-in-the-blank recall

**Live tweaks** (⚙️ panel): theme (parchment / dusk / meadow), font style, dyslexia-friendly type, motion speed, audio narration (real browser TTS).

## Tech

Plain HTML + CSS + JavaScript. React 18 and Babel are loaded via CDN — no build step, no node_modules, no bundler. Open `index.html` in any modern browser.

```
index.html          ← entry point
app/
  styles.css        ← design system tokens + all component styles
  data.jsx          ← palace data, list parsing, localStorage store
  components.jsx    ← shared UI (buttons, coach bubble, progress ribbon)
  art.jsx           ← SVG illustrations for all ready-made rooms
  scene.jsx         ← PalaceScene (SVG art + loci overlay)
  builder.jsx       ← photo palace builder + list importer + parental gate
  screens-a.jsx     ← Home, Picker, Preview, List picker, Meet
  screens-b.jsx     ← Place, Walk, Recall, Done
  text.jsx          ← Learn-a-text builder + cloze recall
  tweaks-panel.jsx  ← floating tweaks panel (theme, font, etc.)
  main.jsx          ← app state machine
```

## Running locally

```bash
# Any static server works, e.g.:
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

> **Note:** Opening `index.html` directly (`file://`) blocks the JSX `<script src>` loads in some browsers (CORS). Use a local server.

## Deploying

This is a static site — deploy anywhere:

- **GitHub Pages**: enable Pages in repo Settings → Pages → deploy from branch `main`, folder `/` (root).
- **Netlify / Vercel**: connect the repo, no build command needed, publish directory is `.` (root).

## Privacy

Nothing leaves the device. All palaces, photos, and lists are saved in `localStorage` only. Photos are downscaled and re-encoded through a canvas on import — EXIF/GPS data is stripped automatically.

## Extending

To add a new ready-made palace, add an entry to `READY` in `data.jsx` and a matching SVG art component in `art.jsx`, then register it in the `ART` object. The place/walk/recall engine is generic and drives any palace shape automatically.

Space Station 🛰️ and Pirate Ship 🏴‍☠️ are stubbed in the coming-soon rail — pull requests welcome!
