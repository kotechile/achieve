/**
 * The standard engines' regression gate.
 *
 * WHY THIS EXISTS
 * These five modules are the only copy of the arithmetic behind five public pages. A changed constant,
 * a reordered term or a "small" rounding fix silently changes what the site tells someone who is about
 * to sign a freight contract. The fixtures below were computed from the published brief's own defaults
 * and then corrected where the brief's arithmetic did not reproduce (see docs/standard-engines-plan.md
 * §2.2); each is a known answer, so a drift fails here instead of shipping.
 *
 * Every row also asserts an invariant that must hold at any input — a cost that rises with failure, a
 * structural surcharge that never enters the recoverable total, a payback that can never be shorter on
 * the buyer's baseline than on the vendor's.
 *
 * Run: npm run check:engines      (Node >=22.6 strips the TypeScript types natively — no deps)
 */
import {
	DEFAULT_AGENTIC_BREAKEVEN_STATE,
	computeAgenticBreakeven
} from '../src/lib/calculators/agenticBreakeven.ts';
import {
	DEFAULT_SLOTTING_PAYBACK_STATE,
	computeSlottingPayback
} from '../src/lib/calculators/slottingPayback.ts';
import {
	DEFAULT_INVENTORY_ACCURACY_STATE,
	computeInventoryAccuracy
} from '../src/lib/calculators/inventoryAccuracy.ts';
import {
	DEFAULT_LANDED_COST_STATE,
	computeLandedCost
} from '../src/lib/calculators/landedCost.ts';
import {
	DEFAULT_PARCEL_DIM_STATE,
	computeParcelDim
} from '../src/lib/calculators/parcelDim.ts';

let failures = 0;
let checks = 0;

const check = (label, actual, expected, tol = 0) => {
	checks++;
	const ok =
		typeof expected === 'number'
			? Number.isFinite(actual) && (tol > 0 ? Math.abs(actual - expected) <= tol : actual === expected)
			: actual === expected;
	if (!ok) {
		failures++;
		console.log(`FAIL ${label}: expected ${expected}${tol ? ` ±${tol}` : ''}, got ${actual}`);
	}
};

const money = (value) => Number(value.toFixed(4));

/* ── Agentic Workflow Breakeven ────────────────────────────────────────────────────────────── */
// Manual 18 min at $45/hr = $13.50. Compute 14k tokens at $4.50/1M with a 22% retry = $0.0769.
// Audit 25% of runs at 8 min and $160/hr = $5.3333. Rework 5.7% at 25 min = $3.8000.
// Liability 5.7% escaped (75% unreviewed) at $250 = $10.6875. All-in $19.8977 vs $13.50 manual.
const agentic = computeAgenticBreakeven(DEFAULT_AGENTIC_BREAKEVEN_STATE);
check('agentic manual/run', money(agentic.manualCostPerRun), 13.5);
check('agentic compute/run', money(agentic.computeCostPerRun), 0.0769, 0.0001);
check('agentic audit/run', money(agentic.auditCostPerRun), 5.3333, 0.0001);
check('agentic rework/run', money(agentic.reworkCostPerRun), 3.8, 0.0001);
check('agentic liability/run', money(agentic.liabilityCostPerRun), 10.6875, 0.0001);
check('agentic total/run', money(agentic.agentCostPerRun), 19.8977, 0.0002);
check('agentic delta/run', money(agentic.deltaPerRun), 6.3977, 0.0002);
check('agentic annual delta', Math.round(agentic.annualDelta), 159942, 1);
check('agentic cliff', money(agentic.verificationCliff * 100), 3.1832, 0.001);
check('agentic cliff status', agentic.cliffStatus, 'assumed-costlier');
check('agentic cost ratio', money(agentic.costRatio), 1.4738, 0.0002);
// The human layers are what the page is about: $19.82 of the $19.90 is not tokens.
check('agentic human share', money(agentic.humanCostPerRun), 19.8208, 0.0002);
check('agentic compute share of total', money(agentic.computeCostPerRun / agentic.agentCostPerRun), 0.00386, 0.0001);

// Invariants: cost is monotone in failure, the curve brackets the cliff, and the refusal states hold.
let monotone = true;
for (let i = 1; i < agentic.series.length; i++) {
	if (agentic.series[i].agentCostPerRun < agentic.series[i - 1].agentCostPerRun) monotone = false;
}
check('agentic cost rises with failure', monotone, true);
check('agentic curve covers 0-25%', agentic.series.length, 101);
check('agentic curve starts at 0%', agentic.series[0].failureRate, 0);
check('agentic curve ends at 25%', money(agentic.series[100].failureRate), 0.25);
check('agentic cliff is where curves cross', Math.abs(agentic.series.find((p) => p.agentCostPerRun >= p.manualCostPerRun).failureRate * 100 - agentic.verificationCliff * 100) < 0.3, true);

