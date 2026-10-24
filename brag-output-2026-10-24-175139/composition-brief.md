# Hyperframes Composition Brief: AIChieve — Master Asset & Software TCO Calculator

## Objective

Create a short launch-style brag video for AIChieve's Master Asset & Software TCO Calculator.
The video is one argument, told with the instrument's real figures: a build invoice is small,
the costs it omits are not, and the two cumulative-cost lines never cross.

## Output

- Composition directory: `brag-output-2026-10-24-175139/composition/`
- Rendered video: `brag-output-2026-10-24-175139/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 22.9s

## Source Material

- Project root: `/Users/jorgefernandezilufi/Documents/Websites/giniloh front end/AICHIEVE`
- Primary files read:
  - `src/lib/calculators/decisionIntelligence.ts` — the engine; every figure on screen
  - `src/components/calculators/react/DecisionIntelligenceCalculator.tsx` — the live UI
  - `src/components/calculators/CalculatorShell.astro` — bay chrome and header copy
  - `src/pages/tools/master-asset-tco.astro` — page copy
  - `src/styles/aichieve.css` — palette, fonts, grid, instrument tokens
- Product name: AIChieve — Master Asset & Software TCO Calculator
- Strongest claim: the off-invoice share of a build total is 91%
- Key UI to recreate: the ledger (two option columns, proportional row bars, `off invoice`
  tags) and the cumulative-spend chart (two lines, no crossover)
- Copy that must appear verbatim:
  - `$681,000` · `$12,380` · `$668,620` · `$619,800` · `$61,200` · `$244,800` · `$225,000` · `$150,000`
  - `91%` · `OFF INVOICE` · `IN-HOUSE BUILD` · `MANAGED PLATFORM`
  - `36 MONTHS, FULLY LOADED` · `MAINTENANCE LOAD` · `50% FTE`
  - `BUILD VS BUY` · `COST PER USE` · `REPAIR OR REPLACE` · `TINKERING TAX`
  - `INSTRUMENT PANEL` · `DETERMINISTIC · NOTHING LEAVES THE PAGE` · `RUNS IN YOUR BROWSER`
  - `A defensible number.` · `The lines never cross.`
  - `MASTER ASSET & SOFTWARE TCO CALCULATOR`

## Creative Direction

- Tone preset: `polished`
- Creative direction: quiet premium instrument film — the ledger as the hero shot, figures
  treated like a printed statement, not dashboard widgets
- Interpretation: long holds, still type, no bounce. Motion is limited to things arriving
  and lines drawing. The numbers carry the drama; the edit must not compete.
- Angle: see `brag-plan.md` §The angle
- Hook: `$681,000` and `$12,380` land a beat apart, no logo first
- Outro: `The lines never cross.` → `A defensible number.` → mark
- Avoid:
  - Generic SaaS language and feature-callout cards
  - Abstract filler, particles, waveforms, gradient washes as content
  - Redesigning the product's look — this is the console's own palette and typography

## Visual Identity

- Background: `#08090b` with a 32px technical grid at `rgba(255,255,255,0.028)`
- Panel: `#141920`; hairline `rgba(255,255,255,0.11)`; no shadows
- Text: `#e9eef4` primary · `#b9c6d3` body · `#94a3b8` labels
- Accent: `#e8a33d` (safety amber, --ai-signal)
- Chart series: build `#e8a33d` · platform `#8fc4e0` (--ai-link). Both clear AA on the void.
- Display font: Inter 700/800
- Body/label font: JetBrains Mono 500/700 — uppercase, wide letter-spacing for labels
- Geometry: square corners (1-2px radii at most), hairline rules, tabular figures
- Visual references: the mode tab strip, the ledger row with its proportional bar fill and
  rust `off invoice` tag, the two-line cumulative-spend chart, the `AI` glyph in an amber box

