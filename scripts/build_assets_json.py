"""Parse ASSET_BIBLE_Addition.md (sections 3-6) into assets/assets.json."""
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
text = (root / "ASSET_BIBLE_Addition.md").read_text()

blocks = {}
for name in ["STYLE", "BUDDY", "CUTOUT", "BACKGROUND", "EDIT"]:
    m = re.search(rf"\*\*{name}\*\*[^\n]*\n> (.+)", text)
    blocks[name] = m.group(1).strip()

out = []
for line in text.splitlines():
    m = re.match(r"\| ((?:B|P|G)\d\d_\w+) \| (.*?) \|(?: (.*) \|)?\s*$", line)
    if not m:
        continue
    id_, c2, c3 = m.group(1), m.group(2), m.group(3)
    series = id_[0]
    if series == "G":
        kind, parent, body = "base", None, c2
    else:
        em = re.match(r"EDIT of (\w+)", c2)
        kind, parent, body = ("edit", em.group(1), c3) if em else ("base", None, c3)
    out.append((id_, series, kind, parent, body))

# Props table rows are 'ID | Type | Prompt' like the Buddy table, except P04/P07/P08 carry
# their parent in the prompt cell, so map those explicitly.
assets = []
for id_, series, kind, parent, body in out:
    if series == "P" and "{CHANGE}" in body:
        kind, parent = "edit", {"P04": "P03", "P07": "P06", "P08": "P06"}[id_[:3]]
    if kind == "edit":
        change = body.split("{CHANGE} =", 1)[1].strip()
        prompt = blocks["EDIT"].replace("{CHANGE}", change)
    elif series == "B":
        prompt = " ".join([blocks["STYLE"], blocks["BUDDY"], blocks["CUTOUT"], body])
    elif series == "P":
        prompt = " ".join([blocks["STYLE"], blocks["CUTOUT"], body])
    else:
        prompt = " ".join([blocks["STYLE"], blocks["BACKGROUND"], body])
    assets.append({
        "id": id_, "series": series, "type": kind, "parent": parent,
        "aspect_ratio": "16:9" if series == "G" else "1:1",
        "remove_background": series in "BP",
        "use_reference": series == "B" and kind == "base",
        "prompt": prompt,
    })

(root / "assets").mkdir(exist_ok=True)
(root / "assets" / "assets.json").write_text(json.dumps(assets, indent=2) + "\n")
print(f"wrote {len(assets)} assets")
