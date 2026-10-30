#!/usr/bin/env python3
"""
Build the five standard-engine launch films.

ONE composition, five renders. The five tools are one product surface, so a series (same
console, same rhythm, same ending) reads as a register rather than five unrelated ads. Only
the content, the voice and the music change per film.

Per film:
  1. synthesise five narration beats with Kokoro (a different voice each film),
  2. measure them and lay the scene windows out from the real audio (never a guessed tempo),
  3. emit a Hyperframes composition with the film's own music track,
  4. hold the final frame for three seconds of music after the last word.

Usage:  python3 build-videos.py [--only <slug>]
"""
import json
import math
import pathlib
import shutil
import subprocess
import sys
import wave

SKILL = pathlib.Path.home() / ".hermes/skills/brag"
FONTS_FROM = pathlib.Path(
    "/Users/jorgefernandezilufi/Documents/Websites/giniloh front end/AICHIEVE"
    "/brag-output-2026-10-24-175139/composition/assets/fonts"
)
KOKORO_PY = pathlib.Path.home() / ".venvs/kokoro/bin/python"
RUN = pathlib.Path(__file__).parent
TAIL_SECONDS = 3.0

# ── the films ────────────────────────────────────────────────────────────────────────────────
# Numbers are the engines' own defaults, recomputed in scripts/check-engines.mjs. Nothing here is
# invented for the film: if a figure changes in the model, this file is wrong and the page is right.

