# Master Asset & Software TCO Calculator — review and redesign

Owner: Jorge · Surface: `aichieve.net/tools/master-asset-tco/`
Files: `src/lib/calculators/decisionIntelligence.ts`,
`src/components/calculators/react/DecisionIntelligenceCalculator.tsx`,
`src/pages/tools/master-asset-tco.astro`, `src/styles/aichieve.css`,
`src/components/calculators/CalculatorShell.astro`

## 1. What the page is

One React island, four modes, inside a white "instrument bay" mounted in the dark console:

| Mode | Question | Inputs | Verdicts |
|---|---|---|---|
| enterprise_ciam | Build an auth stack or buy one | MAU, rate, months, FTE %, compliance | BUY / PATCH / WAIT |
| personal_cpu | Own the asset or pay per use | sticker, uses, upkeep, outsource rate | BUY / SKIP |
| personal_repair | Repair the thing or replace it | asset class, age, repair quote | REPAIR / REPLACE |
| personal_tinkering | Pay for the app or keep tinkering | hours, time value, subscription | BUY / WAIT |

## 2. Findings

Measured on the running dev server at 1280×577 and 390×844, plus a read of the engine.

### Blocking — the answer is wrong or unreadable

1. **Break-even is inverted.** `calculateTrueBreakEven` returns `Never` when
   `customMaintAnnual <= saasMaintAnnual` and a month count otherwise, so the guard sits on the
   wrong side of the comparison. Worse, the numerator is `customBuild − saasIntegrate` and the
   denominator is the maintenance *difference*, so a figure labelled "Break-Even" moves the wrong
   way with scale: at 25k MAU it reads **4.8 Months**, at 500k MAU it reads **8.1 Months** (verified
   in the browser). It is displayed next to "Managed SaaS saves $668,620" — the two numbers
   contradict each other, and neither is a crossover.
2. **The bay's whole semantic colour system is dead.** §4b of `aichieve.css` forces
   `background-image: none !important` on every `bg-[linear-gradient…]` inside `.instrument-surface`,
   so the emerald/rose verdict banner and the cyan/rose iceberg matrix render as identical white
   cards. The one visual idea the tool is built on — visible cost vs invisible cost — is invisible.
3. **20 controls carry classes that are not utilities.** `#5A7A8F`, `#1A1A1A`, `#B85C5C/85` are
   written without `text-[…]`, so they compile to nothing; those elements inherit `#1a1a1a` and lose
   the intended cyan/red coding. `bg-cyan-500/10 #5A7A8F` even puts a hex literal in the class list.
4. **Repair-or-replace never asks what a replacement costs.** The verdict is a threshold on
   `age × repairQuote`, an index with no unit and no purchase price anywhere in the model. The mode
   cannot answer the question in its own name.
5. **Two assumptions worth >$300k are hardcoded and unadjustable**: $150,000 opportunity cost and
   $75k/$150k compliance. On the default build the opportunity cost alone is 22% of the total and
   the opportunity cost is 82% of the cheapest possible total. The user can move MAU across 500×
   and the custom-side total does not move a dollar.
6. **`buildTeam` is a magic `1.5`** inside `buildTime * 160 * 1.5 * devRate`, with no label, on the
   headline labour line.

### UX

7. **No chart.** A total-cost-of-ownership tool whose entire output is six numbers in a row. There
   is no cumulative-spend view, so the reader cannot see *when* one option overtakes the other —
   which is the only thing a 3-year TCO comparison is for.
8. **Fake progress.** "Step 2 of 4" and "Step 4 of 4" are static strings on two of four sections;
   there is no step 1 or 3, and nothing is sequential.
9. **The checkboxes are decorative.** `hasSunkCostFallacy`, `hasKeyPersonRisk`, `hasTinkeringTax`,
   `cpuAspirationalCheck` are never read by the engine. Ticking anything changes a warning box and
   nothing else, while the panel is titled "Strategic risk assessment" and the page's pitch is an
   auditable number.
10. **`codebaseAge` and `remediationHours` have no controls** but feed the "codebase tech debt index"
    quoted inside one warning, so the tool cites a figure the reader cannot see or set.
11. **Mobile puts the output off-screen from the input.** 2,866px of controls below the verdict;
    dragging a slider gives no feedback without scrolling back up. On top of that "Step 2 of 4"
    is clipped by its own row, and four 150px cards hold a label and a slider each.
12. **No failure to look at.** Nothing to copy, export, or paste into a review — the copy says the
    figure is defensible and then gives the reader no artefact.
13. **The aside grid has a hole**: four cards in `lg:grid-cols-3` leaves two empty cells beside the
    related-dispatch card (visible as a large empty block above the footer).
14. **Brand mismatch.** The console is square-ruled, monospace, hairline, amber-signal, no shadows.
    The island is `rounded-[2rem]`–`rounded-3xl` blobs, emoji headings, neon shadows and cyan tints —
    it reads as an embedded third-party widget, not as a page of this property.

## 3. Redesign

Keep the light bay (documented pattern: instruments and long-form reading are paper). Make the paper
a **ledger**, not a dashboard: hairline rules, 2px radii, mono eyebrows, tabular figures, one accent,
one alarm colour, no emoji, no gradients, no shadows.

### Layout

```
tabs ─ 4 modes, square, aria-current rail
┌──────────── rail 26rem ────────────┬──────── readout ────────┐
│ 01 COST BASIS  (fieldset/legend)   │ verdict + 36-mo delta   │
│    label · value · hint · slider   │ cumulative spend chart  │
│ 02 RISK PREMIUM                    │ ledger table (build/buy)│
│ 03 PREMISE CHECK                   │ premise status          │
└────────────────────────────────────┴─────────────────────────┘
mobile: inputs first, sticky bottom readout bar (verdict + delta)
```

### Engine

- `buildTeam` exposed; `opportunityCost3Yr` and `complianceCostAnnual` exposed and editable.
- `calculateTrueBreakEven` replaced by a real cumulative crossover over 36 months, returned as
  `crossoverMonth | null` plus the two cumulative series for the chart.
- Repair gains `replacementCost` + `expectedExtraLifeYears` + `replacementLifeYears`; verdict compares
  amortised repair cost against amortised replacement cost, with the advertised index kept as a
  secondary signal.
- Cost-per-use gains `residualPct`; TCO becomes `sticker − residual + operating + upkeep` instead of
  adding a depreciation line on top of the sticker.
- Premise flags stay out of the arithmetic (they are not numbers) but drive a visible
  "N of 3 premises unresolved" state on the verdict.

### Copy

Every reader-facing string is gated by `npm run copy:check`. Conclusion first, figure in the claim,
no marketing adjectives.

## 4. Done when

- `npm run check`, `npm run copy:check`, `npm run build` pass.
- `npm run audit:contrast -- /tools/master-asset-tco/` passes at 390px and 1280px.
- Both options' 36-month totals equal the previous engine's totals on the default inputs
  (regression guard: custom $681,000 / SaaS $12,380).
- No mode renders a verdict that its inputs cannot justify (repair mode includes a replacement price).
