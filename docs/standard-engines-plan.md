# Five Standard Engines — Implementation Plan

> **For Hermes:** use `subagent-driven-development` to execute wave by wave, one engine per child.

**Goal:** ship the five free deterministic engines from the "Shared UI/UX Architecture for
aichieve.net Standard Tools" brief — agentic breakeven, total delivered cost, inventory record
accuracy, parcel DIM weight, warehouse slotting/CAPEX — on an already-verified shared shell, each
bridging honestly to the PRO app that audits the same question on a real file.

**Architecture:** every engine is a pure TypeScript function in `src/lib/calculators/<engine>.ts`
returning a typed result record; a thin React island renders that record through shared primitives
(35/65 split, sticky KPI strip, one SVG canvas, PRO bridge). Shell, primitives, URL state and chart
components are built once in wave 0 — engine 2 is the point at which copy-paste becomes permanent,
so no engine page ships before the shared layer does.

**Tech stack:** Astro 6.2.1 (static), React 19 islands, Tailwind 4 (`src/styles/aichieve.css`
tokens), inline SVG charts (no chart library), Node 22.23 native TS strip for the regression gate.

**Repo:** `AICHIEVE/` (aichieve.net). The brief names aichieve.net and every PRO bridge in it
(SpendProof, ParcelProof, CaseGuard/CaseProof, FacturGate) is an app in `src/lib/apps.ts`. The
sibling `giniloh.com` front end is *not* touched.

---

## Status

| Wave | State | Evidence |
| --- | --- | --- |
| 0 · shared platform | **shipped** | `aichieve.css` §8, 5 primitives, 5 engines, `npm run check:engines` = 140 assertions green |
| 1–3 · all five engines + pages | **shipped** | `/tools/{agentic-workflow-breakeven,warehouse-slotting-payback,inventory-record-accuracy,total-delivered-cost,parcel-dim-weight}/` |
| 4 · integration | **shipped** | register, tools index, tool rail, ProductCTA, `verify.mjs` routes, README |

Gate results at close of wave 4:

```
npm run check        0 errors
npm run check:engines 140 assertions
npm run build        186 pages, copy gate PASS, 0 new warnings
audit:contrast       938 text elements across 6 pages, all clear AA
audit:layout 390     0px horizontal overflow on all five engines + the register
```

Deployed to aichieve.net (Coolify → `kotechile/achieve:main`), and the deploy contract is green:

```
npm run verify -- https://aichieve.net   GREEN — 41 checks
                                        (five new tool routes 200, canonical host, www,
                                         ownership boundary: 39 foreign posts still 404)
```

One live interaction check against production, because a 200 is not an engine: setting the failure
rate plate to `0.10` on `/tools/agentic-workflow-breakeven/` moved the strip from `$19.90 / 3.2% /
$160k` to `$30.83 / 3.2% / $433k`, left the cliff untouched (it is a property of the model, not the
assumed rate), and rewrote the address bar to
`?vol=25000&tm=18&orh=45&tok=14000&tp=4.5&rt=0.22&fail=0.1&aud=0.25&atm=8&rwm=25&srh=160&pen=250` —
all twelve keys, fixed order, so two people comparing links get byte-identical URLs.

The total-delivered-cost page also declares what it cannot answer: seven figures that need the ERP, the
TMS, the broker's entry file or the bank, rendered as `excluded` on the engine result — a field distinct
from `refusals`, because a caveat about the arithmetic and a question the page does not answer at all are
different promises. `check-engines` fails if that list empties or stops naming a system of record.

`product-cta.ts` needed no change: every category the new engines sit under already maps to a PRO
app, and the engine pages carry their own bridge inside the island rather than through the page CTA.

Two findings from the build that this plan did not anticipate, both now handled in code:

1. **The bay's policy layer reaches inside the engine.** `:is(.paper,.instrument-surface) :is(p,.text-base,.text-sm){color:#716f6f!important;font-weight:400!important}` is `(0,2,0)` with `!important`, so every `<p>` in an engine was pinned to grey at weight 400 — the verdict headline measured 4.45:1 on the erosion wash, just under AA. Every `<p>`-based part now carries its own `!important` three classes deep. §8 documents it where the layer is introduced.
2. **`dist/` picks up iCloud conflict copies** (`sitemap 2.xml`) that break `audit:contrast`'s sandbox copy. `rm -rf dist && npm run build` before auditing; the repo's audit script already names this fix.

One more, from the URL contract: the incoterm is a string, so `useUrlState` grew an enum field
(`values[]`) rather than shipping a select whose state never round-tripped through the link.

---

## 1. What already exists (read before starting)

