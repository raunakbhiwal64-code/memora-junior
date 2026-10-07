# Loci Numeracy: Asset Bible, Addition Pilot

Version 1, 2026-10-07. Drop this file into the Remotion project root. Claude Code uses it to generate, clean and QA every image asset for the Addition unit. Later units extend this file rather than replacing it.

## 1. Division of labour

Gemini makes only what needs charm: Buddy, backgrounds, characterful props. Remotion makes everything that must be exact: counts, positions, plus and equal signs, numbers, sparkles, glows, timing. **No image asset may contain text, numbers, math symbols or a specific count of objects.** Every counted object is a single-object sprite that code places N times.

## 2. Canvas and layout (16:9, 1920 x 1080)

Assumed 16:9 to match the earlier Veo clips. Change here if the app needs 9:16.

| Zone | Position | Rule |
|---|---|---|
| Buddy anchor | Screen-right third, horizontal centre x = 1350, feet baseline y = 1000 | Buddy rendered about 600 px tall |
| Action zone | x 250 to 1050, y 420 to 920 | Counted props, symbols, equations live here. Backgrounds keep it uncluttered |
| Equation strip | x 250 to 1050, y 120 to 320 | Numbers and signs appear here, drawn by code |
| Light direction | Soft warm daylight from upper left | Same in every asset, or cutouts will look pasted on |
| Camera | Low, at a small cub's eye level | Same in every asset |

## 3. Shared prompt blocks

Claude Code concatenates these blocks in the order shown for each asset. Never edit them per asset; consistency comes from repetition.

**STYLE**
> Warm Pixar-style 3D render, soft warm daylight from the upper left, saturated but gentle color palette, soft matte materials, children's educational animation style, clean and uncluttered.

**BUDDY**
> Buddy, a small golden-brown fluffy bear cub: round fuzzy ears, a small tuft of fur on top of his head, big round warm brown eyes, thin naturally-colored eyebrows (not thick, not dark), a small pink nose, a green bow tie, soft matte fluffy fur (not shiny, not plastic, not a plush toy), no blush circles on his cheeks. Match the attached reference image exactly: same proportions, same face shape, same fur color, same eyes.

**CUTOUT** (Buddy and props only)
> Single subject only, fully visible with a small even margin on all sides, centered in a square 1:1 image, camera at the subject's eye level. Plain flat solid light grey background, no floor, no ground shadow, no reflections, no extra objects, no text, no letters, no numbers, no logos, no border.

**BACKGROUND** (backgrounds only)
> Wide 16:9 scene, camera low at a small bear cub's eye level, soft depth of field on far elements. The scene is completely empty of characters, people and animals. No text, no letters, no numbers, no signs, no logos.

**EDIT** (variants made by editing an approved base image)
> Edit the attached image. Change only the following, and keep everything else identical, including pose, body, fur, bow tie, lighting, framing, scale and background: {CHANGE}

## 4. Buddy pose set (13 images)

Generate base poses with the reference image `assets/reference/buddy_reference.jpg` attached. Generate variants (marked EDIT) by editing the approved base, never from scratch. Code can mirror any pose horizontally, so only one pointing direction is needed.

| ID | Type | Prompt (after STYLE + BUDDY + CUTOUT) |
|---|---|---|
| B01_idle | Base | Buddy standing, facing camera, arms relaxed at his sides, gentle closed-mouth smile. |
| B02_idle_talk | EDIT of B01 | {CHANGE} = his mouth is open in a soft, friendly talking shape, as if mid-word. |
| B03_idle_blink | EDIT of B01 | {CHANGE} = his eyes are gently closed in a natural blink. |
| B04_wave_a | Base | Buddy standing, facing camera, his right paw raised at shoulder height in a friendly wave, paw tilted slightly outward, happy open-mouth smile. |
| B05_wave_b | EDIT of B04 | {CHANGE} = the waving paw is tilted slightly inward instead of outward. |
| B06_point | Base | Buddy standing, body facing camera, head turned slightly toward screen-left, left arm extended out to screen-left pointing with his paw at something beside him, closed-mouth smile. |
| B07_point_talk | EDIT of B06 | {CHANGE} = his mouth is open in a soft, friendly talking shape, as if mid-word. |
| B08_present | Base | Buddy standing, facing camera, both paws open with palms up, gesturing toward screen-left at waist height as if presenting something, closed-mouth smile. |
| B09_present_talk | EDIT of B08 | {CHANGE} = his mouth is open in a soft, friendly talking shape, as if mid-word. |
| B10_clap | Base | Buddy standing, facing camera, both paws pressed together in front of his chest mid-clap, big delighted open-mouth smile, eyes happily squinted. |
| B11_cone | Base | Buddy standing, facing camera, holding a single empty waffle cone in his left paw at chest height, arm extended slightly forward and toward screen-left, cone opening pointing straight up. The cone is completely empty: no ice cream, no scoops, nothing inside or on top. Big proud smile. |
| B12_cone_talk | EDIT of B11 | {CHANGE} = his mouth is open in a soft, friendly talking shape, as if mid-word. The cone stays completely empty. |
| B13_proud | Base | Buddy standing, facing camera, one paw raised in a cheerful thumbs-up, the other on his hip, big confident smile. |

Why the cone is empty: the scoop count is the exact failure from the Gemini video attempts, so scoops are separate sprites stacked by code (P06 to P08).