FILMS = [
    {
        "slug": "agentic-workflow-breakeven",
        "voice": "am_michael",
        "music": "happy-beats-business-moves-vol-1-by-ende-dot-app.mp3",
        "music_volume": 0.30,
        "eyebrow": "Agentic operations",
        "title": "Agentic Workflow Breakeven",
        "hook": {"figure": "$19.90", "unit": "per run", "claim": "against $13.50 handled by a person"},
        "kpis": [
            ("Cost per run", "$19.90", "+$6.40 vs manual", "erosion"),
            ("The cliff", "3.2%", "failure rate", "base"),
            ("Monthly delta", "$160k", "worse than manual", "erosion"),
        ],
        "bars": [
            ("Tokens, including retries", "$0.08", 2, "base"),
            ("Human audit sample", "$5.33", 54, "friction"),
            ("Rework of failures", "$3.80", 39, "friction"),
            ("Escaped defects", "$10.69", 100, "erosion"),
        ],
        "verdict_head": "$19.90 vs $13.50 a run",
        "verdict": ("Above the verification cliff", "Above 3.2% failure, every point costs more."),
        "bridge": "SpendProof audits the invoice this estimate takes on trust.",
        "beats": [
            "Eighteen minutes of a person costs thirteen fifty. The agent, nineteen ninety.",
            "Tokens cost eight cents. Audit and rework cost nineteen eighty-two.",
            "So the cliff sits at three point two percent failure.",
            "Above three point two percent failure, every point costs more than the labour it removed.",
            "AIChieve dot net. Every number yours.",
        ],
    },
    {
        "slug": "warehouse-slotting-payback",
        "voice": "bf_emma",
        "music": "happy-beats-business-moves-vol-9-by-ende-dot-app.mp3",
        "music_volume": 0.30,
        "eyebrow": "Warehouse and CAPEX",
        "title": "Slotting & Automation Payback",
        "hook": {"figure": "9.93", "unit": "years", "claim": "on your baseline. The vendor quotes 3.13."},
        "kpis": [
            ("Buyer payback", "9.93 yr", "vendor says 3.13", "erosion"),
            ("Free recovery", "$208k", "a year, no capital", "positive"),
            ("Picker miles", "193", "a day, before re-slotting", "base"),
        ],
        "bars": [
            ("Today", "$999k", 100, "muted"),
            ("After re-slotting", "$791k", 79, "positive"),
            ("After automation", "$356k", 36, "base"),
        ],
        "verdict_head": "9.93 yr vs 3.13 quoted",
        "verdict": ("The vendor number is short", "Credited to the layout, the free re-slot takes most of the saving."),
        "bridge": "CaseProof re-runs the vendor's business case line by line.",
        "beats": [
            "The vendor quotes three point one years. On your baseline it is nine point nine.",
            "Re-slotting recovers two hundred eight thousand a year, with no capital.",
            "The vendor counts it twice, and leaves out maintenance and integration.",
            "Credited to the layout, the free re-slot takes most of the saving the machine is sold on.",
            "AIChieve dot net. Every number yours.",
        ],
    },
    {
        "slug": "inventory-record-accuracy",
        "voice": "af_nova",
        "music": "happy-beats-business-moves-vol-11-by-ende-dot-app.mp3",
        "music_volume": 0.30,
        "eyebrow": "Supply chain",
        "title": "Inventory Record Accuracy",
        "hook": {"figure": "$11.1m", "unit": "dead cash", "claim": "buffer stock covering a record, not a demand"},
        "kpis": [
            ("Dead cash", "$11.1m", "$2.4m a year to hold", "erosion"),
            ("Phantom stockouts", "$5.4m", "margin a year", "friction"),
            ("Units per SKU", "184.4", "215 with clean records", "base"),
        ],
        "bars": [
            ("Stock held against the records", "$11.1m", 100, "erosion"),
            ("Holding cost a year", "$2.4m", 22, "friction"),
            ("Margin lost to phantom stock", "$5.4m", 48, "friction"),
        ],
        "verdict_head": "$11.1m dead cash · $5.4m margin",
        "verdict": ("Buffer stock against a data error", "The buffer covers the records, not the demand."),
        "bridge": "CaseProof stress-tests the storage vendor's ROI on your own costs.",
        "beats": [
            "Sixty-five percent of records disagree with the shelf. That buffer is eleven million.",
            "Demand explains two fifteen. The records add a hundred eighty-five.",
            "Phantom stock costs five point four million a year in margin.",
            "The buffer covers the record gap, not the demand.",
            "AIChieve dot net. Every number yours.",
        ],
    },
    {
        "slug": "total-delivered-cost",
        "voice": "am_adam",
        "music": "happy-beats-business-moves-vol-12-by-ende-dot-app.mp3",
        "music_volume": 0.30,
        "eyebrow": "Supply chain",
        "title": "Total Delivered Cost",
        "hook": {"figure": "$23.64", "unit": "delivered", "claim": "to land a $45 unit. $21.36 is left."},
        "kpis": [
            ("Contribution", "$21.36", "47.5% of the price", "positive"),
            ("Duty per unit", "$4.02", "17.0% of delivered cost", "friction"),
            ("Customs assist", "$1.10", "tooling, taxed again", "friction"),
        ],
        "bars": [
            ("Goods at FOB", "$11.50", 48, "base"),
            ("Customs assist", "$1.10", 5, "friction"),
            ("Duty, 301, MPF and HMF", "$4.02", 17, "friction"),
            ("Ocean freight", "$1.59", 7, "base"),
            ("Capital in transit", "$0.68", 3, "friction"),
            ("Cost to serve and returns", "$4.75", 20, "erosion"),
        ],
        "verdict_head": "$21.36 left of $45",
        "verdict": ("Duty is the second cost", "Duty and freight take the rest."),
        "bridge": "FacturGate validates the invoice before it is sent.",
        "beats": [
            "A forty-five dollar unit lands at twenty-three sixty-four. Twenty-one thirty-six is left.",
            "Twenty-two thousand of tooling is one dollar ten per unit, dutiable.",
            "The entry fee is eight hundred seventy-three, capped at six thirty-four.",
            "Cube, capital and returns each take a per-unit share.",
            "AIChieve dot net. Every number yours.",
        ],
    },
    {
        "slug": "parcel-dim-weight",
        "voice": "bf_isabella",
        "music": "happy-beats-business-moves-vol-10-by-ende-dot-app.mp3",
        "music_volume": 0.30,
        "eyebrow": "Logistics",
        "title": "Parcel DIM Weight",
        "hook": {"figure": "22 lb", "unit": "billed", "claim": "for a 9.2 lb box. Twelve of it is air."},
        "kpis": [
            ("Recoverable", "$894k", "divisor and carton", "positive"),
            ("Excess billed", "238.5k lb", "a month, on cube", "friction"),
            ("Structural", "$931k", "residential and DAS", "erosion"),
        ],
        "bars": [
            ("Scale weight", "10 lb", 45, "muted"),
            ("Billed at divisor 139", "22 lb", 100, "erosion"),
            ("Billed at divisor 166", "19 lb", 86, "friction"),
            ("166 and two inches smaller", "16 lb", 73, "positive"),
        ],
        "verdict_head": "22 lb billed · 9.2 lb box",
        "verdict": ("Recoverable by contract and carton", "The divisor and the box come back."),
        "bridge": "ParcelProof recomputes every tracking number on the invoice.",
        "beats": [
            "A nine pound box bills at twenty-two. Twelve pounds of that is air.",
            "One thirty-nine published. One sixty-six negotiated.",
            "Three sixty-seven thousand comes back from a smaller box.",
            "Only the divisor and the carton come back. Residential and delivery-area fees never do.",
            "AIChieve dot net. Every number yours.",
        ],
    },
]