const noCliff = computeAgenticBreakeven({
	...DEFAULT_AGENTIC_BREAKEVEN_STATE,
	manualTimeMins: 1,
	avgTokensPerRun: 40_000
});
check('agentic no-cliff state', noCliff.cliffStatus, 'no-cliff');
check('agentic no-cliff prints null', noCliff.verificationCliff, null);
check('agentic no-cliff refuses', noCliff.refusals.length > 0, true);

const noCeiling = computeAgenticBreakeven({
	...DEFAULT_AGENTIC_BREAKEVEN_STATE,
	exceptionReworkTimeMins: 0,
	escapedDefectPenalty: 0
});
check('agentic no-upper-rate state', noCeiling.cliffStatus, 'undefined');
check('agentic no-upper-rate prints null', noCeiling.verificationCliff, null);

const zeroVolume = computeAgenticBreakeven({ ...DEFAULT_AGENTIC_BREAKEVEN_STATE, monthlyTaskVolume: 0 });
check('agentic zero volume is finite', Number.isFinite(zeroVolume.annualDelta), true);
check('agentic zero volume annual', zeroVolume.annualDelta, 0);

/* ── Warehouse Slotting & Automation Payback ───────────────────────────────────────────────── */
// 260 days × 12,000 lines × (12s pick + 85ft/3.8fps = 22.368s walk) / (3600 × 0.85) = 35,042 hours.
const slotting = computeSlottingPayback(DEFAULT_SLOTTING_PAYBACK_STATE);
check('slotting current hours', Math.round(slotting.current.annualHours), 35042, 1);
check('slotting seconds/line', money(slotting.current.secondsPerLine), 34.3684, 0.0001);
check('slotting current cost', Math.round(slotting.current.annualCost), 998706, 2);
check('slotting slotted seconds/line', money(slotting.slotted.secondsPerLine), 27.2105, 0.0001);
check('slotting slotted hours', Math.round(slotting.slotted.annualHours), 27744, 1);
check('slotting free recovery', Math.round(slotting.slottingSavingAnnual), 208000, 2);
check('slotting automation saving', Math.round(slotting.automationSavingAnnual), 434900, 60);
check('slotting AMC', Math.round(slotting.annualMaintenanceCost), 166500, 1);
check('slotting vendor payback', money(slotting.vendorPaybackYears), 3.1314, 0.005);
check('slotting buyer payback', money(slotting.buyerPaybackYears), 9.9317, 0.01);
check('slotting miles/day', money(slotting.current.pickerMilesPerDay), 193.1818, 0.001);
check('slotting slotted miles/day', money(slotting.slotted.pickerMilesPerDay), 131.3636, 0.001);

// The whole point: the vendor's number is shorter because the same walk seconds are paid for twice.
check('slotting double count', Math.round(slotting.doubleCountedAnnual), 114376, 60);
check('slotting vendor claim is larger', slotting.vendorClaimedSavingAnnual > slotting.slottingSavingAnnual + slotting.automationSavingAnnual, true);
check('slotting buyer >= vendor', slotting.buyerPaybackYears >= slotting.vendorPaybackYears, true);
check('slotting savings are not additive', slotting.vendorClaimedSavingAnnual - slotting.annualMaintenanceCost > slotting.automationSavingAnnual - slotting.annualMaintenanceCost, true);

const noPayback = computeSlottingPayback({
	...DEFAULT_SLOTTING_PAYBACK_STATE,
	automationThroughputGainPct: 0.02,
	annualDowntimeCost: 300_000
});
check('slotting no-payback refused', noPayback.buyerPaybackYears, null);
check('slotting no-payback says so', noPayback.refusals.some((line) => line.includes('does not pay back')), true);

const zeroCapex = computeSlottingPayback({ ...DEFAULT_SLOTTING_PAYBACK_STATE, proposedAutomationCapex: 0 });
check('slotting zero capex is finite', Number.isFinite(zeroCapex.slottingSavingAnnual), true);