| Thing | Where | Relevance |
| --- | --- | --- |
| Tool register | `src/lib/calculators/metadata.ts` | Adding an entry makes the tool appear on `/tools/`, in `ToolRail` (every article), and in JSON-LD. No second list to update. |
| Page chrome | `src/components/calculators/CalculatorShell.astro` | Eyebrow/H1/lede + `instrument-surface` bay + `aside`/`aside-full` slots. The bay is intentionally light. |
| Engine pattern | `src/lib/calculators/decisionIntelligence.ts` (632 lines, pure) + `DecisionIntelligenceCalculator.tsx` (1047, view) | The split to copy: math never lives in JSX. |
| Design contract | `src/styles/aichieve.css`: `--ai-signal #e8a33d`, `--ai-ok`, `--ai-bad`, `--ai-ink*`, `--paper-ink #1a1a1a`, `--paper-ink-2 #716f6f`; **zero drop shadows, zero rounded-pill chrome** | Overrides the brief's glass/rounded/shadow direction (see §2.1). |
| Copy gate | `scripts/vibe/vibe-lint.mjs` + `lexicon.json`, wired as `prebuild` | Every new string is gated; a hard violation fails the build in CI. |
| Deploy contract | `scripts/verify.mjs` (route list ~line 84) | New routes must be added or `npm run verify` will not cover them. |
| Related articles | `fetchPostBySlug()` + `RelatedArticleCard` | Corpus already owns the articles each engine prices (see §5). |
| Regression precedent | `../scripts/check-calculators.mjs` (giniloh repo, green on Node 22.23) | Copy the shape: known-answer table, non-zero exit. aichieve has no engine gate yet. |

Two facts the brief does not know and that cost work if discovered late:

- **`/tools/index.astro`, `ToolRail.astro` and `ProductCTA.astro` say "two engines" in reader-facing
  copy** ("Two engines. Every number yours.", "Both engines on this site stay free"). Seven engines
  makes those strings false. They are inside the copy gate, so they fail the build if left.
- **The engines render on a white `instrument-surface`**, not on the dark console. Any palette must
  be measured against white, not against `--ai-void`.

---

## 2. Adjudicating the brief

The brief is a design/quantity document, not a verified one. Nine claims do not survive contact
with either the repo or arithmetic. Each is settled here, before it becomes a phase.

### 2.1 Design direction — keep the structure, drop the skin

Take from the brief: the 35/65 split, collapsible "Advanced / edge-case" groups, the sticky 3-KPI
strip, one primary canvas per engine, `font-variant-numeric: tabular-nums` on every readout (the repo
already ships JetBrains Mono), URL-persisted state.

Reject from the brief: glassmorphism, rounded cards, drop shadows, and a **fourth palette**. The
console is hairline-industrial by contract, and inventing steel/amber/crimson alongside `--ai-signal`
gives the property two amber meanings. Map instead, on the light bay, with measured contrast:

| Brief | Shipped token | Ratio on `#fff` | Why |
| --- | --- | --- | --- |
| Steel Blue `#5A7A8F` | `--en-base #0e7490` | 5.4:1 | the §6 instrument's accent, so both tools read as one family |
| Amber `#D97706` | `--en-friction #92400e` | **7.0:1** | the brief's amber is 3.19:1 on this ground and fails AA outright |
| Crimson `#DC2626` | `--en-erosion #a33b32` | 6.5:1 | the brief's crimson passes (4.83) but is a second red on a site that already has one |
| — | `--en-positive #1c6b4f` | 6.1:1 | replaces `#0f766e` for the same reason |

Three new semantic tokens go in `aichieve.css` (`--eng-base`, `--eng-friction`, `--eng-erosion`) so no
engine hardcodes a hex, and `npm run audit:contrast --all` is the proof.

### 2.2 The brief's own worked examples do not reproduce

Recomputed from the brief's stated defaults (fixtures in §4, arithmetic in `scripts/check-engines.mjs`):

| Brief claims | Recomputed | Cause |
| --- | --- | --- |
| "tokens $0.08, verification + rework $14.20 per run" | audit $5.33 + rework $3.80 = **$9.13**; all-in **$19.90** | the $14.20 figure is not derivable from the stated inputs |
| Agent at defaults is cheaper than manual | **$19.90 vs $13.50 — 47% more expensive, the cliff sits at 3.18% failure** | liability ($10.69) dominates; the default scenario is a *negative* one, which is the strongest hook the page has |
| Slotting: vendor 2.1y vs buyer 4.8y | **vendor 3.13y vs buyer 9.93y** | the brief's buy-side denominator omits the shared-baseline correction (§2.6) |
| IRA dead cash "from the third variance term" | brief's term adds 0.52σ → **$52k**; a defined record-error σ → **$11.1M** | the term `velocity × σ_IRA` is dimensionally inert (§2.5) |

Every number a page prints therefore comes from the engine, and every number in this plan comes from
the fixture table — none is copied from the brief.

### 2.3 Incomplete input surfaces

Four formulas reference inputs their interfaces never declare. Each is promoted to a real input, with
a default, or removed:

| Engine | Missing | Decision |
| --- | --- | --- |
| TDC | `C_pick_pack`, `R_shrink_ins`, `R_writeoff`, `R_payment_terms_discount`, unit weight + weight rate | add all five as inputs; the `max(cube, weight)` branch is meaningless without a weight |
| TDC | freight rate per CBM | derive: `(40HQ rate + surcharge) / 68 CBM`, shown as a readout |
| IRA | definition of `σ_IRA` | see §2.5 |
| Parcel | carton contents height (for right-sizing) | replace with a "height reduction is a ceiling, verify contents fit" refusal note |
| Slotting | downtime cost, WMS integration, labour inflation | downtime + WMS integration become inputs; inflation is stated as excluded (undiscounted payback) |

### 2.4 TDC: two duty-base errors

- **MPF/HMF = 0.4714% is per-entry with a floor ($32.71) and a cap ($634.62), and at these defaults the
  CAP binds** — 20,000 units make the fee $872.93, so the effective rate is 0.2518%, not 0.3464%. The
  first build had this backwards: it compared the per-unit fee to the per-unit share of the floor and
  therefore reported "under the floor" on the largest possible entry. The engine now clamps per entry
  and names whichever bound binds; both directions are fixture-tested (1 unit → floor, 2,000 → neither,
  20,000 → cap).
- **Incoterm does not change the US duty base.** US customs assesses on transaction value (FOB +
  assists) and excludes international freight, so on a `CIF`/`DDP` input the engine must *strip* the
  freight it added for landed cost before applying duty, or it will overstate duty by ~13% of the
  freight line. `EXW` adds the inland leg to the assists. Encode the four cases explicitly; do not
  let the selector be cosmetic.

### 2.5 IRA: the model needs a defined record-error variance

`σ_eff = √(LT·σ_D² + D̄²·σ_LT² + (velocity·σ_IRA)²)` treats a *rate* (65% of records wrong) as if it
were a standard deviation in units — it contributes 0.52σ against a 130.9σ baseline, i.e. $52k of
"dead cash" where the mechanism implies millions. Replace with a definition the page can defend:

```
H̄  = D̄ × LT                       mean on-hand units per SKU (630 at defaults)
σ_rec = R_IRA × H̄ × k             k = 0.5, "uniform misstatement spread" (dated constant)
σ_eff = √(LT·σ_D² + D̄²·σ_LT² + σ_rec²)
```

`k` lives in `assumptions2026.ts` with a comment saying it is an assumption, not a measured value. The
KPI is then honest at default: **185 extra units of safety stock per SKU, $11.1M dead cash, $2.44M/yr
carrying cost.**

The phantom-stockout formula is worse: `annualUnits × R_IRA × P_bias × margin` implies 36% of all
units fail, which is $95M and obviously false. Replace with an event model:

```
events/yr = SKUs × (365 / LT) × R_IRA × P_bias          (9,321 at defaults)
cost      = events × D̄ × daysToDetect × unitMargin      ($5.37M at daysToDetect = 2)
```

Z values come from a fixed table at full precision (`1.2816 / 1.6449 / 1.9600 / 2.3263`), not the
brief's rounded 1.28 / 1.65 / 1.96 / 2.33 mixed with 1.645 / 2.326 in its own prose.

### 2.6 Slotting/CAPEX: the brief double-counts the walk

`ΔC_slotting + ΔC_automation` adds two savings both measured against the unoptimised baseline, so the
seconds of walk recovered once are paid for twice. At the defaults the overlap is **$114,376 a year** —
less than the whole $208,000 slotting saving, because the vendor applies the throughput gain to fixed
pick time as well as walk, but enough to move a payback by a year. That inflates the vendor case *and*
the buyer case.
Compute three scenarios — current, slotted, slotted+automated — and let the automation saving be
`labour(slotted) − labour(slotted+automated)`. The buyer payback then also carries AMC, WMS
integration and downtime, which the brief's own "honest" denominator omits.

### 2.7 Parcel: the surcharge thresholds are wrong, and most of the money is structural

- `L + 2(W+H) > 130"` is **Additional Handling – Dimension**, not Large Package. Large Package is
  `length + girth > 165"` or `length > 96"`. The "$150+" figure belongs to the second threshold. The
  spec's carton (L18/W14/H12, girth 70") triggers *neither* — it must not render a "cliff" warning.
- Divisor 139 is the **UPS/FedEx published daily rate**; USPS is 166, not 139. The brief's "139 for
  UPS/FedEx/USPS in 2026" is false; the selector offers 139 / 166 / 180 and labels which carrier each
  belongs to.
- **Excess billed pounds are not leakage.** Of the $734k/yr of excess-weight cost at defaults, only the
  negotiated-divisor and right-sizing portions are recoverable ($184k and $367k). The residential
  ($61.4k/mo) and DAS ($16.2k/mo) blocks are structural and render in a separate, clearly labelled
  panel — never summed into the "recoverable" KPI. This is the same honesty rule the free-vs-paid
  boundary already follows.

### 2.8 Constants that go stale