# Measured on the console ground (#12161c): base 9.0:1, friction 8.5:1, erosion 6.1:1,
# positive 8.0:1, muted 6.5:1. The instrument bay's palette (#0e7490, #92400e, #a33b32) is authored
# for white paper and drops to 2.77:1 here — the same trap the site's own bay rules exist to avoid.
TONE = {
    "base": "#8fc4e0",
    "friction": "#e8a33d",
    "erosion": "#e07a6e",
    "positive": "#7fc7b1",
    "muted": "#94a3b8",
}

CSS = """
@font-face { font-family: Inter; src: url(assets/fonts/inter-latin-400-normal.woff2) format('woff2'); font-weight: 400; }
@font-face { font-family: Inter; src: url(assets/fonts/inter-latin-700-normal.woff2) format('woff2'); font-weight: 700; }
@font-face { font-family: Inter; src: url(assets/fonts/inter-latin-800-normal.woff2) format('woff2'); font-weight: 800; }
@font-face { font-family: JetBrains; src: url(assets/fonts/jetbrains-mono-latin-400-normal.woff2) format('woff2'); font-weight: 400; }
@font-face { font-family: JetBrains; src: url(assets/fonts/jetbrains-mono-latin-500-normal.woff2) format('woff2'); font-weight: 500; }
@font-face { font-family: JetBrains; src: url(assets/fonts/jetbrains-mono-latin-700-normal.woff2) format('woff2'); font-weight: 700; }

#root { position: relative; width: 100%; height: 100%; background: #0a0c10; overflow: hidden;
  font-family: Inter, system-ui, sans-serif; color: #e9eef4; }
.grid { position: absolute; inset: 0;
  background-image: repeating-linear-gradient(to right, rgba(255,255,255,.028) 0 1px, transparent 1px 48px),
                    repeating-linear-gradient(to bottom, rgba(255,255,255,.028) 0 1px, transparent 1px 48px); }
.glow { position: absolute; width: 1100px; height: 1100px; left: 620px; top: -420px;
  background: radial-gradient(circle, rgba(232,163,61,.10), transparent 62%); }

.clip { position: absolute; inset: 0; }
.pad { position: absolute; inset: 0; padding: 176px 132px 96px; box-sizing: border-box;
  display: flex; flex-direction: column; justify-content: center; }

.hdr { position: absolute; left: 132px; right: 132px; top: 60px; display: flex; align-items: baseline;
  justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.11); padding-bottom: 14px; }
.hdr-l { display: flex; gap: 18px; align-items: baseline; }
.mark { font-family: JetBrains, monospace; font-size: 30px; font-weight: 700; letter-spacing: .34em;
  text-transform: uppercase; color: #e8a33d; }
.hdr-sub { font-family: JetBrains, monospace; font-size: 28px; letter-spacing: .22em;
  text-transform: uppercase; color: #94a3b8; }
.hdr-r { font-family: JetBrains, monospace; font-size: 28px; letter-spacing: .18em;
  text-transform: uppercase; color: #b9c6d3; }

.eyebrow { font-family: JetBrains, monospace; font-size: 30px; font-weight: 700; letter-spacing: .3em;
  text-transform: uppercase; color: #e8a33d; }
.h1 { font-size: 86px; font-weight: 800; letter-spacing: -.03em; line-height: 1.02; margin: 0; }
.hook-fig { font-family: JetBrains, monospace; font-size: 210px; font-weight: 700; letter-spacing: -.04em;
  line-height: .92; font-variant-numeric: tabular-nums; }
.hook-unit { font-family: JetBrains, monospace; font-size: 40px; letter-spacing: .2em; text-transform: uppercase;
  color: #94a3b8; margin-left: 22px; }
.claim { font-size: 46px; font-weight: 700; line-height: 1.24; color: #e9eef4; max-width: 1280px; }
.rule { height: 4px; width: 132px; background: #e8a33d; }

.panel { border: 1px solid rgba(255,255,255,.11); background: rgba(20,25,32,.92); }
.split { display: grid; grid-template-columns: 560px 1fr; gap: 44px; }
.rail { padding: 26px 28px; }
.rail-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0;
  border-bottom: 1px dashed rgba(255,255,255,.07); }
.rail-lab { font-size: 28px; color: #b9c6d3; font-weight: 400; }
.rail-val { font-family: JetBrains, monospace; font-size: 28px; font-weight: 700; padding: 5px 11px;
  border: 1px solid rgba(255,255,255,.16); background: #0e1116; font-variant-numeric: tabular-nums; }
.rail-h { font-family: JetBrains, monospace; font-size: 28px; letter-spacing: .24em; text-transform: uppercase;
  color: #94a3b8; margin-bottom: 6px; }

.kpis { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid rgba(255,255,255,.11);
  background: rgba(20,25,32,.92); }
.kpi { padding: 18px 22px; border-left: 1px solid rgba(255,255,255,.07); }
.kpi:first-child { border-left: 0; }
.kpi-l { font-family: JetBrains, monospace; font-size: 28px; font-weight: 700; letter-spacing: .18em;
  text-transform: uppercase; color: #94a3b8; }
.kpi-v { font-family: JetBrains, monospace; font-size: 50px; font-weight: 700; letter-spacing: -.03em;
  margin-top: 10px; font-variant-numeric: tabular-nums; }
.kpi-n { font-size: 28px; color: #94a3b8; margin-top: 6px; }

.bars { margin-top: 34px; }
.bar-row { padding: 10px 0; border-top: 1px solid rgba(255,255,255,.06); }
.bar-top { display: flex; justify-content: space-between; align-items: baseline; }
.bar-lab { font-size: 30px; color: #b9c6d3; }
.bar-val { font-family: JetBrains, monospace; font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; }
.bar-track { height: 10px; background: rgba(255,255,255,.07); margin-top: 8px; }
.bar-fill { height: 100%; width: 100%; }
.bar-fill.base { background: #8fc4e0; }
.bar-fill.friction { background: #e8a33d; }
.bar-fill.erosion { background: #e07a6e; }
.bar-fill.positive { background: #7fc7b1; }
.bar-fill.muted { background: #64748b; }

.verdict { border: 1px solid rgba(255,255,255,.11); border-left: 6px solid #a33b32; padding: 40px 44px;
  background: rgba(163,59,50,.07); }
.verdict[data-tone="base"] { border-left-color: #0e7490; background: rgba(14,116,144,.07); }
.verdict[data-tone="positive"] { border-left-color: #1c6b4f; background: rgba(28,107,79,.07); }
.verdict-call { font-family: JetBrains, monospace; font-size: 28px; font-weight: 700; letter-spacing: .24em;
  text-transform: uppercase; color: #94a3b8; }
.verdict-head { font-size: 62px; font-weight: 800; line-height: 1.1; letter-spacing: -.02em; margin-top: 16px;
  max-width: 1400px; }
.verdict-body { font-size: 30px; line-height: 1.4; color: #b9c6d3; margin-top: 20px; max-width: 1250px; }

.outro-url { font-family: JetBrains, monospace; font-size: 30px; letter-spacing: .04em; color: #e8a33d; }
.outro-note { font-size: 28px; letter-spacing: 0; text-transform: none; line-height: 1.4;
  color: #b9c6d3; max-width: 1180px; }
.tag { align-self: flex-start; display: inline-block; font-family: JetBrains, monospace; font-size: 28px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: #e8a33d; border: 1px solid rgba(232,163,61,.6);
  padding: 7px 13px; }
"""


