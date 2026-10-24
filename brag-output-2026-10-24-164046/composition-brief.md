# Hyperframes Composition Brief: GPU TCO Analyzer

## Objective

A 22-second launch video for the GPU TCO Analyzer at aichieve.net/tools/gpu-compute. The
receipt is the product: a sticker price ticks up into the true three-year cost, the invoice
prints line by line, and the break-even chart shows the crossing that never happens.

## Output

- Composition directory: `brag-output-2026-10-24-164046/composition/`
- Rendered video: `brag-output-2026-10-24-164046/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 22.2s

## Source Material

- Project root: `/Users/jorgefernandezilufi/Documents/Websites/giniloh front end/AICHIEVE`
- Primary files read:
  - `src/pages/tools/gpu-compute.astro` (page copy, FAQ, operator notes)
  - `src/components/calculators/react/LocalVsCloudGpuCalculator.tsx` (verdict panel, receipt
    card, break-even chart, cost composition)
  - `src/styles/aichieve.css` (tokens: graphite console, safety amber, hairline rules)
  - `src/components/SiteNav.astro` (brand mark "AI", wordmark "AIChieve", sub "Enterprise
    Command Center")
- Product name: GPU TCO Analyzer (AIChieve)
- Strongest claim: NVIDIA AI Enterprise at $4,500/GPU/yr makes the licence 79% of hardware
  capex, so a hardware-only comparison understates owned cost by roughly half.
- Key UI to recreate: the "GPU TCO RECEIPT" paper card ($16,000 GPU → $32,797 net local TCO)
  and the Hyperstack column ($7,358), plus the cumulative cost chart.
- Copy that must appear verbatim:
  - `$16,000`, `STREET PRICE`, `$32,797`
  - `GPU TCO RECEIPT`, `Cost analysis breakdown`, `Comparing local vs Hyperstack`
  - `GPU cost $16,000`, `System components $1,000`, `Electricity (36 mo) $397`,
    `Maintenance (5%/yr) $2,550`, `NVAIE (1 seat × $4,500/yr) $13,500`,
    `Cost of Capital (5%/yr) +$2,550`, `Less 3-Yr Resale (20%) −$3,200`
  - `Net local TCO $32,797`, `Cost per hour $8.435/hr`
  - `Hyperstack (1× NVIDIA RTX PRO 6000)`, `Usage (1× @ $1.80/hr) $6,998`,
    `Storage (36 mo) $360`, `Total cloud cost $7,358`, `$1.893/hr`
  - `Renting saves $25,438`
  - `No break-even inside 84 months`
  - `The hardware never repays itself.` (from "the hardware never repays itself")
  - `aichieve.net/tools/gpu-compute/`, `Runs in your browser`,
    `Deterministic · nothing leaves the page`

## Creative Direction

- Tone preset: `default`
- Creative direction: a receipt printer bolted inside an industrial console — deadpan,
  instrument typography, the joke is the numbers.
- Interpretation: mechanical motion (paper feed, wipe, line draw), each panel settles before
  it leaves; copy is dry and factual; one bell hit at the receipt total.
- Angle: everyone argues about the sticker price; this tool prints the invoice, and the third
  biggest line is software nobody quoted.
- Hook: `$16,000` counts up to `$32,797` in place, label swapping from STREET PRICE to TRUE
  COST · 36 MONTHS.
- Outro: "The hardware never repays itself." → "Bring your own numbers." + URL.
- Avoid: generic SaaS language, abstract motion graphics, restyling the brand, invented data.

## Visual Identity

- Background: `#08090b`; panels `#0e1116` / `#141920`; grid `rgba(255,255,255,0.028)` 64px
- Text: `#e9eef4` / `#b9c6d3` / `#94a3b8` / `#8496a9`
- Accent: `#e8a33d` amber; soft `rgba(232,163,61,0.14)`
- Paper: `#f8fafc`, rule `#e2e8f0`, ink `#111114`, muted `#5a6270`
- Data: owned `#34d399`, rented `#22d3ee`, licence `#6d28d9`, capital `#b45309`,
  resale `#047857`
- Display font: Inter 700/800/900 (local woff2 in `assets/fonts/`)
- Body/index font: JetBrains Mono 400/500/700 (local woff2)
- Structural device: hairlines only. No shadows, no rounded blobs, no gradient washes except
  one amber radial glow.

## Storyboard

Use `brag-plan.md` as the creative contract.

1. Odometer — 0.00-3.60 — $16,000 → $32,797, label swap
2. The receipt prints — 3.60-10.20 — header, meta, 7 line items on beats, inputs column,
   79% licence callout, net local TCO slams at 8.74
3. The empty sheet — 10.20-13.90 — Hyperstack card same height, 2 rows, total at the same
   baseline, delta strip `−$25,438` at 12.02
4. Never — 13.90-18.40 — cumulative chart, two lines, no crossing, "No break-even inside 84
   months", "The hardware never repays itself."
5. Outro — 18.40-22.20 — "Bring your own numbers.", URL chip, meta line

Clip plan (4 clips; scenes 2 and 3 share one clip so the receipt persists while the second
sheet arrives):

- `s1` 0.00-3.60
- `receipt` 3.60-13.90
- `verdict` 13.90-18.40
- `outro` 18.40-22.20

## Audio

- Audio role: steady mechanical bed under an instrument readout.
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`, track 10,
  volume 0.32, 0.4s fade-in, fade out 21.8-22.2.
- Music cue guidance: preset loaded (109.96 BPM; beats ~0.54s). Locks: total at 8.74,
  verdict accent at 17.47, outro at 18.56. Line items snap to beats 4.39, 4.91, 5.34, 6.00,
  6.56, 7.09, 7.64.
- Audio-reactive treatment: subtle. Bass (bands 0-1, pre-extracted at 15Hz in
  `assets/js/bass.js`) drives the amber glow's opacity (0.55-1.0) and scale (1.0-1.06). No
  waveform, no equalizer, no pulsing text.
- Audio-coupled moments: odometer count (two soft ticks), line-item prints (paper drop on
  rows 1, 4, 5 only), cloud total (chip lay), delta strip (soft impact), verdict line (light
  bell), outro (drop), URL chip (click).
- SFX: `assets/sfx/**` copied from the brag library. Volume 0.55-0.8.
- Restraint rule: never score every row; no sound on text still being read.

## Hyperframes Instructions

Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`,
`hyperframes-keyframes`, `hyperframes-cli`. This is the /brag workflow — do not enter the
hyperframes entry-point intent interview.

Requirements:
- Single paused GSAP timeline registered on `window.__timelines["gpu-tco-brag"]`.
- Root `data-composition-id="gpu-tco-brag"`, 1920x1080, `data-duration="22.2"`.
- Show the actual product surfaces: the receipt card, the verdict bars, the cumulative chart.
- Keep every line readable: fast-in then hold; no flashed copy.
- `npx hyperframes check` must pass with zero errors before render.
