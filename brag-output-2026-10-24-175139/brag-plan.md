# Brag Plan: AIChieve — Master Asset & Software TCO Calculator

## What is this app?

AIChieve is a deterministic decision console for expensive technology choices: you put in
a loaded engineer rate, a maintenance load and a compliance scope, and it returns a
36-month total cost of ownership for building a system versus buying one — no LLM, no
account, nothing leaving the page.

## The angle

**The two numbers you take into a budget review.**

Every build-vs-buy argument dies the same way: someone quotes the build invoice and nobody
prices the maintenance that follows it. This tool's whole reason to exist is that the second
number is not on that invoice. The video is one argument, told with the instrument's own
figures: `$61,200` of build labour, and `$619,800` of everything the invoice leaves out.

The last beat is the honest one, and it is the reason this is a real tool rather than a
demo: the two cost lines **never cross** in 36 months. A lesser calculator would print a
break-even month anyway.

## Hook (first 2-3 seconds)

`$681,000` lands on the left. One beat later `$12,380` lands on the right, tiny by
comparison. Labels underneath: **In-house build** / **Managed platform**. Mono caption:
`36 months, fully loaded`.

No logo, no title. Two numbers that are 55× apart do the hooking.

## Key moments (the middle)

- **The mode strip selects itself.** Four tabs — Build vs buy, Cost per use, Repair or
  replace, Tinkering tax — arrive one at a time, and an accent rail snaps under *Build vs
  buy*. Then the point of the tool: a **Maintenance load** slider drags from 10% to 50% FTE
  and the total climbs with it.
- **The four rows of an off-invoice cost.** Build labour `$61,200` is the only row not
  marked OFF INVOICE. Maintenance `$244,800`, Compliance `$225,000`, Roadmap opportunity
  `$150,000` arrive one by one, each tagged in the instrument's own rust outline.
- **`91%`.** The share of the build total that never shows on the quote. Then `$619,800`
  as the off-ledger drag.
- **Two lines that never meet.** The cumulative-spend chart draws: platform near-flat on
  the bottom, build climbing to `$681k`. No crossover marker, because there isn't one.

## Outro / punchline

`The lines never cross.` Then the mark, the calculator's name, and the line the bay
carries: `Deterministic · nothing leaves the page`. Final: **A defensible number.**

## User flow worth showing

1. **Entry** — pick a mode from the strip (*Build vs buy* selects).
2. **Key action** — drag *Maintenance load* and watch the 36-month total move.
3. **Result** — the verdict, the ledger with the off-invoice rows, and the chart.

All three are in the video: scene 3 is entry + action, scenes 4-5 are the result.

## Tone

- **Preset:** `polished`
- **Creative direction:** quiet premium instrument film — the ledger as the hero shot,
  figures treated like a printed statement rather than dashboard widgets
- **Interpretation:** Fewer scenes, longer holds, confidence through restraint. Type is
  large and still; nothing bounces. Motion is confined to things arriving and lines
  drawing. The drama is entirely in the numbers, so the edit must not compete with them.

## Format: landscape — 1920x1080

## Duration: 22.9 seconds

## Visual identity (from the project)

- Background: `#08090b` (--ai-void) with the console's 32px technical grid at 2.8% alpha
- Panel: `#141920` (--ai-panel), hairline `rgba(255,255,255,0.11)`
- Text: `#e9eef4` primary · `#b9c6d3` body · `#94a3b8` labels
- Accent: `#e8a33d` (--ai-signal, safety amber)
- Chart identity: build `#e8a33d` · platform `#8fc4e0` (--ai-link) — both real tokens,
  both clear AA on the void (9.7:1 and 9.4:1)
- Display font: Inter (700/800) · Body/labels: JetBrains Mono (500/700) — the site's own pair
- Strongest visual element: the ledger — a stated figure per row, with a proportional bar
  behind it and an `off invoice` tag on the rows the first quote omits

## Share copy (draft)