def wav_seconds(path: pathlib.Path) -> float:
    with wave.open(str(path)) as handle:
        return handle.getnframes() / float(handle.getframerate())


def synth(text: str, voice: str, out: pathlib.Path) -> float:
    cmd = [
        "npx", "hyperframes", "tts", text,
        "-o", str(out), "-v", voice, "-s", "1.08",
    ]
    env = {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:" + str(pathlib.Path.home() / ".local/bin"),
        "HOME": str(pathlib.Path.home()),
        "HYPERFRAMES_PYTHON": str(KOKORO_PY),
    }
    result = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=str(out.parent))
    if result.returncode != 0:
        raise RuntimeError(f"tts failed for {voice}: {result.stderr[-500:]}")
    return wav_seconds(out)


def build(film: dict) -> dict:
    slug = film["slug"]
    out = RUN / slug
    comp = out / "composition"
    for sub in ["assets/fonts", "assets/music", "assets/sfx/interface", "assets/sfx/impact", "assets/voice"]:
        (comp / sub).mkdir(parents=True, exist_ok=True)
    (out / "brag.jpg").unlink(missing_ok=True)

    for woff in FONTS_FROM.glob("*.woff2"):
        shutil.copy2(woff, comp / "assets/fonts" / woff.name)

    music_src = SKILL / "assets/music" / film["music"]
    shutil.copy2(music_src, comp / "assets/music" / film["music"])

    sfx = ["interface/drop_001.ogg", "interface/drop_002.ogg", "impact/impactSoft_medium_001.ogg",
           "impact/impactBell_heavy_000.ogg", "interface/click_001.ogg"]
    for rel in sfx:
        shutil.copy2(SKILL / "assets/sfx" / rel, comp / "assets/sfx" / rel)

    # 1. narration, measured rather than assumed
    durations = []
    for index, text in enumerate(film["beats"], start=1):
        wav = comp / "assets/voice" / f"vo-{index}.wav"
        durations.append(synth(text, film["voice"], wav))

    # 2. lay the film out from the real audio: a beat starts every (audio + breath)
    start, starts = 0.40, []
    for seconds in durations:
        starts.append(start)
        start += seconds + 0.40

    nar_end = starts[-1] + durations[-1]
    total = round(nar_end + TAIL_SECONDS, 2)

    # scene windows: hook, instrument (two beats), verdict, outro held through the music tail
    s1 = (0.0, starts[1] - 0.25)
    s2 = (starts[1] - 0.25, starts[3] - 0.25 - (starts[1] - 0.25))
    s3 = (starts[3] - 0.25, starts[4] - 0.25 - (starts[3] - 0.25))
    s4 = (starts[4] - 0.25, total - (starts[4] - 0.25))

    root_id = f"clip-{slug}"
    kpi_html = "".join(
        f'<div class="kpi"><div class="kpi-l">{label}</div>'
        f'<div class="kpi-v kpi-v-{idx}" style="color:{TONE[tone]}">{value}</div>'
        f'<div class="kpi-n">{note}</div></div>'
        for idx, (label, value, note, tone) in enumerate(film["kpis"])
    )
    bars_html = "".join(
        f'<div class="bar-row"><div class="bar-top"><span class="bar-lab">{label}</span>'
        f'<span class="bar-val">{value}</span></div>'
        f'<div class="bar-track"><div class="bar-fill {tone} bar-{idx}" data-w="{width}"></div></div></div>'
        for idx, (label, value, width, tone) in enumerate(film["bars"])
    )
    verdict_call, verdict_body = film["verdict"]

    audio = [
        f'<audio id="music" data-start="0" data-duration="{total}" data-track-index="10" '
        f'data-volume="{film["music_volume"]}" src="assets/music/{film["music"]}"></audio>'
    ]
    for index, seconds in enumerate(durations, start=1):
        audio.append(
            f'<audio id="vo-{index}" data-start="{starts[index - 1]:.2f}" data-duration="{math.floor(seconds * 100) / 100:.2f}" '
            f'data-track-index="{29 + index}" data-volume="1" src="assets/voice/vo-{index}.wav"></audio>'
        )
    cues = [
        (0.15, "0.20", "0.66", "interface/drop_002.ogg"),
        (s1[1] - 0.10, "0.12", "0.50", "interface/drop_001.ogg"),
        (starts[1] - 0.10, "0.12", "0.52", "interface/click_001.ogg"),
        (s3[0] - 0.05, "0.18", "0.58", "impact/impactSoft_medium_001.ogg"),
        (starts[4] - 0.10, "0.70", "0.55", "impact/impactBell_heavy_000.ogg"),
    ]
    for index, (at, length, volume, src) in enumerate(cues, start=1):
        audio.append(
            f'<audio id="sfx-{index}" data-start="{max(at, 0):.2f}" data-duration="{length}" '
            f'data-track-index="{10 + index}" data-volume="{volume}" src="assets/sfx/{src}"></audio>'
        )

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>{CSS}</style>
</head>
<body>
<div id="root" data-composition-id="{root_id}" data-width="1920" data-height="1080" data-fps="30" data-duration="{total}">
  <div class="grid"></div>
  <div class="glow"></div>

  <header id="hdr" class="hdr clip" data-start="0" data-duration="{total}">
    <div class="hdr-l"><span class="mark">AIChieve</span><span class="hdr-sub">Tool register</span></div>
    <span class="hdr-r">{film["title"]}</span>
  </header>

  <section id="s1" class="clip" data-start="{s1[0]:.2f}" data-duration="{s1[1]:.2f}">
    <div class="pad">
      <div class="eyebrow" id="s1-eyebrow">{film["eyebrow"]}</div>
      <div id="s1-fig" style="margin-top:52px; display:flex; align-items:flex-end;">
        <span class="hook-fig">{film["hook"]["figure"]}</span>
        <span class="hook-unit">{film["hook"]["unit"]}</span>
      </div>
      <div class="rule" id="s1-rule" style="margin-top:44px"></div>
      <div class="claim" id="s1-claim" style="margin-top:34px">{film["hook"]["claim"]}</div>
    </div>
  </section>

  <section id="s2" class="clip" data-start="{s2[0]:.2f}" data-duration="{s2[1]:.2f}">
    <div class="pad">
      <div class="split">
        <div class="panel rail" id="s2-rail">
          <div class="rail-h">Inputs</div>
          <div class="rail-row"><span class="rail-lab">Selling price</span><span class="rail-val">$45.00</span></div>
          <div class="rail-row"><span class="rail-lab">Failure rate</span><span class="rail-val">0.057</span></div>
          <div class="rail-row"><span class="rail-lab">Audit sample</span><span class="rail-val">0.25</span></div>
          <div class="rail-row"><span class="rail-lab">Divisor billed</span><span class="rail-val">139</span></div>
          <div class="rail-row" style="border-bottom:0"><span class="rail-lab">Record accuracy</span><span class="rail-val">65% wrong</span></div>
          <div class="rail-h" style="margin-top:22px">Nothing leaves the page</div>
        </div>
        <div>
          <div class="kpis" id="s2-kpis">{kpi_html}</div>
          <div class="bars" id="s2-bars">{bars_html}</div>
        </div>
      </div>
    </div>
  </section>

  <section id="s3" class="clip" data-start="{s3[0]:.2f}" data-duration="{s3[1]:.2f}">
    <div class="pad">
      <div class="verdict" id="s3-verdict" data-tone="erosion">
        <div class="verdict-call">{verdict_call}</div>
        <div class="verdict-head">{film["verdict_head"]}</div>
        <div class="verdict-body">{verdict_body}</div>
      </div>
    </div>
  </section>

  <section id="s4" class="clip" data-start="{s4[0]:.2f}" data-duration="{s4[1]:.2f}">
    <div class="pad" style="display:flex; flex-direction:column; justify-content:center;">
      <div class="tag" id="s4-tag">Free · runs in your browser</div>
      <h1 class="h1" id="s4-h1" style="margin-top:34px; font-size:104px">Every number<br>yours.</h1>
      <div class="outro-url" id="s4-url" style="margin-top:38px">aichieve.net/tools/{slug}</div>
      <div class="outro-note" id="s4-note" style="margin-top:20px">{film["bridge"]}</div>
    </div>
  </section>

  {chr(10).join("  " + tag for tag in audio)}