Carrier fees, duty rates and the Section 301 rate all change annually. They live in one dated module,
`src/lib/calculators/assumptions2026.ts`, with an `EFFECTIVE_FROM` export and a header comment naming
the source document for each figure. The parcel page prints the effective date under the surcharge
panel; a stale year is a one-file fix, not a five-page hunt.

### 2.9 The agentic model needs its refusals, not more inputs

`R_fail_max = (C_manual − C_compute − C_audit) / ((T_rework/60)·R_reviewer + (1−R_audit)·C_penalty)`
is algebraically correct, but it has three states the page must handle instead of printing a number:

1. numerator ≤ 0 → **"manual is already cheaper at 0% failure"** (no cliff exists);
2. denominator = 0 (no rework time, no penalty, audit covers everything) → **"no failure rate makes this
   more expensive"**;
3. both positive → the cliff, as a percentage with one decimal, plus the failure rate the operator
   actually assumed.

Two modelling assumptions are stated on the page rather than hidden: rework is charged on *all*
failures (not only the audited share), and escaped failures pay both rework and penalty.

---

## 3. Wave 0 — shared platform (no engine ships before this closes)

### Task 0.1 Engine tokens

**Files:** modify `src/styles/aichieve.css` (add an `.engine-*` block after the `--paper-*` vars).

Add `--eng-base: #5A7A8F`, `--eng-friction: #B45309`, `--eng-erosion: #DC2626`,
`--eng-positive: #0f766e`, plus `.engine-num { font-variant-numeric: tabular-nums; }` and
`.engine-field` / `.engine-kpi` / `.engine-legend` classes built on the existing hairline rules
(`1px solid var(--paper-line)`, no radius, no shadow).

**Verify:** `npm run audit:contrast -- /tools/gpu-compute/` still green (the block is additive).

### Task 0.2 Field primitives

**Files:** create `src/components/calculators/react/primitives/NumberField.tsx`, `SliderField.tsx`,
`SelectField.tsx`, `Group.tsx`.

Contract for all four: `label`, `unit?`, `hint?`, `min?`, `max?`, `step?`, `value`, `onChange`;
`<label for>` bound, `inputMode="decimal"`, `aria-describedby` for the hint, `aria-valuetext` on the
slider (`"18 minutes per task"`, not `"18"`), 44px minimum target, focus ring
`focus-visible:outline-[var(--eng-base)]`. Clamp on blur, not on keystroke — typing `0.0` must not
snap to `0`. `Group` is the collapsible advanced section: `<details>`-based (works without JS), summary
styled as an eyebrow, count of hidden inputs in the summary.

### Task 0.3 `useUrlState` hook

**Files:** create `src/components/calculators/react/primitives/useUrlState.ts`.

- keys are short and stable (`vol`, `tm`, `tf`, `aud`, `fail`, …), one map per engine;
- on mount: parse, coerce, clamp to each field's range, ignore unknown keys, fall back to defaults;
- on change: `history.replaceState` debounced 300ms, keys in fixed order so two sessions comparing
  links produce byte-identical URLs;
- never pushes history (back button must not walk through slider positions);
- `< 2048` chars: drop keys at default value only when the URL would overflow.

**Test:** a Node assertion in `scripts/check-engines.mjs` runs the parse/serialise round trip against
each engine's default state and asserts the URL is stable across two passes.

### Task 0.4 Chart canvases (SVG, no library)

**Files:** create `react/primitives/BreakevenChart.tsx`, `WaterfallChart.tsx`, `MatrixBars.tsx`,
`PaybackBars.tsx`.

Rules for all four: inline SVG, `role="img"` + `aria-label` carrying the headline figure, a
visually-hidden `<table>` of the plotted series beside it, `prefers-reduced-motion` respected (no
animation, or a single 180ms fade), no `framer-motion` unless the existing `AnimatedCounter` is reused.
Axis ticks use `--eng-*` tokens; grid lines `var(--paper-line)`.

### Task 0.5 Engine math modules + regression gate

**Files:** create `src/lib/calculators/{agenticBreakeven,landedCost,inventoryAccuracy,parcelDim,slottingPayback}.ts`,
`src/lib/calculators/assumptions2026.ts`; create `scripts/check-engines.mjs`; modify `package.json`
(`"check:engines": "node scripts/check-engines.mjs"`, and `prebuild` becomes
`npm run copy:check && npm run check:engines`).

Each module exports its state interface, its result interface, `DEFAULT_<X>_STATE`, and
`compute<X>(state): Result`. No React import, no DOM, no `Intl` inside the math (formatting stays in
`format.ts` plus new `formatRate`, `formatTokens`, `formatMonths`).

`check-engines.mjs` asserts the §4 fixture table, plus three invariants per engine:

- monotonicity where the model implies it (agent cost rises with failure rate; TDC contribution falls
  as duty rises);
- boundary behaviour (zero volume, zero failure, 100% audit, divisor at 180, height cut to fit);
- the refusal states from §2.9 / §4 return a `verdict` string, never `NaN` or a negative number.