Fonts: the project carries Inter and JetBrains Mono as `@fontsource` woff2 files under
`node_modules/@fontsource/`. Copy the latin woff2 weights needed into
`composition/assets/fonts/` and `@font-face` them so the render matches the product. Do not
rely on system fonts for the display line.

## Storyboard

Use `brag-plan.md` as the creative contract. Scene summary:

1. **Two numbers** — 3.27s — `$681,000` vs `$12,380`, labels, `36 MONTHS, FULLY LOADED`
2. **The console** — 3.29s — glyph, wordmark, bay header rule, calculator name
3. **Pick a mode, move a number** — 4.37s — four tabs on every other beat, accent rail on
   Build vs buy, then a Maintenance-load slider dragged 10% → 50% with a total counting to
   `$681,000`
4. **What the invoice leaves out** — 6.54s — build labour `$61,200` alone, then three
   `OFF INVOICE` rows at 11.46 / 12.55 / 13.64s, then `91%` at 15.29s and `$619,800` at 16.38s
5. **Two lines that never meet** — 2.72s — chart draws, caption `The lines never cross.` at
   18.56s
6. **A defensible number** — 2.74s — line, mark, mono rule; final lock lands at 22.93s

Total: 22.93s.

## Audio

- Audio role: sparse professional bed; sound supports the figures, never competes
- Audio arc: steady quiet bed from 0.0, a handful of physical placements, one accent at the
  91%, a bell to close, fade out over the final 1.4s
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: volume 0.32, 0.6s fade-in, fade out 21.5s → 22.93s. Never above 0.5.
- Music cue guidance: bundled preset at
  `/Users/jorgefernandezilufi/.hermes/skills/brag/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`
  (109.96 BPM). Target strong cues: **10.93s**, **18.56s**, **22.93s**. Beat grid for
  sequential reveals: tabs 6.56 / 7.64 / 8.74 / 9.83; ledger rows 11.46 / 12.55 / 13.64.
  Three cue locks total — this is a polished edit, not a hit on every beat.
- Audio-reactive treatment: subtle; music RMS may breathe the panel hairline glow and the
  ledger row fills. No waveform, no particles, no pulse on type.
- Audio-coupled moments:
  - scene 1 — two number landings, one each, separated by a beat of near-silence
  - scene 3 — quiet click on the tab select; very soft rollover under the slider drag
  - scene 4 — one drop-family placement per off-invoice row; one soft impact on `91%`
  - scene 5 — light plate accent on the caption
  - scene 6 — `impact/impactBell_heavy_000` at low volume, ringing over the fade
- SFX selection guidance: sparse, motion-matched, 0.55-0.75 volume. No riser, no whoosh,
  no typing clatter. Nothing may sound like a consumer app ad.
- SFX analysis guidance: `/Users/jorgefernandezilufi/.hermes/skills/brag/assets/sfx/sfx-analysis.md`
  — prefer low/medium high-frequency risk for the repeated row placements
- Exact SFX choice: Hyperframes decides filenames, timestamps, density and volume from the
  implemented animation.
- Audio files: copy the chosen music and any selected SFX into
  `brag-output-2026-10-24-175139/composition/assets/`

## Hyperframes Instructions

Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`,
`hyperframes-keyframes`, `hyperframes-cli`. /brag is its own workflow — do not enter the
`hyperframes` entry-point intent interview and do not route into its generic promo flow.

Requirements:

- Show the real instrument: the ledger rows with real figures and the two-line chart. Both
  are recreations of shipped UI, not invented graphics.
- Every figure on screen is grounded (see the grounding ledger in `brag-plan.md`). Invent
  no numbers, claims, or product copy.
- Keep all text readable in the final render.
- Stay within 15-25 seconds.
- Include the music/SFX layer; narration is off for this run — do not add a voice track.
- Treat the cue notes as hints. If a cue hurts readability or pacing, ignore it.
- Run `npx hyperframes check` before render — it is the single gate.
- Keep creation and rendering local.