/* ── Inventory Record Accuracy ─────────────────────────────────────────────────────────────── */
// σ_base = √(35×36 + 18²×49) = 130.90. Mean on-hand = 18 × 35 = 630 units.
// σ_record = 0.65 × 630 × 0.5 = 204.75. σ_eff = √(130.90² + 204.75²) = 243.02.
// SS at Z=1.6449: 215.3 clean vs 399.7 with the records as they are.
const inventory = computeInventoryAccuracy(DEFAULT_INVENTORY_ACCURACY_STATE);
check('ira mean on-hand', money(inventory.meanOnHandPerSku), 630);
check('ira sigma base', money(inventory.sigmaBase), 130.9049, 0.001);
check('ira sigma record', money(inventory.sigmaRecord), 204.75, 0.001);
check('ira sigma effective', money(inventory.sigmaEffective), 243.0197, 0.001);
check('ira z', money(inventory.z), 1.6449);
check('ira ss clean', money(inventory.safetyStockClean), 215.3, 0.1);
check('ira ss with record error', money(inventory.safetyStockWithInaccuracy), 399.75, 0.2);
check('ira extra units', money(inventory.extraUnitsPerSku), 184.45, 0.2);
check('ira dead cash', Math.round(inventory.deadCash), 11_066_900, 5000);
check('ira holding cost', Math.round(inventory.annualHoldingCost), 2_434_700, 2000);
check('ira phantom events', Math.round(inventory.phantomEventsPerYear), 9321, 2);
check('ira phantom margin', Math.round(inventory.phantomLostMargin), 5_368_900, 3000);

// Invariants: the record term only ever adds buffer, and working capital rises with service level.
check('ira record term widens sigma', inventory.sigmaEffective > inventory.sigmaBase, true);
check('ira extra units positive', inventory.extraUnitsPerSku > 0, true);
let wcMonotone = true;
for (let i = 1; i < inventory.curve.length; i++) {
	if (inventory.curve[i].workingCapitalCurrent < inventory.curve[i - 1].workingCapitalCurrent) wcMonotone = false;
	if (inventory.curve[i].workingCapitalCurrent < inventory.curve[i].workingCapitalAudited) wcMonotone = false;
}
check('ira working capital monotone', wcMonotone, true);
check('ira curve has five service levels', inventory.curve.length, 5);
check('ira prints the spread assumption', inventory.refusals.some((line) => line.includes('mean on-hand')), true);

const cleanRecords = computeInventoryAccuracy({
	...DEFAULT_INVENTORY_ACCURACY_STATE,
	erpRecordInaccuracyRate: 0.05
});
check('ira clean records shrink buffer', cleanRecords.extraUnitsPerSku < inventory.extraUnitsPerSku, true);
check('ira clean records still positive', cleanRecords.extraUnitsPerSku >= 0, true);

/* ── Total Delivered Cost ──────────────────────────────────────────────────────────────────── */
// Assist $22,000/20,000 = $1.10. Customs value $12.60. Duty 6.5% + 25% + 0.4714% = $4.0284.
// Freight ($4,800 + $1,200)/68 CBM = $88.24/CBM × 0.018 = $1.5882. Landed $18.2166.
// Carrying at 13% over 105 days = $0.6813. Cost-to-serve $3.50 + RMA $1.2525.
const landed = computeLandedCost(DEFAULT_LANDED_COST_STATE);
check('tdc assist/unit', money(landed.customsAssistPerUnit), 1.1);
check('tdc duty base', money(landed.dutyBase), 12.6);
check('tdc duty charged', money(landed.dutyCharged), 4.0165, 0.0002);
check('tdc freight per cbm', money(landed.freightPerCbm), 88.2353, 0.0001);
check('tdc freight/unit', money(landed.freightPerUnit), 1.5882, 0.0001);
check('tdc landed', money(landed.landedCost), 18.2047, 0.0001);
check('tdc carrying', money(landed.carryingCost), 0.6808, 0.0002);
check('tdc carrying days', landed.carryingDays, 105);
check('tdc returns', money(landed.returnsCost), 1.2523, 0.0002);
check('tdc cost to serve', money(landed.costToServe), 4.7523, 0.0002);
check('tdc total', money(landed.tdc), 23.6378, 0.0003);
check('tdc contribution', money(landed.contribution), 21.3622, 0.0003);
check('tdc contribution pct', money(landed.contributionPct), 47.4715, 0.002);
check('tdc duty share', money(landed.dutyShareOfTdc), 16.9918, 0.002);
check('tdc freight basis', landed.freightBasis, 'cube');
check('tdc units per container', landed.unitsPerContainer, 3777);
check('tdc waterfall steps', landed.steps.length, 8);
check('tdc waterfall lands on contribution', money(landed.steps[landed.steps.length - 1].running), 21.3622, 0.0003);