</div>

<script>
  const tl = gsap.timeline({{ paused: true }});

  // The console breathes for the whole film: subtle, finite, and it means no stretch is dead.
  tl.fromTo("#root .glow", {{ opacity: 0.55 }}, {{ opacity: 1, duration: 2.1, repeat: 14, yoyo: true, ease: "sine.inOut" }}, 0);

  // Scene 1 — the number lands first, the claim follows it.
  tl.fromTo("#s1-eyebrow", {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.45 }}, 0.20);
  tl.fromTo("#s1-fig", {{ opacity: 0, y: 34 }}, {{ opacity: 1, y: 0, duration: 0.60 }}, 0.34);
  tl.fromTo("#s1-rule", {{ scaleX: 0, transformOrigin: "left center" }}, {{ scaleX: 1, duration: 0.45 }}, 0.86);
  tl.fromTo("#s1-claim", {{ opacity: 0, y: 18 }}, {{ opacity: 1, y: 0, duration: 0.50 }}, 1.02);

  // Scene 2 — the instrument: rail, then the strip, then the bars fill.
  const s2 = {s2[0]:.2f};
  tl.fromTo("#s2-rail", {{ opacity: 0, x: -26 }}, {{ opacity: 1, x: 0, duration: 0.55 }}, s2 + 0.10);
  tl.fromTo("#s2-kpis", {{ opacity: 0, y: 20 }}, {{ opacity: 1, y: 0, duration: 0.50 }}, s2 + 0.32);
  tl.fromTo("#s2-kpis .kpi", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.35, stagger: 0.10 }}, s2 + 0.40);
  tl.fromTo("#s2-bars .bar-row", {{ opacity: 0, y: 12 }}, {{ opacity: 1, y: 0, duration: 0.34, stagger: 0.12 }}, s2 + 0.85);
  document.querySelectorAll("#s2-bars .bar-fill").forEach((el, i) => {{
    tl.fromTo(el, {{ scaleX: 0, transformOrigin: "left center" }},
      {{ scaleX: el.dataset.w / 100, duration: 0.55, ease: "power2.out" }}, s2 + 0.95 + i * 0.12);
  }});

  // Scene 3 — the verdict.
  const s3 = {s3[0]:.2f};
  tl.fromTo("#s3-verdict", {{ opacity: 0, y: 22 }}, {{ opacity: 1, y: 0, duration: 0.55 }}, s3 + 0.10);
  tl.fromTo("#s3-verdict .verdict-head", {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.45 }}, s3 + 0.30);
  tl.fromTo("#s3-verdict .verdict-body", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.45 }}, s3 + 0.55);

  // Scene 4 — the sign-off, then three seconds of music on the held frame.
  const s4 = {s4[0]:.2f};
  tl.fromTo("#s4-tag", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.30 }}, s4 + 0.15);
  tl.fromTo("#s4-h1", {{ opacity: 0, y: 26 }}, {{ opacity: 1, y: 0, duration: 0.55 }}, s4 + 0.28);
  tl.fromTo("#s4-url", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.40 }}, s4 + 0.70);
  tl.fromTo("#s4-note", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.40 }}, s4 + 0.90);

  window.__timelines["{root_id}"] = tl;
