"""Generate raw Gemini images for every entry in assets/assets.json.

Usage: python scripts/generate_assets.py [--only B04,B05] [--max-calls 30]
Skips any ID whose file already exists in assets/raw/ (delete a file to regenerate it).
Model IDs were taken from Google's image-generation docs on 2026-10-07; override via
GEMINI_PRO_IMAGE_MODEL / GEMINI_FLASH_IMAGE_MODEL in .env if they change.
"""
import argparse, json, os, pathlib, sys

from dotenv import load_dotenv
from google import genai
from google.genai import types

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "raw"
REFERENCE = ROOT / "assets" / "reference" / "buddy_reference.jpg"

load_dotenv(ROOT / ".env")
PRO = os.environ.get("GEMINI_PRO_IMAGE_MODEL", "gemini-3-pro-image")
FLASH = os.environ.get("GEMINI_FLASH_IMAGE_MODEL", "gemini-3.1-flash-image")


def image_part(path):
    mime = "image/jpeg" if path.suffix.lower() in (".jpg", ".jpeg") else "image/png"
    return types.Part.from_bytes(data=path.read_bytes(), mime_type=mime)


def ordered(assets):
    """Parents before children."""
    done, out = set(), []
    pending = list(assets)
    while pending:
        progressed = False
        for a in list(pending):
            if a["parent"] is None or a["parent"] in done:
                out.append(a); done.add(a["id"]); pending.remove(a); progressed = True
        if not progressed:
            sys.exit("circular parent reference")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated IDs or ID prefixes, e.g. B04,B05")
    ap.add_argument("--max-calls", type=int, default=30)
    args = ap.parse_args()

    if not os.environ.get("GEMINI_API_KEY"):
        sys.exit("GEMINI_API_KEY missing (put it in .env)")
    assets = ordered(json.loads((ROOT / "assets" / "assets.json").read_text()))
    if args.only:
        wanted = [w.strip() for w in args.only.split(",")]
        assets = [a for a in assets if any(a["id"].startswith(w) for w in wanted)]

    RAW.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    calls = 0
    for a in assets:
        out = RAW / f"{a['id']}.png"
        if out.exists():
            print(f"skip {a['id']} (exists)")
            continue
        contents = []
        if a["type"] == "edit":
            parent = next(RAW.glob(f"{a['parent']}_*.png"), None)
            if parent is None:
                print(f"skip {a['id']}: parent {a['parent']} not generated/approved yet")
                continue
            contents.append(image_part(parent))
        elif a["use_reference"]:
            if not REFERENCE.exists():
                sys.exit(f"missing {REFERENCE}")
            contents.append(image_part(REFERENCE))
        contents.append(a["prompt"])
        if calls >= args.max_calls:
            print(f"--max-calls {args.max_calls} reached, stopping")
            break
        model = PRO if a["series"] == "B" else FLASH
        calls += 1
        print(f"generate {a['id']} with {model}")
        resp = client.models.generate_content(
            model=model, contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio=a["aspect_ratio"]),
            ),
        )
        data = next((p.inline_data.data for c in resp.candidates for p in c.content.parts
                     if getattr(p, "inline_data", None)), None)
        if data is None:
            print(f"  no image returned for {a['id']}")
            continue
        out.write_bytes(data)
    print(f"API calls made: {calls}")


if __name__ == "__main__":
    main()
