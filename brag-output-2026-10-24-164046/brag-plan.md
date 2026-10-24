# Brag Plan: GPU TCO Analyzer (aichieve.net/tools/gpu-compute)

## What is this app?

A deterministic, in-browser model that prices owning one GPU against renting it: street
hardware cost, TDP load, maintenance, persistent storage, cost of capital, resale decay, and
the NVIDIA AI Enterprise licence everyone forgets — then states the month the hardware stops
paying, or says it never does.

## The angle

The receipt is the product. Everyone argues about the sticker price of a Blackwell card;
this tool prints the actual invoice, and the invoice's third-biggest line is software that
nobody quoted. The video is a receipt printer: one number ticks up, the paper feeds out
line by line, and by the time the total prints the purchase decision has already lost.

## Hook (first 2-3 seconds)

`$16,000` sits on screen under "STREET PRICE" — then the same odometer counts up to
`$32,797` and the label swaps to "TRUE COST · 36 MONTHS". No cut, no new screen: the price
changes on you. That is the entire video's thesis in 2.2 seconds.

## Key moments (the middle)

- The receipt prints: seven line items feed out at a beat each, staying on screen as a list —
  GPU cost, system components, electricity, maintenance, **NVAIE at $13,500**, cost of capital,
  less resale.
- The licence row is the twist: `79%` of hardware capex, annotated in amber against a row the
  user never entered.
- A second, mostly empty sheet slides in for Hyperstack — same paper, same height, two lines
  and a total — the joke about how little you are buying is spatial, not narrated.
- The delta strip: `−$25,438` at 36 months, wiped in at the bottom of the frame.
- The cumulative chart: two lines leave origin, owned climbs three times faster, and no
  crossing is drawn anywhere in the window.

## Outro / punchline

"No break-even inside 84 months — the hardware never repays itself." (product copy) lands on a
bell hit, then: "Bring your own numbers." + the URL. The last line on screen is the tool's own
promise: deterministic, nothing leaves the page.

## User flow worth showing

entry → key action → result, as the calculator's own instrument panel:

1. Set utilisation (hours/day 6, days/month 30 → 108 hrs/mo) and a 36-month horizon.
2. Pick the accelerator at street price (1× RTX PRO 6000 Blackwell, 96 GB ECC, $16,000) and
   the rental counterpart (Hyperstack, 1× $1.80/hr).
3. Read the receipt: owned $32,797 vs rented $7,358, and the break-even line that says there
   isn't one.

The video shows the inputs as a compact instrument column, the receipt as the working output,
and the break-even chart as the second output — the product *producing*, not describing.

## Tone

- Preset: `default`
- Creative direction: a receipt printer inside an industrial console — deadpan delivery,
  instrument typography, no jokes except the numbers themselves
- Interpretation: confident, quick cuts, but each panel settles and holds; copy is dry and
  factual; motion is mechanical (feed, wipe, draw), never bouncy.

## Format: landscape — 1920x1080

## Duration: 22.2s

## Visual identity (from the project)

- Background: `#08090b` void; panels `#0e1116` and `#141920`; grid hairline `rgba(255,255,255,0.028)`
- Accent: `#e8a33d` safety amber; signal-soft `rgba(232,163,61,0.14)`
- Text: `#e9eef4` primary, `#b9c6d3` body, `#94a3b8` labels, `#8496a9` dim
- Paper (receipt): `#f8fafc` sheet, `#e2e8f0` rule, `#111114` ink, muted `#5a6270`
- Data colors from the calculator: owned `#34d399`, rented `#22d3ee`, licence `#6d28d9`,
  capital `#b45309`, resale `#047857`
- Display font: Inter (700/800/900)
- Body/index font: JetBrains Mono (400/500/700) — the site's instrument voice
- Strongest visual element: the "GPU TCO RECEIPT" paper card with dashed rules and a
  cost-composition strip, plus the dark verdict panel with two same-scale bars.

## Share copy (draft)

The GPU lists at $16,000. Over three years it costs $32,797 — and $13,500 of that is a
software licence nobody quotes. The GPU TCO Analyzer prints the receipt before you buy.

## Audio direction

- Role: steady, slightly mechanical bed under an instrument readout; sound marks paper and
  money, nothing else.
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (steady/clean, 109.96 BPM)
- Music treatment: enter at 0 with a 0.4s fade-in at volume 0.32; hold flat; no ducking (no
  narration); tail out with the picture fade at 21.9s.
- Music cue guidance: bundled preset read. Strong cues in window: 8.74, 10.93, 13.11, 17.47,
  22.37. Beat grid ~0.54s. Locks: receipt total at 8.74, verdict line at 17.47, outro at
  18.56. Line-item prints snap to consecutive beats 4.39 → 7.64.
- Audio-reactive treatment: subtle — bass band drives the amber glow's opacity/scale behind
  the receipt (~6% swing) and the panel's hairline warmth. No waveform, no equalizer, no
  pulsing text.
- SFX posture: moderate/sparse; motion-matched, low high-frequency risk.
- Audio-coupled moments: odometer counter (soft mechanical ticks, thinned out), line-item
  prints (paper drops on alternate rows only), licence row (select click), receipt total
  (deep bell), cloud total (chip lay), delta wipe (soft impact), verdict line (light bell),
  outro (drop).