Every build-vs-buy fight is two numbers apart. This one prices the maintenance the invoice
leaves out — and tells you when the lines never cross.

## Audio direction

- **Role:** sparse professional bed; the figures are the event, the sound supports them
- **Music:** `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` — steady and clean,
  109.96 BPM, the recommended track for `polished`
- **Music treatment:** start at 0.0, volume 0.32, 0.6s fade-in, fade out over the last
  1.4s. Let the final bell ring over the tail.
- **Music cue guidance:** preset available
  (`assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`,
  109.96 BPM). Strong cues to target: **10.93s** (ledger entry), **18.56s** (chart
  caption), **22.93s** (final mark). Beat grid for sequential reveals: 6.56, 7.64, 8.74,
  9.83 (four tabs, every other beat); 11.46, 12.55, 13.64 (three off-invoice rows).
  Restraint note: this is a `polished` edit — 3 cue locks total, not a hit on every beat.
- **Audio-reactive treatment:** subtle. Booth: let the panel's hairline glow and the
  ledger row fills breathe slightly with music RMS. No waveform, no particles, no pulse on
  the type — the figures must stay perfectly still.
- **SFX posture:** sparse, motion-matched, quiet (0.55-0.75)
- **Audio-coupled moments:** the two hook numbers landing; the tab select; the slider
  drag; each off-invoice row arriving; the `91%` payoff; the chart caption; the final mark
- **Restraint rule:** no riser, no whoosh, no typing clatter. Nothing may sound like a
  consumer app ad — this is a statement.

## Storyboard

### Scene 1 — Two numbers — 3.27s
Void ground with the faint technical grid. `$681,000` sets in Inter 800 at huge scale,
left of centre, in `#e9eef4`. At 1.09s `$12,380` sets in at roughly a fifth of that size,
right of centre, in `#8fc4e0`. Mono labels settle beneath each: `IN-HOUSE BUILD` and
`MANAGED PLATFORM`. At 2.19s a mono caption appears between them: `36 MONTHS, FULLY LOADED`.
Both figures and both labels hold settled for the last second.
Sequential/interaction: yes — the second number and its label land on a beat, deliberately
undersized against the first.
Audio intent: two dry, weighted landings. The silence between them is the joke.
Audio-coupled idea: number landings (drop-family), one each.
Music: steady, quiet, present from 0.0.
Transition mood: hard cut → Scene 2

### Scene 2 — The console — 3.29s
Cut to the console. The `AI` glyph in its amber box draws on, then `AICHIEVE` in
letter-spaced mono, then `ENTERPRISE COMMAND CENTER` beneath it. At 4.91s the instrument
bay's own header rule draws across with `INSTRUMENT PANEL` on the left and
`DETERMINISTIC · NOTHING LEAVES THE PAGE` on the right. At 5.80s the calculator's full name
sets in Inter: **Master Asset & Software TCO Calculator**.
Sequential/interaction: yes — glyph, wordmark, subtitle, rule, title.
Audio intent: one clean arrival, then nothing. Let the chrome settle.
Audio-coupled idea: a single soft drop on the title; no sound on the glyph.
Music: unchanged.
Transition mood: clean wipe → Scene 3

### Scene 3 — Pick a mode, move a number — 4.37s
The tab strip built as it exists on the page: four cells, hairline dividers. `BUILD VS BUY`
arrives at 6.56s, `COST PER USE` at 7.64s, `REPAIR OR REPLACE` at 8.74s, `TINKERING TAX` at
9.83s — each with its one-line question beneath in small mono. All four then hold together.
At 9.29s an accent rail snaps in under `BUILD VS BUY` and its cell fills with the tinted
wash.
Beneath the strip a control appears: `Maintenance load` with the plate reading `10% FTE`.
A cursor drags the square thumb right; the plate follows to `50% FTE`; a mono figure beside
the row counts up from `$0` to **$681,000** as it moves.
Sequential/interaction: yes — four tabs on every other beat, then a simulated slider drag
with a counting figure.
Audio intent: the four labels are informational, the drag is the product working. The
count-up should feel mechanical, not celebratory.
Audio-coupled idea: one quiet click on the tab select; a very soft rollover under the
drag; the count-up carries itself with no per-tick sound.
Music: unchanged; the drag crosses no strong cue on purpose.
Transition mood: hard cut → Scene 4