</script>
</body>
</html>
"""
    (comp / "index.html").write_text(html)

    # 3. the paperwork the skill asks for
    (out / "brag-plan.md").write_text(
        f"""# {film['title']} — brag plan

**Tone:** polished · **Format:** landscape 1920×1080 · **Length:** {total}s
({nar_end:.1f}s of narration + {TAIL_SECONDS:.0f}s of music after the last word)

**Voice:** Kokoro `{film['voice']}` · **Music:** {film['music']} at {film['music_volume']} · **SFX:** 5 cues

## Storyboard

| Scene | In | Out | On screen | Narration |
| --- | --- | --- | --- | --- |
| Hook | 0.0 | {s1[1]:.2f} | {film['hook']['figure']} {film['hook']['unit']} — {film['hook']['claim']} | {film['beats'][0]} |
| Instrument | {s2[0]:.2f} | {s2[0] + s2[1]:.2f} | The engine: rail of inputs, three-KPI strip, cost bars | {film['beats'][1]} / {film['beats'][2]} |
| Verdict | {s3[0]:.2f} | {s3[0] + s3[1]:.2f} | The engine's own verdict panel | {film['beats'][3]} |
| Sign-off | {s4[0]:.2f} | {total} | Every number yours · aichieve.net/tools/{slug} | {film['beats'][4]} |

The last scene holds for {TAIL_SECONDS:.0f} seconds after the final word with the music still playing, so the
film does not end on top of the narration.

**Every figure on screen is the engine's default output** (fixtures in `scripts/check-engines.mjs`).
"""
    )
    (out / "share-copy.txt").write_text(
        f"{film['title']} — {film['hook']['figure']} {film['hook']['unit']}. {film['hook']['claim']}\n"
        f"aichieve.net/tools/{slug}\n"
    )
    return {"slug": slug, "total": total, "nar_end": round(nar_end, 2), "voice": film["voice"],
            "music": film["music"], "beats": [round(d, 2) for d in durations], "index": str(comp / "index.html")}


if __name__ == "__main__":
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    results = []
    for film in FILMS:
        if only and film["slug"] != only:
            continue
        print(f"building {film['slug']} …", flush=True)
        results.append(build(film))
    print(json.dumps(results, indent=2))