// Invariants: a punitive tariff must reduce contribution; a dutiable assist must raise duty.
const noTariff = computeLandedCost({ ...DEFAULT_LANDED_COST_STATE, punitiveTariffRate: 0 });
check('tdc tariff removal raises contribution', noTariff.contribution > landed.contribution, true);
check('tdc tariff removal drops duty', noTariff.dutyCharged < landed.dutyCharged, true);

const noAssist = computeLandedCost({ ...DEFAULT_LANDED_COST_STATE, offshoreToolingValue: 0 });
check('tdc assist removal drops duty', noAssist.dutyCharged < landed.dutyCharged, true);
check('tdc assist removal drops landed', noAssist.landedCost < landed.landedCost, true);

// CIF: freight is inside the price, so it is stripped from the duty base and not charged twice.
const cif = computeLandedCost({ ...DEFAULT_LANDED_COST_STATE, incoterm: 'CIF' });
check('tdc cif freight line suppressed', cif.freightPerUnit, 0);
check('tdc cif duty base lower', cif.dutyBase < landed.dutyBase, true);
check('tdc cif says so', cif.refusals.some((line) => line.includes('CIF')), true);

// EXW: the origin inland leg is dutiable, so duty rises on the same goods.
const exw = computeLandedCost({ ...DEFAULT_LANDED_COST_STATE, incoterm: 'EXW' });
check('tdc exw duty rises', exw.dutyCharged > landed.dutyCharged, true);
check('tdc exw landed rises', exw.landedCost > landed.landedCost, true);

// MPF is per entry, with a floor and a ceiling — and the two bind in opposite directions.
// One unit per entry: $0.04 of ad-valorem MPF, so the $32.71 floor is charged instead.
const smallEntry = computeLandedCost({ ...DEFAULT_LANDED_COST_STATE, unitsPerEntry: 1 });
check('tdc mpf floor flagged', smallEntry.mpfFloorBinding, true);
check('tdc mpf floor not capped', smallEntry.mpfCapBinding, false);
check('tdc mpf floor charged', money(smallEntry.mpfPerUnit), 32.71, 0.0001);
check('tdc mpf floor refusal', smallEntry.refusals.some((line) => line.includes('floor')), true);

// The default 20,000-unit entry is the opposite case: $872.93 of ad-valorem MPF, capped at $634.62.
check('tdc mpf default is capped', landed.mpfCapBinding, true);
check('tdc mpf default not floored', landed.mpfFloorBinding, false);
check('tdc mpf per entry', Math.round(landed.mpfPerEntry), 873, 1);
check('tdc mpf per unit after cap', landed.mpfPerUnit, 0.031731, 0.000001);
check('tdc mpf cap refusal names the cap', landed.refusals.some((line) => line.includes('capped at')), true);
check('tdc mpf refusal is not the floor', landed.refusals.some((line) => line.includes('floor')), false);

// A mid-sized entry sits between the two bounds and is charged the plain ad-valorem rate.
const midEntry = computeLandedCost({ ...DEFAULT_LANDED_COST_STATE, unitsPerEntry: 2000 });
check('tdc mpf mid entry uncapped', midEntry.mpfCapBinding, false);
check('tdc mpf mid entry unfloored', midEntry.mpfFloorBinding, false);
check('tdc mpf mid entry is ad valorem', money(midEntry.mpfPerUnit), money(12.6 * 0.003464), 0.000001);
check('tdc mpf mid entry says nothing', midEntry.refusals.some((line) => line.includes('MPF')), false);

/* ── Parcel DIM Weight ────────────────────────────────────────────────────────────────────── */
// Carton A: 18×14×12 = 3,024 in³ / 139 = 21.76 → 22 lb billed against 9.2 lb scale weight.
const parcel = computeParcelDim(DEFAULT_PARCEL_DIM_STATE);
const cartonA = parcel.cartons[0];
check('parcel carton A dim @139', cartonA.dimWeightCurrent, 22);
check('parcel carton A dim @166', cartonA.dimWeightTarget, 19);
check('parcel carton A right-sized @166', cartonA.dimWeightRightSized, 16);
check('parcel carton A actual billed', cartonA.actualWeightBilled, 10);
check('parcel carton A excess lb', cartonA.excessLbBilled, 12);
check('parcel carton A girth', cartonA.girthInches, 70);
check('parcel carton A no AHS', cartonA.flags.ahsDimension, false);
check('parcel carton A no large package', cartonA.flags.largePackage, false);
check('parcel carton A divisor saving/parcel', money(cartonA.savingFromDivisorPerParcel), 2.04, 0.0001);
check('parcel carton A right-size saving/parcel', money(cartonA.savingFromRightSizePerParcel), 4.08, 0.0001);
check('parcel carton A divisor annual', Math.round(cartonA.monthlySavingDivisor * 12), 183600, 1);
check('parcel carton A right-size annual', Math.round(cartonA.monthlySavingRightSize * 12), 367200, 1);
check('parcel monthly parcels', Math.round(parcel.cartons.reduce((sum, c) => sum + c.monthlyParcels, 0)), 15000);
check('parcel structural monthly', Math.round(parcel.structuralMonthly), 77595, 2);
check('parcel effective date printed', Boolean(parcel.effectiveFrom), true);