**Verify:** `npm run check:engines` → `5 engines, N assertions, 0 failures`.

### Wave 0 exit gate

```bash
npm run check            # astro check, 0 errors
npm run check:engines    # fixtures green
npm run build            # copy gate + routing + astro build
npm run audit:contrast   # unchanged from baseline
npm run audit:layout 390 /tools/gpu-compute/   # no regression on an existing engine
```

---

## 4. Per-engine contracts

Defaults are the brief's, except where §2 corrects them. Every fixture below is computed by
`check-engines.mjs`; a changed constant fails the gate.

### Wave 1 / Engine A — Agentic Workflow Breakeven  ✅ shipped

- **Route:** `/tools/agentic-workflow-breakeven/` · **slugs:** `agenticBreakeven` ·
  `domainCategory: 'Agentic Operations'` · **icon:** `flow`
- **H1:** Agentic Workflow Breakeven Calculator (keeps the search term per the lexicon)
- **Inputs:** `monthlyTaskVolume 25000`, `manualTimeMins 18`, `operatorHourlyRate 45`,
  `avgTokensPerRun 14000`, `blendedTokenCostPer1M 4.50`, `agentRetryLoopRate 0.22`,
  `contractOrRagFailureRate 0.057`, `humanAuditSampleRate 0.25`, `seniorAuditTimeMins 8`,
  `exceptionReworkTimeMins 25`, `seniorReviewerHourlyRate 160`, `escapedDefectPenalty 250`
- **Outputs:** `costPerRun` decomposed into compute / audit / rework / liability, `manualCostPerRun`,
  `deltaPerRun`, `annualDelta`, `verificationCliffPct`, `verdict`
- **Fixture (defaults):** manual $13.50 · compute $0.0769 · audit $5.3333 · rework $3.8000 ·
  liability $10.6875 · **agent $19.8977 (+47.4%)** · annual **+$159,942** · **cliff 3.18%**
- **KPIs:** `Cost per run` (agent, vs manual delta) · `Verification cliff` (%) · `Annual delta` ($)
- **Canvas:** dual-line breakeven, X = failure rate 0–25%, flat manual baseline, agent curve, cliff
  marked; secondary stacked bar of the four cost layers ($0.08 compute vs $19.82 human/liability).
- **Refuses:** a cliff when the numerator ≤ 0 or the denominator = 0 (§2.9); any per-run cost below
  the compute layer.
- **PRO bridge:** SpendProof — retry overhead on the invoice vs the retry rate assumed here.
- **Related article:** `your-retrieval-misses-57` (the 5.7% default), then `retry-is-the-failure-amplifier`.

### Wave 1 / Engine B — Warehouse Slotting & Automation Payback

Pure arithmetic, no external rule table → ships second.

- **Route:** `/tools/warehouse-slotting-payback/` · **icon:** `matrix` ·
  `domainCategory: 'Warehouse / CAPEX'`
- **Inputs:** `operatingDaysPerYear 260`, `dailyOrderLinesPicked 12000`, `avgWalkFeetPerLine 85`,
  `pickerWalkSpeedFps 3.8`, `fixedPickTimeSecs 12`, `fullyLoadedWarehouseWage 28.50`,
  `utilisation 0.85`, `slottingWalkReductionPct 0.32`, `proposedAutomationCapex 1_850_000`,
  `wmsIntegrationCost 220_000`, `annualMaintenanceContractPct 0.09`,
  `automationThroughputGainPct 0.55`, `annualDowntimeCost 60_000`
- **Outputs:** three labour scenarios (current / slotted / slotted+automated), slotting saving,
  automation saving, vendor-model payback, buyer-model payback (CAPEX + WMS, less AMC and downtime),
  annual picker miles, verdict
- **Fixture (defaults):** 34.37 s/line · 35,042 h · $998,706/yr → slotted 27.21 s/line · 27,744 h ·
  $790,706 (**$208,000/yr free**) → automated 12,485 h · $355,818/yr (**$434,888 incremental**);
  AMC $166,500; **vendor 3.13y vs buyer 9.93y**; $193.2 → $131.4 picker miles/day
- **KPIs:** `Buyer-audited payback` (years) · `Free slotting recovery` ($/yr) · `Picker miles/day`
- **Canvas:** side-by-side payback bars (vendor vs buyer) with the AMC/WMS/downtime terms as a
  stacked breakdown under the buyer bar.
- **Refuses:** any payback that excludes AMC or WMS integration; stacking slotting and automation
  savings from the same baseline; payback printed without stating it is undiscounted.
- **PRO bridge:** CaseProof — upload the vendor's own model, line by line.
- **Related article:** `your-golden-zone-costs-10-miles`, then `wage-floor-sets-robot-payback`.

### Wave 2 / Engine C — Inventory Record Accuracy

Statistical definition must be agreed before code (§2.5).