## 5. Props (8 images)

Prompt = STYLE + CUTOUT + the line below. Make P06 first, then create P07 and P08 by EDIT from P06 so all three scoops share one size and shape and stack cleanly.

| ID | Type | Prompt |
|---|---|---|
| P01_apple_red | Base | A single shiny red apple with a short brown stem and one small green leaf, three-quarter view from slightly above. |
| P02_apple_green | Base | A single green apple with a short brown stem and one small green leaf, three-quarter view from slightly above, same size and style as a typical red apple. |
| P03_duck_yellow | Base | A single cute stylized yellow duckling shown in side view facing screen-right, body posed as if floating on water but with no water shown, small orange beak, big friendly eye. |
| P04_duck_blue | EDIT of P03 | {CHANGE} = the duckling's feathers are soft sky blue instead of yellow. |
| P05_lilypad | Base | A single round green lily pad seen from a low angle, with one small pink flower on it. |
| P06_scoop_vanilla | Base | A single round scoop of vanilla ice cream, front view, smooth rounded top and a slightly ruffled flat base so it could sit on a cone or on another scoop, no cone. |
| P07_scoop_chocolate | EDIT of P06 | {CHANGE} = the ice cream is rich chocolate brown instead of vanilla. |
| P08_scoop_strawberry | EDIT of P06 | {CHANGE} = the ice cream is soft pink strawberry instead of vanilla. |

## 6. Backgrounds (2 images)

Prompt = STYLE + BACKGROUND + the line below. Aspect ratio 16:9. No background removal.

| ID | Prompt |
|---|---|
| G01_playground | A sunny children's playground on a summer day. In the left-centre foreground, a simple wooden table with a flat, clearly visible, completely empty tabletop whose top surface sits a little below the vertical middle of the frame. The right third of the frame is open soft green grass with nothing on it, where a character will later stand. Playground equipment and trees softly blurred in the background. |
| G02_pond | The grassy edge of a calm, small pond in a sunny park on a summer day. The right third of the frame is an open soft green grass bank with nothing on it, where a character will later stand. Calm clear water fills the left two-thirds of the lower half of the frame, kept completely open in the middle with no lily pads, rocks or objects there. A few lily pads only near the far left edge and the far shoreline. Playground equipment and trees softly blurred in the far background. |

## 7. Claude Code brief: asset pipeline

Paste the following into Claude Code from the project root.

> Build an asset pipeline from `ASSET_BIBLE_Addition.md`.
>
> 1. Convert sections 3 to 6 into `assets/assets.json`: one entry per ID with type (base or edit), parent ID for edits, aspect ratio, whether to remove the background, and the fully concatenated prompt.
> 2. Write `scripts/generate_assets.py` that calls the Gemini API image model using `GEMINI_API_KEY` from `.env` (add `.env` to `.gitignore`). Check the current model IDs in Google's docs before coding; use the Pro image model for Buddy (B-series) and the Flash image model for props and backgrounds. Attach `assets/reference/buddy_reference.jpg` to every B-series base call. For EDIT entries, attach the approved parent image and send only the EDIT prompt.
> 3. Make it idempotent: skip any ID whose file already exists in `assets/raw/`, so deleting a rejected file and rerunning regenerates only that asset. Generate parents before children. Add a `--only B04,B05` flag and a `--max-calls 30` safety limit, and print the call count at the end.
> 4. Remove backgrounds with `rembg` (alpha matting on) for B and P series into `assets/cutouts/`. Do not auto-trim Buddy images. Instead normalise every Buddy cutout onto the same transparent 1024 x 1024 canvas: scale so his head-to-feet height matches B01, align his feet to the same baseline and his body to the same horizontal centre. This keeps poses swappable without jitter.
> 5. Generate `assets/contact_sheet.png`: all Buddy cutouts side by side at identical scale on a mid-grey background, labelled by ID, then props and backgrounds in a second row.
> 6. Stop after the contact sheet and show it to me. Do not start building the video yet.

## 8. QA checklist (before anything goes into Remotion)

Check the contact sheet against these, and delete and regenerate any failing ID.

- Ears, head tuft, eye color, eyebrow thickness and nose identical across all 13 Buddy images.
- Bow tie is the same green and the same shape everywhere.
- No blush circles, no shiny or plush-toy fur.
- Head-to-body ratio consistent (the most common silent drift).
- Every EDIT variant differs from its parent only in the requested feature. Flip between B01 and B02 quickly: only the mouth should move.
- B11 and B12 cone is empty. Paws have a believable shape.
- No text, numbers or symbols anywhere in any image.
- Clean cutout edges with no grey halo around the fur, especially on ears.
- The three scoops are the same size and shape.
- Both backgrounds keep the action zone and the right-third Buddy zone empty, with light from the upper left.

## 9. Known risks

- **Edits can still shift small details.** If an EDIT variant drifts, regenerate it with the extra line: "Do not change the face shape, eyes or proportions."
- **Pro image model has no free API tier.** Budget about 40 to 60 calls including retries for this pilot.
- **Mirroring a pose flips the light direction.** Use mirrored poses sparingly and briefly.
- **Scale between cone and scoops is set in code.** Claude Code calibrates the scoop width to the cone opening in B11 once and stores it as a constant.