### Scene 4 — What the invoice leaves out — 6.54s
// beat-locked: 10.93s (strong cue 0.97) — ledger panel enters
The ledger panel, two columns. Left column `OPTION A / In-house build`, right column
`OPTION B / Managed platform`, each with its eyebrow rule in its identity colour.
Only the first row is present: `Build labour $61,200` with its note `3 mo × 1.5 eng` — no
tag. Then three rows arrive, each tagged `OFF INVOICE` in the rust outline, each with a
proportional bar filling behind it:
- 11.46s — `Maintenance $244,800` · note `50% of one engineer`
- 12.55s — `Compliance certification $225,000` · note `$75,000/yr`
- 13.64s — `Roadmap opportunity $150,000` · note `Capacity spent maintaining`
Each row holds ≥1.0s settled after it lands.
At 15.29s the panel's under-rail resolves to a single figure: **91%** in amber, with
`HIDDEN SHARE OF BUILD` beneath it. At 16.38s the figure swaps to **$619,800** with
`OFF-LEDGER DRAG`.
Sequential/interaction: yes — three rows, every other beat, real figures, each with its
bar filling.
Audio intent: each row is a small physical placement; the 91% is the only accent in the
scene.
Audio-coupled idea: drop-family per row; one soft impact on the 91%.
Music: bed continues; the panel entry is the strong-cue lock.
Transition mood: hard cut → Scene 5

### Scene 5 — Two lines that never meet — 2.72s
// beat-locked: 18.56s (strong cue 0.99) — caption lands
The cumulative-spend chart, drawn as on the page: hairline axes, `$0` / `$750k` marks,
months to 36. Two lines draw left to right over 1.1s — the platform line nearly flat along
the bottom in `#8fc4e0`, ending `$12k`; the build line rising to `$681k` in `#e8a33d`. End
labels sit beside each. No crossover marker: there is nothing to mark.
At 18.56s the caption lands under the plot: **The lines never cross.**
Sequential/interaction: yes — two lines drawing in sequence, then the caption.
Audio intent: the drawing should be felt, not heard; the caption gets the scene's only cue.
Audio-coupled idea: a light plate accent on the caption.
Music: the scene sits on the strong cue.
Transition mood: soft crossfade → Scene 6

### Scene 6 — A defensible number — 2.74s
// beat-locked: 22.93s (strong cue 1.00) — final mark
The chart dims back to the void. The `AI` glyph and `AICHIEVE` mark centre, smaller than
scene 2, with `MASTER ASSET & SOFTWARE TCO CALCULATOR` beneath in mono caps. Then the line
**A defensible number.** in Inter, above the mark, settling last. Hairline rule under the
whole lockup carrying `RUNS IN YOUR BROWSER · NOTHING LEAVES THE PAGE` in small mono.
Everything holds to the final frame.
Sequential/interaction: yes — line, then mark, then the mono rule.
Audio intent: one bell, allowed to ring out over the music fade.
Audio-coupled idea: `impactBell_heavy_000` at low volume on the mark.
Music: fade out over the last 1.4s.
Transition mood: end.

**Music mood for this video:** steady and clean — business-documentary, not startup hype.
**Audio summary:** a quiet 110 BPM bed that barely moves, a handful of physical
placements for the figures, one accent on the 91%, and a bell to close.

## Reading-time check