- **Route:** `/tools/inventory-record-accuracy/` · **icon:** `server` ·
  `domainCategory: 'Supply Chain'`
- **Inputs:** `activeSkuCount 2500`, `avgUnitCost 24`, `avgUnitMargin 16`, `avgDailyDemandPerSku 18`,
  `demandStdDev 6`, `supplierLeadTimeDays 35`, `leadTimeStdDevDays 7`,
  `erpRecordInaccuracyRate 0.65`, `phantomOverstatementShare 0.55`, `targetServiceLevel 0.95`,
  `annualHoldingCostRate 0.22`, `daysToDetectPhantom 2`, `recordErrorSpread 0.5`
- **Outputs:** `sigmaEffective`, `safetyStockClean`, `safetyStockWithIra`, `deadCash`,
  `annualHoldingCost`, `phantomEvents`, `phantomLostMargin`, plus the same pair recomputed at a clean
  (<5%) accuracy baseline for the comparison curve
- **Fixture (defaults, Z = 1.6449 at full precision):** σ base 130.90 · σ_rec 204.75 · σ_eff 243.02 ·
  SS **215.3 → 399.7** units (**184.45/SKU**) → **$11.07M dead cash**, **$2.43M/yr** holding;
  **9,321 phantom events/yr**, **$5.37M lost margin**
- **KPIs:** `Dead cash in buffer` ($) · `Phantom stockout margin` ($/yr) · `Extra units per SKU`
- **Canvas:** working capital vs service level 90 → 99%, two curves (current accuracy vs audited <5%);
  Z from the full-precision table.
- **Refuses:** dead cash without printing `H̄` (mean on-hand) and `k` on the page; any output when
  `σ_eff` would be computed from an undefined spread.
- **PRO bridge:** CaseProof — stress-test the vendor's automation ROI.
- **Related article:** `why-65-percent-of-stock-records-miss`, then `slow-movers-hold-your-stock`.

### Wave 3 / Engine D — Total Delivered Cost

Needs the dated duty/MPF module and the Incoterm matrix (§2.4).

- **Route:** `/tools/total-delivered-cost/` · **icon:** `table` · `domainCategory: 'Supply Chain'`
- **Inputs:** `sellingPrice 45`, `unitFobCost 11.50`, `offshoreToolingValue 22000`,
  `amortizedProductionRun 20000`, `incoterm 'FOB'`, `baseDutyRate 0.065`, `punitiveTariffRate 0.25`,
  `unitCartonCbm 0.018`, `unitWeightKg 0.9`, `containerFreightRate40HQ 4800`,
  `emergencySurchargePer40HQ 1200`, `containerCapacityCbm 68`, `waccRate 0.11`,
  `shrinkInsuranceRate 0.02`, `daysSalesOfInventory 75`, `daysInTransit 30`, `pickPackCost 3.50`,
  `paymentTermsDiscountRate 0`, `rmaReturnRate 0.06`, `reverseLogisticsCost 14.50`,
  `rmaWriteoffRate 0.35`, `unitsPerEntry 20000`
- **Outputs:** the waterfall steps (FOB, customs assist, duty+301+MPF, freight, carrying, cost-to-serve,
  RMA), `landedCost`, `tdc`, `contributionMargin` in $ and %, `dutyShareOfTdc`, `freightBasis`
  (cube-limited vs weight-limited), MPF-floor flag
- **Fixture (defaults):** assist $1.10 · customs value $12.60 · duty+301+MPF **$4.0165 (8.9% of price)**
  · freight $1.5882 · landed $18.2047 · carrying $0.6808 · RMA $1.2523 · **TDC $23.6378 · contribution
  $21.3622 (47.5%)** · duty is **17.0%** of TDC. MPF is $872.93 for the entry, so the **$634.62 ceiling
  binds** and the effective rate is 0.2518%, not 0.3464%.
- **KPIs:** `Contribution margin` ($ and %) · `Duty + tariff per unit` · `TDC per unit`
- **Canvas:** horizontal price-to-TDC waterfall from $45 to contribution, each step labelled with its
  per-unit cost; toggle cube-out/weight-out flashing `--eng-friction` when volume binds first.
- **Refuses:** a contribution figure that omits any duty layer; a duty base built on CIF/DDP freight
  without saying it was stripped; a per-unit MPF below the entry floor without flagging it.
- **PRO bridge:** FacturGate (invoice/HS-code compliance) — with ParcelProof named only where freight
  auditing is the subject.
- **Related article:** `your-tooling-assist-is-dutiable`, then `tariff-cliff-already-priced-in`.

### Wave 3 / Engine E — Parcel DIM-Weight

Highest stale-data risk (carrier tables) → ships last.

- **Route:** `/tools/parcel-dim-weight/` · **icon:** `bolt` · `domainCategory: 'Logistics'`
- **Inputs:** `monthlyShipmentVolume 15000`, `currentDimDivisor 139`, `targetNegotiatedDivisor 166`,
  `incrementalRatePerLb 0.68`, `residentialSharePct 0.70`, `residentialSurcharge 5.85`,
  `deliveryAreaSurchargePct 0.22`, `dasFeeAvg 4.90`, and three carton rows
  (`name`, `L/W/H`, `actualWeightLbs`, `volumeSharePct`)