// Carton B (24×18×16 = 6,912 in³) bills 50 lb at 139 — over the AHS-weight line, under both girth clamps.
check('parcel carton B girth', parcel.cartons[1].girthInches, 92);
// Carton C is small but still bills on cube: 12x10x8 = 960 in3 / 139 = 6.9 -> 7 lb against 3.1 lb actual.
const cartonC = parcel.cartons[2];
check('parcel carton C bills on cube', cartonC.billableCurrent, 7);
check('parcel carton C excess lb', cartonC.excessLbBilled, 3);

// A small, dense carton is the mirror case and must bill at scale weight, not cube.
const dense = computeParcelDim({
	...DEFAULT_PARCEL_DIM_STATE,
	cartons: [{ id: 'dense', name: 'Dense block', lengthInches: 6, widthInches: 6, heightInches: 6, actualWeightLbs: 12, volumeSharePct: 1 }]
});
check('parcel dense carton bills scale weight', dense.cartons[0].billableCurrent, 12);
check('parcel dense carton no excess', dense.cartons[0].excessLbBilled, 0);
check('parcel dense carton saves nothing', dense.recoverableRightSizeAnnual, 0);

// Invariants that keep the page honest.
check('parcel structural never recoverable', parcel.recoverableRightSizeAnnual < parcel.excessWeightAnnual, true);
check('parcel divisor run <= right-size run', parcel.recoverableDivisorAnnual <= parcel.recoverableRightSizeAnnual, true);
check('parcel refuses to call excess leakage', parcel.refusals.some((line) => line.includes('not a billing error')), true);

// A carton past 165" of length-plus-girth has to raise the Large Package flag.
const bigCarton = computeParcelDim({
	...DEFAULT_PARCEL_DIM_STATE,
	cartons: [{ id: 'oversize', name: 'Oversize', lengthInches: 60, widthInches: 30, heightInches: 30, actualWeightLbs: 40, volumeSharePct: 1 }]
});
check('parcel oversize large-package flag', bigCarton.cartons[0].flags.largePackage, true);
check('parcel oversize refusal', bigCarton.refusals.some((line) => line.includes('Large Package')), true);

// A divisor below today's published rate cannot save anything.
const reverseDivisor = computeParcelDim({
	...DEFAULT_PARCEL_DIM_STATE,
	currentDimDivisor: 166,
	targetNegotiatedDivisor: 139
});
check('parcel reverse divisor saves nothing', reverseDivisor.recoverableDivisorAnnual, 0);
check('parcel reverse divisor refused', reverseDivisor.refusals.some((line) => line.includes('no carrier agrees')), true);

// Exclusions are part of the contract for engines that declare them: a list that silently empties would
// leave the page claiming a precision the model does not have.
const tdcExcluded = landed.excluded ?? [];
check('tdc declares exclusions', tdcExcluded.length >= 5, true);
check(
	'tdc exclusions name a system of record',
	tdcExcluded.every((item) => /ERP|TMS|ledger|broker|bank|customs entry/.test(item.why)),
	true
);
check(
	'tdc exclusions are labelled and explained',
	tdcExcluded.every((item) => item.label.length > 3 && item.why.length > 20),
	true
);

/* ── every engine returns the shared contract ─────────────────────────────────────────────── */
const engines = { agentic, slotting, inventory, landed, parcel };
for (const [name, result] of Object.entries(engines)) {
	check(`${name} verdict tone`, ['base', 'friction', 'erosion', 'positive'].includes(result.verdict.tone), true);
	check(`${name} verdict headline`, result.verdict.headline.length > 20, true);
	check(`${name} refusals declared`, Array.isArray(result.refusals), true);
	check(`${name} no NaN in verdict`, !/NaN|Infinity|undefined/.test(JSON.stringify(result.verdict)), true);
}

console.log(
	failures === 0
		? `Standard engines: ${checks} assertions across 5 engines match the 2026 fixture vector.`
		: `Standard engines: ${failures} of ${checks} assertions FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