- Restraint rule: never score every row; never sound on text that is still being read.

## Storyboard

### Scene 1 — Odometer — 3.60s
Void frame, grid, thin brand rail. Mono eyebrow "GPU TCO ANALYZER". Giant figure `$16,000`
with label "STREET PRICE · 1× RTX PRO 6000 BLACKWELL (96GB ECC)". At 1.95s the figure counts
up to `$32,797`; the label crossfades to "TRUE COST · 36 MONTHS · 108 HRS/MO" in amber. Hold.
Sequential/interaction: yes — the number counts and the label swaps under it.
Audio intent: quiet, mechanical tension; one soft impact as it lands.
Audio-coupled idea: odometer ticks under the count-up, thinned to a few.
Music: bed only.
Transition mood: hard cut → Scene 2

### Scene 2 — The receipt prints — 6.60s
The paper card arrives at the beat: "GPU TCO RECEIPT / COST ANALYSIS BREAKDOWN / COMPARING
LOCAL VS HYPERSTACK", a mono meta line (36 MO · 108 HRS/MO · $0.24/kWh · 5% CAPITAL · 20%
RESALE). Seven line items feed out one per beat and stay: GPU cost $16,000; System components
$1,000; Electricity (36 mo) $397; Maintenance (5%/yr) $2,550; NVAIE (1 seat × $4,500/yr)
$13,500; Cost of Capital (5%/yr) +$2,550; Less 3-Yr Resale (20%) −$3,200. The NVAIE row lights
amber. Right column holds the inputs that produced it (hours/day 6, days/month 30, horizon 36
mo) and, after the licence row prints, a large amber `79%` with "OF HARDWARE CAPEX IS THE
LICENCE". Total slams at 8.74 on the strong cue: NET LOCAL TCO $32,797, $8.435/hr. Hold 1.5s.
Sequential/interaction: yes — 7 rows, one per beat, then the total.
Audio intent: paper feeding; the total is the first real hit of the video.
Audio-coupled idea: paper-drop on rows 1, 4 and the licence row only; bell on the total.
Music: bed.
Transition mood: soft wipe → Scene 3

### Scene 3 — The empty sheet — 3.70s
The input column clears; a second paper card of identical height slides in on the right for
Hyperstack (1× NVIDIA RTX PRO 6000): Usage (1× @ $1.80/hr) $6,998; Storage (36 mo) $360 — and
then emptiness until the total pinned to the same baseline as the receipt's: TOTAL CLOUD COST
$7,358, $1.893/hr. At 12.02 a dark strip wipes across the bottom: "DELTA AT 36 MONTHS −$25,438
IN FAVOUR OF RENTING".
Sequential/interaction: yes — two rows, the total, then the strip.
Audio intent: lighter, almost anticlimactic — the cheap side is short.
Audio-coupled idea: chip-lay on the cloud total; soft impact on the strip.
Music: bed.
Transition mood: hard cut → Scene 4

### Scene 4 — Never — 4.50s
Full-width instrument: "RENTING VS OWNING · CUMULATIVE COST" with axes ($0/$10k/$20k/$30k,
months 0-36). Owned line draws steep in emerald, rented line draws shallow in cyan; a month-36
marker drops with the gap labelled. Then, dry: "NO BREAK-EVEN INSIDE 84 MONTHS" in amber, and
"The hardware never repays itself." in display type. Hold to the cut.
Sequential/interaction: yes — axes, line 1, line 2, marker, two text lines.
Audio intent: the only dramatic beat; restrained.
Audio-coupled idea: light bell on the verdict line (17.47 strong cue).
Music: bed.
Transition mood: hard cut → Scene 5

### Scene 5 — Outro — 3.80s
"Bring your own numbers." URL chip `aichieve.net/tools/gpu-compute/` with "No signup", then the
mono meta line "Deterministic · nothing leaves the page". All of it fades with the bed.
Sequential/interaction: yes — line, chip, meta.
Audio intent: release, one clean drop.
Audio-coupled idea: drop on the line at 18.56 (strong cue), click on the chip.
Music: bed, fading from 21.8.

**Music mood for this video:** steady corporate-mechanical, slightly tense
**Audio summary:** a clean bed that stays out of the way while paper, money and one bell mark
the four moments that matter.

## Reading-time audit

- Hook label at 2.80 holds 0.80s (short label floor) ✓
- Receipt rows: printed fast but they persist as a list through 10.20 — list reading, not
  flashed copy ✓
- "The hardware never repays itself." appears 17.47, holds to 18.40 = 0.93s settled, and the
  line is 5 words → 1.5s floor. **Fix in composition:** move it to 16.60 (holds 1.80s) and the
  "no break-even" label to 16.38. Lock the bell at 17.47 as a held accent instead of the text
  arrival.
- Outro line 18.56 holds 3.6s ✓

## Scene durations
3.60 + 6.60 + 3.70 + 4.50 + 3.80 = **22.20s** ✓ (15-25s window)