- **Outputs:** per carton — `dimWeight` at each divisor, `billableWeight`, `excessLb`, right-sized
  weight at −1"/−2", recoverable $/mo, girth and threshold flags; plus `recoverableAnnual`,
  `structuralAnnual` (residential + DAS), `negotiationLeverDelta`
  (divisor 139→166 vs a 4% base-rate discount)
- **Fixture (carton 18/14/12, 9.2 lb, 50% share):** DIM 22 lb @139 / 19 @166 / 17 @180 · excess 12 lb ·
  $8.16/parcel · **$61,200/mo excess (not all recoverable)** · 166 recovers **$183,600/yr** ·
  +2" height cut @166 recovers **$367,200/yr** · girth 70" → **no AHS, no large-package trigger** ·
  structural: residential $61,425/mo, DAS $16,170/mo
- **KPIs:** `Recoverable $/yr` · `Excess billed lb` · `Structural surcharge $/yr`
- **Canvas:** 3-bar matrix per carton (actual / DIM@139 / optimised@166−2"), plus the negotiation-lever
  comparison.
- **Refuses:** labelling excess billed weight as leakage; a right-sizing saving when the new height is
  below the tallest stacked item (needs a contents-height input or a stated ceiling); any surcharge
  claim without printing `EFFECTIVE_FROM`.
- **Corrected in build:** carton C (12×10×8) does *not* bill at scale weight — 960 in³ is 6.9 lb at 139,
  so it bills 7 lb against a 3.1 lb scale weight. The scale-weight case needed a dense carton (6×6×6 at
  12 lb), which is now a fixture.
- **PRO bridge:** ParcelProof — every tracking number, not three box averages.
- **Related article:** `parcelproof-stop-bleeding-28-on-carrier-invoices`, then `fuel-surcharge-peg-mpg-audit`.

---

## 5. Wave 4 — integration and the copy sweep

1. **Register** all five in `src/lib/calculators/metadata.ts` (slug, title, href, status, accent,
   domainCategory, outputType, iconType, utility, description, 5 keywords, category). This alone wires
   `/tools/`, `ToolRail`, JSON-LD and the sitemap.
2. **Fix the counts:** `src/pages/tools/index.astro` H1 ("Two engines…") + meta description,
   `ToolRail.astro` docstring, `ProductCTA.astro` ("Both engines on this site stay free") →
   property-accurate wording that survives the lexicon (`seven engines`, or drop the number entirely —
   preferred, since the next engine then costs nothing).
3. **Index grouping:** `/tools/` cards group by `domainCategory` (Compute · Agentic · Supply Chain ·
   Logistics · Warehouse) once there are seven.
4. **Verify routes:** add the five paths to `ROUTES` in `scripts/verify.mjs`; add no redirects (the
   slugs are new).
5. **Related articles:** one `fetchPostBySlug` per page into the `aside` slot, plus the existing
   `RelatedArticleCard` pattern; all ten cross-linked slugs listed in §4 are present in
   `ownership.generated.mjs` today — a foreign slug 404s on this property, so re-check after any
   ownership re-sync.
6. **Product CTA:** extend `BY_CATEGORY`/`BY_SLUG` in `src/lib/product-cta.ts` only where the mapping
   is honest (§4 bridges); write the `why` line for each.
7. **Copy pass:** every new page through `npm run copy:check` with zero warnings (no `unlock`,
   `comprehensive`, `streamline`, `solutions`; ≤32 words per sentence; first sentence carries the
   number).
8. **Docs:** link this plan from `README.md` (tools section) after the wave closes.

### Wave 4 exit gate

```bash
npm run check && npm run check:engines && npm run build
npm run verify -- https://aichieve.net   # after deploy: seven tool routes 200
npm run audit:contrast --all             # zero regressions across the new pages
npm run audit:layout 390 /tools/agentic-workflow-breakeven/ /tools/parcel-dim-weight/
```

---

## 6. Files likely to change

**Shipped (wave 0 + pilot)**

```
src/lib/calculators/engineTypes.ts          shared verdict / refusal / assumption contract
src/lib/calculators/assumptions2026.ts      dated CBP, carrier and Z-table constants
src/lib/calculators/agenticBreakeven.ts     engine A  ✅  page shipped
src/lib/calculators/slottingPayback.ts      engine B
src/lib/calculators/inventoryAccuracy.ts    engine C
src/lib/calculators/landedCost.ts           engine D
src/lib/calculators/parcelDim.ts            engine E
src/components/calculators/react/primitives/useUrlState.ts
src/components/calculators/react/primitives/Fields.tsx        NumberField, SelectField, SegmentedField, Group
src/components/calculators/react/primitives/KpiStrip.tsx      KpiStrip, Verdict, Refusals, ProBridge, ResetButton
src/components/calculators/react/primitives/Charts.tsx        ChartFrame, BreakevenChart, BarRows
src/components/calculators/react/primitives/EngineLayout.tsx  35/65 frame + .engine scope
src/components/calculators/react/AgenticBreakevenCalculator.tsx
src/pages/tools/agentic-workflow-breakeven.astro
scripts/check-engines.mjs
```

Four primitives in one `Fields.tsx` and three chart parts in one `Charts.tsx` rather than the one-file-per-
component split this plan proposed: they share the plate markup and the row geometry, and splitting them
would have duplicated it. `page` files for engines B–E are the remaining wave-1/2/3 work.

**Modify**

```
src/lib/calculators/metadata.ts        engine A registered ✅ (B–E outstanding); docstring still says "two engines"
src/lib/calculators/format.ts          usd, usdCompact, pct, num, years, months ✅
src/styles/aichieve.css                §8 `.engine` layer ✅
src/lib/product-cta.ts                 five honest bridges — outstanding
src/pages/tools/index.astro            H1, meta description, domain grouping — outstanding
src/components/ToolRail.astro          docstring, "free engines" count — outstanding
src/components/ProductCTA.astro        "Both engines" line — outstanding
scripts/verify.mjs                     five routes — outstanding
package.json                           check:engines ✅, prebuild chain ✅
README.md                              tools section — outstanding
```

---

## 7. Risks and open questions

1. **Repo choice.** The brief says aichieve.net; this plan assumes `AICHIEVE/`. If it was meant for
   giniloh.com, three of the five engines lose their PRO bridge and the plan needs a different shell
   (§2.1) — decide before wave 0.
2. **`k` in the IRA model is an assumption.** It drives an $11.1M headline. If the business wants a
   different convention (e.g. record error scaled by cycle-count frequency), that number moves by an
   order of magnitude. Agree the definition before the page ships.
3. **Carrier and duty constants are dated.** Everything in `assumptions2026.ts` must be re-verified
   against the current UPS/FedEx rate guides and CBP schedules at build time; the page prints the
   effective date so a stale table is visible rather than silent.
4. **Five engines is five islands.** Each adds ~15–25KB gzipped of React + component code. Mitigation:
   pure math modules keep the islands thin, `client:visible` for engines 2–5 if the layout audit shows
   a load regression, one vendor chunk (React) shared.
5. **URL state is a public API.** Once links are pasted into approval memos, key names cannot change
   without breaking them. Freeze the key list in wave 0 and treat renaming as a migration.
6. **The dark/light seam.** New engines render on the light bay; if a later redesign moves them to the
   dark console, every `--eng-*` token needs a second, measured value.

---

## Appendix — fixture ledger

| Engine | Output | Value | Expression |
| --- | --- | --- | --- |
| Agentic | manual/run | 13.50 | 18/60 × 45 |
| Agentic | compute/run | 0.0769 | 14,000/1e6 × 4.50 × 1.22 |
| Agentic | audit/run | 5.3333 | 0.25 × (8/60 × 160) |
| Agentic | rework/run | 3.8000 | 0.057 × (25/60 × 160) |
| Agentic | liability/run | 10.6875 | 0.057 × 0.75 × 250 |
| Agentic | agent total/run | 19.8977 | sum of four layers |
| Agentic | cliff | 3.18% | (13.50 − 0.077 − 5.333) / (66.667 + 187.5) |
| Slotting | current hours | 35,042 | 260 × 12,000 × 34.368 / (3600 × 0.85) |
| Slotting | slotting saving | 208,000 | (35,042 − 27,744) × 28.50 |
| Slotting | vendor payback | 3.13 y | 1.85M / (549,288 + 208,000 − 166,500) |
| Slotting | buyer payback | 9.93 y | (1.85M + 220,000) / (434,888 − 166,500 − 60,000) |
| IRA | σ_eff | 243.02 | √(130.90² + 204.75²) |
| IRA | dead cash | 11,066,900 | (399.75 − 215.30) × 2500 × 24 |
| IRA | phantom cost | 5,368,629 | 9,321 × 18 × 2 × 16 |
| TDC | duty + 301 + MPF | 4.0165 | 12.60 × (0.065 + 0.25 + 0.00125) + min(max(872.93, 32.71), 634.62)/20,000 |
| TDC | landed | 18.2047 | 11.50 + 1.10 + 4.0165 + 1.5882 |
| TDC | TDC | 23.6378 | 18.2047 + 0.6808 + 3.50 + 1.2523 |
| Parcel | DIM @139 | 22 lb | ⌈18×14×12 / 139⌉ |
| Parcel | recoverable @166 | 183,600 /yr | (22 − 19) × 0.68 × 7,500 × 12 |
| Parcel | recoverable @166 −2" | 367,200 /yr | (22 − 16) × 0.68 × 7,500 × 12 |
