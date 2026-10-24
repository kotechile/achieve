# GPU TCO Analyzer — 2026 valuation refresh

Source: *Comprehensive Valuation and Architectural Pricing Analysis Across GPU Market Tiers* (attached
report, Oct 2026). Every figure below is traceable to that document; nothing is re-estimated silently.
Unsupported values carry an explicit note in the UI (`marketNote`) or are dropped from the model.

## What the report changes about the model

1. **Street price, not MSRP.** Consumer add-in cards average ~28% above MSRP, with the RTX 5090 at
   +125% to +367%. The analyzer previously carried list prices, which understates owned cost across
   the whole consumer tier.
2. **Recurring software licensing is a first-class owned cost.** NVIDIA AI Enterprise is $4,500 per
   GPU per year at list, $3,825 / $3,375 / $2,925 at 100–500 / 500–2,000 / 2,000+ GPU volume. Over a
   five-year horizon $22,500–$25,243 per GPU matches the purchase price of an L40S or MI300X. The
   engine had no licensing line at all.
3. **Certified / data-center parts are priced per accelerator, not per box.** An 8-GPU HGX node bills
   8 licences. The model needs an accelerator count per entry.
4. **Warranty and facility costs are real.** Extended 3-year OEM coverage runs ~8% of system purchase
   price; rack commissioning is $4,950–$7,500. Maintenance was hardcoded at 5%/yr with no input.
5. **Cloud has a licensing surcharge too.** Hyperscalers add $1.00/GPU-hour for NVAIE consumption.
6. **AMD and Intel enterprise silicon is a live arbitrage.** MI300X 8-GPU nodes list at $249,999 and
   Gaudi 3 8-chip kits at $125,000, against $215,000–$285,000 for 8× H100. The accelerator list had
   no AMD or Intel data-center entries, so the comparison the report calls the central one was
   impossible to run.

## Scope

| Change | File |
| --- | --- |
| Hardware list repriced to 2026 street values; VRAM bandwidth, MSRP, vendor, GPU count per entry | `src/components/calculators/react/LocalVsCloudGpuCalculator.tsx` |
| New owned-cost inputs: NVAIE toggle + volume tier, maintenance %, rack commissioning, cloud NVAIE surcharge | same |
| Receipt, verdict metrics, break-even series now include licensing and commissioning | same |
| FAQ + model-logic copy reflect the licensing and commissioning lines | `src/pages/tools/gpu-compute.astro`, `src/lib/calculators/metadata.ts` |

Out of scope: cloud provider rate cards (unchanged), DLC retrofit capex (not quantified in the report
beyond "substantial"), and the 8-GPU-node parity claim at 60% utilisation over 18 months, which is a
narrative benchmark rather than a modelled output.

## Data

Consumer (street, MSRP): Arc B570 260/219, Arc B580 310/249, RTX 5050 305/249, RTX 5060 450/299,
RX 9060 XT 460/349, RTX 5060 Ti 16GB 730/429, RX 9070 635/549, RTX 5070 805/549, RX 9070 XT 895/599,
RTX 5070 Ti 1,100/749, RTX 5080 1,550/999, RTX 5090 4,700/1,999, used 3090 699.

Prosumer: DGX Spark 64GB 4,999, DGX Spark 128GB 6,950 (launch 3,999), Strix Halo mini PC 3,099,
Mac Studio M5 Ultra 96GB 5,499, dual RTX 5080 rig 3,500 (MSRP 1,998), single RTX 5090 rig 4,700.

Certified workstation (street): A400 220, A1000 620, W7500 458, RTX 4000 Ada 1,940, PRO 2000 1,820,
W7800 2,360, PRO 4000 3,430, RTX 5000 Ada 4,700, W7900 4,140, PRO 4500 5,090, RTX 6000 Ada 8,000,
PRO 5000 8,980, PRO 6000 16,000 (launch 8,565, +87%).

Data center: L40S 11,250, H100 PCIe 28,500, H200 NVL 31,500, B200 SXM 35,000, MI300X 17,500,
MI325X 20,500, Gaudi 3 14,000; nodes 8× H100 250,000, 4× H200 177,500, 8× H200 337,500,
8× B200 515,000, DGX B300 325,000, 8× MI300X 249,999, 8× MI325X 262,500, 8-chip Gaudi 3 125,000,
4× L40S 45,000.

## Verification

`npm run copy:check` (gated on every build), `npm run check`, `npm run build`. Numbers spot-checked
against the report's own arithmetic (e.g. 8 × $22,500 = $180,000 NVAIE over five years).

## Visual pass (same change set)

The engine had drifted away from the console it is mounted in: soft shadows, rounded-xl
everything, cyan as both accent and data series, and an emoji in front of every card heading.
The pass below keeps the light "readout in a dark rack" surface and tightens the vocabulary.

- **Chrome** — shadows removed, radii stepped down, hairline `#E3E3E7` borders, invalid Tailwind
  classes (`border-gray-250`, `text-cyan-650`) replaced with real values.
- **Card headings** — emoji swapped for Lucide icons in a bottom-ruled instrument strip with mono
  caps, matching the shell's `INSTRUMENT PANEL` strip. All four cards share that one header voice.
- **Type** — micro-labels are 10px mono caps with `0.14em` tracking; control labels are 13px
  semibold in `#3F3F46`; every number is `tabular-nums` so receipt columns line up.
- **Colour semantics** — ink `#111114` owns every interactive surface (segments, buttons, sliders,
  checkboxes); signal amber is reserved for focus rings and the horizon chip; emerald marks owned
  cost, cyan is now only the rental data series in the chart. Neon `drop-shadow` glows off.
- **Controls** — the range thumb is drawn, and the native input rides above it invisibly, because
  the site's global sheet repaints `::-webkit-slider-thumb` with `!important`.
- **Readout** — the receipt gains a **cost composition bar** (hardware / licences / power /
  maintenance / capital), which is the line that makes the licensing argument visible at a glance.
- **Mobile** — the comparison status bar stacks instead of overflowing; 390px has no horizontal
  scroll.

## Air + answer-first pass

Two problems the screenshots made obvious: the instrument bay had **zero inner padding**, so every
card sat on the panel border, and the verdict was buried under the receipt where nobody scrolls.

- The bay is padded (`px-5 py-7` → `px-8 py-10` from `sm`), cards moved to `p-6/p-7` with `space-y-7`,
  sub-cards to `p-5/p-6`, column gap to `lg:gap-10`, chart section to `sm:p-8 lg:p-10`.
- **Verdict banner** now opens the tool: the delta as a 40px number, one sentence of why, two
  same-scale bars (owned vs rented over the horizon, emerald vs cyan to match the chart legend),
  and `$/hr` both ways plus the street premium. Answer first, controls second.
- The Evaluation Horizon chip collided with its label; that row wraps and the chip is `shrink-0`.
- Selected segment/button states carry an ink border so active vs idle is unambiguous.
