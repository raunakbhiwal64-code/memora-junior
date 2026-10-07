"""Cutouts (rembg), Buddy normalisation, and contact sheet.

Usage: python scripts/process_assets.py
Reads assets/raw/*.png, writes assets/cutouts/*.png and assets/contact_sheet.png.
Buddy cutouts are scaled so head-to-feet height matches B01, feet on a shared
baseline and body centred, all on a transparent 1024x1024 canvas. Props are
left untrimmed.
"""
import json, pathlib

from PIL import Image, ImageDraw
from rembg import remove, new_session

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW, CUT = ROOT / "assets" / "raw", ROOT / "assets" / "cutouts"
CANVAS, BASELINE = 1024, 960
assets = json.loads((ROOT / "assets" / "assets.json").read_text())
CUT.mkdir(parents=True, exist_ok=True)
session = new_session("isnet-general-use")


def cutout(a):
    src, dst = RAW / f"{a['id']}.png", CUT / f"{a['id']}.png"
    if not src.exists():
        return None
    if not dst.exists():
        img = remove(Image.open(src).convert("RGBA"), session=session, alpha_matting=True,
                     alpha_matting_foreground_threshold=240,
                     alpha_matting_background_threshold=10,
                     alpha_matting_erode_size=10)
        img.save(dst)
    return dst


def normalise_buddy(paths):
    boxes = {i: Image.open(p).getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
             for i, p in paths.items()}
    ref = boxes.get("B01_idle")
    if not ref:
        print("B01_idle missing: cannot normalise Buddy yet")
        return
    ref_h = ref[3] - ref[1]
    for i, p in paths.items():
        img, box = Image.open(p), boxes[i]
        s = ref_h / (box[3] - box[1])
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
        box = tuple(round(v * s) for v in box)
        # Centre on the body: use the horizontal middle of the lower half (arms/ears vary).
        body = img.crop((0, (box[1] + box[3]) // 2, img.width, box[3])).getchannel("A").point(
            lambda v: 255 if v > 20 else 0).getbbox()
        cx = (body[0] + body[2]) // 2
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.alpha_composite(img, (CANVAS // 2 - cx, BASELINE - box[3]))
        canvas.save(p)


def contact_sheet(items, cell=256):
    cols = 7
    rows = -(-len(items) // cols)
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 24)), (128, 128, 128))
    d = ImageDraw.Draw(sheet)
    for n, (id_, p) in enumerate(items):
        im = Image.open(p).convert("RGBA")
        im.thumbnail((cell, cell))
        x, y = (n % cols) * cell, (n // cols) * (cell + 24)
        sheet.paste(im, (x + (cell - im.width) // 2, y), im)
        d.text((x + 6, y + cell + 4), id_, fill=(255, 255, 255))
    return sheet


buddy, props = {}, {}
for a in assets:
    if a["series"] == "G":
        continue
    p = cutout(a)
    if p:
        (buddy if a["series"] == "B" else props)[a["id"]] = p
normalise_buddy(buddy)

rows = [contact_sheet(list(buddy.items())), contact_sheet(
    list(props.items()) + [(a["id"], RAW / f"{a['id']}.png") for a in assets
                           if a["series"] == "G" and (RAW / f"{a['id']}.png").exists()])]
final = Image.new("RGB", (max(r.width for r in rows), sum(r.height for r in rows)), (128, 128, 128))
y = 0
for r in rows:
    final.paste(r, (0, y)); y += r.height
final.save(ROOT / "assets" / "contact_sheet.png")
print("wrote assets/contact_sheet.png")
