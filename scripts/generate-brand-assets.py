#!/usr/bin/env python3
"""
Generates AIChieve's brand assets into ./public.

Why this exists: the assets in this directory were inherited from giniloh.com during the split,
so the site was serving the other property's favicon. Those are brand marks, not shared code —
they have to be re-drawn, not copied.

Outputs (all deterministic, re-runnable):
  public/favicon.svg           vector mark, hand-written below
  public/favicon.ico           16/32/48 raster of the same mark
  public/default-share-image.png   1200x630 Open Graph card

The share card also fixes a live bug: BaseLayout referenced /default-share-image.png on BOTH
properties but the file was never in public/, so every social embed fell back to a broken image.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PUBLIC = Path(__file__).resolve().parent.parent / "public"
PUBLIC.mkdir(parents=True, exist_ok=True)

VOID = (8, 9, 11)
SHELL = (14, 17, 22)
INK = (233, 238, 244)
INK2 = (163, 176, 190)
INK4 = (74, 84, 95)
SIGNAL = (232, 163, 61)

MONO_CANDIDATES = [
    "/System/Library/Fonts/SFNSMono.ttf",
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Supplemental/Andale Mono.ttf",
    "/Library/Fonts/Arial.ttf",
]
SANS_BOLD_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/Library/Fonts/Arial Bold.ttf",
]


def load(paths, size):
    for p in paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def tracked(draw, xy, text, font, fill, tracking):
    """Draw text with letter-spacing; PIL has no tracking support."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking
    return x


def tracked_width(draw, text, font, tracking):
    return sum(draw.textlength(c, font=font) for c in text) + tracking * (len(text) - 1)


# ── 1. favicon.svg ────────────────────────────────────────────────────────────────────────
# Sharp corners and a hairline amber frame — the console aesthetic at 16px. No rounded
# container, no gradient: it has to survive being shrunk into a browser tab.
(PUBLIC / "favicon.svg").write_text(
    """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" role="img" aria-label="AIChieve">
  <rect width="32" height="32" fill="#0E1116"/>
  <rect x="0.5" y="0.5" width="31" height="31" fill="none" stroke="#E8A33D" stroke-width="1"/>
  <text x="16" y="21.5" text-anchor="middle"
        font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        font-size="13" font-weight="700" letter-spacing="-0.5" fill="#E8A33D">AI</text>
</svg>
"""
)

# ── 2. favicon.ico ────────────────────────────────────────────────────────────────────────
def draw_mark(size):
    img = Image.new("RGBA", (size, size), SHELL + (255,))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, size - 1, size - 1], outline=SIGNAL, width=max(1, round(size / 32)))
    f = load(MONO_CANDIDATES, int(size * 0.46))
    d.text((size / 2, size * 0.53), "AI", font=f, fill=SIGNAL, anchor="mm")
    return img


ico_sizes = [48, 32, 16]
draw_mark(96).save(PUBLIC / "favicon.ico", sizes=[(s, s) for s in ico_sizes], format="ICO")

# ── 3. default-share-image.png (1200x630) ─────────────────────────────────────────────────
W, H = 1200, 630
card = Image.new("RGB", (W, H), VOID)
d = ImageDraw.Draw(card)


def blend(fg, alpha, bg=VOID):
    """Composite onto an RGB canvas at a true alpha.

    PIL drops the alpha channel when drawing onto an RGB image, so a 4-tuple fill paints
    fully opaque. The grid has to be blended by hand or it reads as a black lattice.
    """
    return tuple(round(b + (f - b) * alpha) for f, b in zip(fg, bg))


# engineering-drawing grid, same 32px rhythm as the site, at ~5% white
GRID = blend((255, 255, 255), 0.05)
for x in range(0, W, 32):
    d.line([(x, 0), (x, H)], fill=GRID, width=1)
for y in range(0, H, 32):
    d.line([(0, y), (W, y)], fill=GRID, width=1)

# amber cap rail + hairline frame
d.rectangle([0, 0, W - 1, H - 1], outline=blend((255, 255, 255), 0.11), width=1)
d.rectangle([0, 0, W - 1, 5], fill=SIGNAL)

PAD = 78
RIGHT = W - PAD

# eyebrow + wordmark
f_eyebrow = load(MONO_CANDIDATES, 21)
tracked(d, (PAD, 196), "ENTERPRISE COMMAND CENTER", f_eyebrow, SIGNAL, 4.2)

f_mark = load(SANS_BOLD_CANDIDATES, 104)
mark_end = tracked(d, (PAD, 236), "AICHIEVE", f_mark, INK, 3.0)

# right-hand domain stack — real coverage, right-aligned to the same margin, no invented numbers
f_side = load(MONO_CANDIDATES, 19)
for i, (label, colour) in enumerate(
    [("AI STACK TCO", SIGNAL), ("AGENTIC OPS", INK4), ("SUPPLY CHAIN", INK4)]
):
    w = tracked_width(d, label, f_side, 3.4)
    tracked(d, (RIGHT - w, 250 + i * 30), label, f_side, colour, 3.4)

# rule under the wordmark
d.line([(PAD, 356), (RIGHT, 356)], fill=blend((255, 255, 255), 0.16), width=1)

# tagline, wrapped by hand (two balanced lines)
f_tag = load(SANS_BOLD_CANDIDATES, 30)
for i, line in enumerate(
    [
        "Deterministic engines for AI stack economics,",
        "agentic workflows and supply-chain spend.",
    ]
):
    d.text((PAD, 396 + i * 44), line, font=f_tag, fill=INK2)

# footer: live lamp + domain, legible at thumbnail size
f_foot = load(MONO_CANDIDATES, 22)
d.ellipse([PAD, 549, PAD + 9, 558], fill=(78, 158, 134))
tracked(d, (PAD + 24, 539), "aichieve.net", f_foot, INK2, 3.0)

card.save(PUBLIC / "default-share-image.png", "PNG", optimize=True)

print("wrote:")
for name in ["favicon.svg", "favicon.ico", "default-share-image.png"]:
    p = PUBLIC / name
    print(f"  public/{name:<26} {p.stat().st_size:>8,} bytes")