| Scene | Readable text | Settled time | Floor |
|---|---|---|---|
| 1 | `$681,000` · `IN-HOUSE BUILD` · `$12,380` · `MANAGED PLATFORM` · `36 MONTHS, FULLY LOADED` | 1.08s for the caption, 3.27s for the numbers | ok |
| 2 | glyph + `AICHIEVE` + `ENTERPRISE COMMAND CENTER` (1.3s) · bay header (1.8s) · calculator name (1.1s, 6 words) | 1.1s on the longest | ok |
| 3 | four 2-3 word tabs, 1.08s each, set holds 1.1s · slider label | ok | ok |
| 4 | three rows, ≥1.0s each · `91%` 1.09s · `$619,800` 1.09s | figures, not sentences | ok |
| 5 | `The lines never cross.` (4 words → 1.2s floor) | 1.63s | ok |
| 6 | `A defensible number.` + mark + mono rule (2.74s) | ok | ok |

No scene carries more text than its duration allows. Every sequential text reveal is
snapped to every other beat, not every beat, at 109.96 BPM.

## Grounding ledger

Every claim on screen traces to the project:

| On screen | Source |
|---|---|
| `$681,000` / `$12,380` / `$668,620` | `decisionIntelligence.ts` engine output on the shipped defaults |
| `$619,800` off-ledger drag, `91%` hidden share | `figures[]` in the same engine |
| `$61,200` / `$244,800` / `$225,000` / `$150,000` ledger rows | `buildRows` in the same engine |
| `50% of one engineer`, `$75,000/yr`, `3 mo × 1.5 eng` | row notes the engine renders |
| `OFF INVOICE` | the ledger's own row tag |
| Four mode names + their questions | `MODES` in the calculator island |
| `DETERMINISTIC · NOTHING LEAVES THE PAGE`, `RUNS IN YOUR BROWSER`, `INSTRUMENT PANEL` | `CalculatorShell.astro` |
| `A defensible number` | the page's operator note: *a defensible number with an unexamined premise fails in review* |
| `The lines never cross` | engine's own statement when `crossoverMonth` is null |
| Palette, fonts, grid | `aichieve.css` tokens |

## Voiceover script (opt-in, this run)

Narration is on for this cut. Kokoro, voice `af_sky` (en-US female), one clip per storyboard
beat so each line could be measured and placed on a real timestamp rather than a guess.
Speech totals **16.15s** inside a 22.93s film — the gaps are deliberate, and the ledger line
ends as the 91% lands.

| # | Line | Clip | Start | Ends |
|---|---|---|---|---|
| 1 | That first number is the quote you already have. | 2.60s | 0.30 | 2.90 |
| 2 | This prices the other one. | 1.66s | 3.70 | 5.36 |
| 3 | Your rate card, your maintenance load, your compliance scope. | 3.29s | 6.86 | 10.15 |
| 4 | Maintenance, certification, roadmap work. None of it is on the invoice. | 4.37s | 11.06 | 15.43 |
| 5 | No crossover. Not inside three years. | 2.54s | 17.58 | 20.12 |
| 6 | A number you can defend. | 1.69s | 20.53 | 22.22 |

The script states the argument; it never reads the on-screen figures back to the viewer.
Line 4 names the three off-invoice rows a beat after each has appeared, and line 5 lands after
the caption rather than over it.

Music ducks to **0.18** for the bed, because narration covers roughly 70% of the film — there is
no clean window long enough for a full-level bed to be worth automating back up. The closing
bell carries the outro instead.

## Music and voice selection (this run)

Both were drawn at random from the available set, with a recorded seed so the choice is
reproducible rather than lost:

- seed `20261024`
- music → `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM)
- voice → `af_sky` (en-US female)

The storyboard was planned against vol-12's cue grid; vol-9 runs at a different tempo and its
strong cues skip the 15–20s stretch entirely. Re-snapping was therefore done against **its beat
grid**, not vol-12's cues: tabs 6.34 / 7.40 / 8.44 / 9.50, ledger rows 11.06 / 11.60 / 12.65 /
13.70, caption 18.44, closing lock on the one strong cue that exists near it, 20.53.
