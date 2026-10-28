/**
 * Inventory Record Accuracy — the dead cash in buffer stock nobody can see.
 *
 * THE QUESTION
 * Safety stock is sized against demand and lead-time variance. It is almost never sized against the
 * variance of the *records* the replenishment system reads, so a 65%-wrong bin count becomes buffer
 * stock that exists only to cover the difference between the ERP and the shelf.
 *
 * THE CORRECTION THIS ENGINE MAKES TO ITS BRIEF
 * The brief's third variance term was `velocity × inaccuracyRate`, which mixes a rate with a rate
 * and contributes 0.5σ against a 131σ baseline — a rounding error dressed as a finding. The record
 * error here is an absolute quantity: a share of mean on-hand units, spread by `recordErrorSpread`.
 * At the defaults that term is the difference between $52k and $11.1m of working capital, so the
 * definition is printed on the page rather than buried.
 *
 * WHAT IT REFUSES
 * · dead cash without printing mean on-hand per SKU and the spread constant it was built from;
 * · a phantom-stockout cost that treats every unit as a lost sale (the brief's formula implied 36% of
 *   units, which is not a stockout model);
 * · a safety stock figure from a service level the table does not carry.
 */
import { AUDITED_RECORD_ACCURACY, SERVICE_LEVEL_Z, zForServiceLevel } from './assumptions2026.ts';
import type { EngineResultBase, EngineVerdict } from './engineTypes.ts';

export interface InventoryAccuracyState {
	activeSkuCount: number;
	avgUnitCost: number;
	avgUnitMargin: number;
	avgDailyDemandPerSku: number;
	demandStdDev: number;
	supplierLeadTimeDays: number;
	leadTimeStdDevDays: number;
	erpRecordInaccuracyRate: number;
	phantomOverstatementShare: number;
	targetServiceLevel: number;
	annualHoldingCostRate: number;
	/** Days between a phantom stockout and someone noticing at the pick face. */
	daysToDetectPhantom: number;
	/**
	 * Spread of the record error as a share of mean on-hand units. 0.5 = uniform misstatement
	 * between zero and twice the error; it is an assumption, not a measurement.
	 */
	recordErrorSpread: number;
}

export const DEFAULT_INVENTORY_ACCURACY_STATE: InventoryAccuracyState = {
	activeSkuCount: 2_500,
	avgUnitCost: 24,
	avgUnitMargin: 16,
	avgDailyDemandPerSku: 18,
	demandStdDev: 6,
	supplierLeadTimeDays: 35,
	leadTimeStdDevDays: 7,
	erpRecordInaccuracyRate: 0.65,
	phantomOverstatementShare: 0.55,
	targetServiceLevel: 0.95,
	annualHoldingCostRate: 0.22,
	daysToDetectPhantom: 2,
	recordErrorSpread: 0.5
};

export interface ServiceLevelPoint {
	level: number;
	label: string;
	/** Working capital at the current record accuracy. */
	workingCapitalCurrent: number;
	/** Working capital at an audited baseline. */
	workingCapitalAudited: number;
}

export interface InventoryAccuracyResult extends EngineResultBase {
	meanOnHandPerSku: number;
	sigmaBase: number;
	sigmaRecord: number;
	sigmaEffective: number;
	z: number;
	safetyStockClean: number;
	safetyStockWithInaccuracy: number;
	extraUnitsPerSku: number;
	deadCash: number;
	annualHoldingCost: number;
	phantomEventsPerYear: number;
	phantomLostMargin: number;
	curve: ServiceLevelPoint[];
	serviceLevels: readonly { level: number; z: number; label: string }[];
}

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(finite(value), min), max);

export function computeInventoryAccuracy(input: InventoryAccuracyState): InventoryAccuracyResult {
	const state: InventoryAccuracyState = {
		...DEFAULT_INVENTORY_ACCURACY_STATE,
		...input,
		activeSkuCount: Math.max(0, finite(input.activeSkuCount)),
		avgUnitCost: Math.max(0, finite(input.avgUnitCost)),
		avgUnitMargin: Math.max(0, finite(input.avgUnitMargin)),
		avgDailyDemandPerSku: Math.max(0, finite(input.avgDailyDemandPerSku)),
		demandStdDev: Math.max(0, finite(input.demandStdDev)),
		supplierLeadTimeDays: clamp(input.supplierLeadTimeDays, 1, 365),
		leadTimeStdDevDays: Math.max(0, finite(input.leadTimeStdDevDays)),
		erpRecordInaccuracyRate: clamp(input.erpRecordInaccuracyRate, 0, 1),
		phantomOverstatementShare: clamp(input.phantomOverstatementShare, 0, 1),
		targetServiceLevel: clamp(input.targetServiceLevel, 0.5, 0.9999),
		annualHoldingCostRate: clamp(input.annualHoldingCostRate, 0, 1),
		daysToDetectPhantom: Math.max(0, finite(input.daysToDetectPhantom)),
		recordErrorSpread: clamp(input.recordErrorSpread, 0, 3)
	};

	const meanOnHand = state.avgDailyDemandPerSku * state.supplierLeadTimeDays;
	const sigmaBase = Math.sqrt(
		state.supplierLeadTimeDays * state.demandStdDev ** 2 +
			state.avgDailyDemandPerSku ** 2 * state.leadTimeStdDevDays ** 2
	);
	const sigmaRecord = state.erpRecordInaccuracyRate * meanOnHand * state.recordErrorSpread;
	const sigmaEffective = Math.sqrt(sigmaBase ** 2 + sigmaRecord ** 2);

	const z = zForServiceLevel(state.targetServiceLevel);
	const ssClean = z * sigmaBase;
	const ssWith = z * sigmaEffective;
	const extraUnits = ssWith - ssClean;
	const deadCash = extraUnits * state.activeSkuCount * state.avgUnitCost;

	const cyclesPerYear = 365 / state.supplierLeadTimeDays;
	const phantomEvents = state.activeSkuCount * cyclesPerYear * state.erpRecordInaccuracyRate * state.phantomOverstatementShare;
	const phantomLost = phantomEvents * state.avgDailyDemandPerSku * state.daysToDetectPhantom * state.avgUnitMargin;

	const auditedSigmaRecord = AUDITED_RECORD_ACCURACY * meanOnHand * state.recordErrorSpread;
	const auditedSigma = Math.sqrt(sigmaBase ** 2 + auditedSigmaRecord ** 2);
	const curve: ServiceLevelPoint[] = SERVICE_LEVEL_Z.map((row) => ({
		level: row.level,
		label: row.label,
		workingCapitalCurrent: row.z * sigmaEffective * state.activeSkuCount * state.avgUnitCost,
		workingCapitalAudited: row.z * auditedSigma * state.activeSkuCount * state.avgUnitCost
	}));

	const refusals: string[] = [
		`Record error is modelled as ${(state.recordErrorSpread * 100).toFixed(0)}% of mean on-hand (${Math.round(meanOnHand)} units per SKU at these inputs). It is an assumption about how the error is spread, not a measurement.`
	];
	if (state.erpRecordInaccuracyRate >= 1) {
		refusals.push('Every record mismatching the shelf makes the record term the whole model: the demand and lead-time variances stop mattering.');
	}
	if (state.daysToDetectPhantom < 1) {
		refusals.push('A detection time under one day prices phantom stockouts at zero margin loss, which no pick-face process achieves.');
	}
	refusals.push(
		'Dead cash is working capital tied up, not a one-off release. It is recovered once, and the holding cost is what it costs every year until the records are fixed.'
	);

	return {
		meanOnHandPerSku: meanOnHand,
		sigmaBase,
		sigmaRecord,
		sigmaEffective,
		z,
		safetyStockClean: ssClean,
		safetyStockWithInaccuracy: ssWith,
		extraUnitsPerSku: extraUnits,
		deadCash,
		annualHoldingCost: deadCash * state.annualHoldingCostRate,
		phantomEventsPerYear: phantomEvents,
		phantomLostMargin: phantomLost,
		curve,
		serviceLevels: SERVICE_LEVEL_Z,
		verdict: buildVerdict({ state, extraUnits, deadCash, annualHolding: deadCash * state.annualHoldingCostRate, phantomLost, sigmaBase, sigmaEffective }),
		refusals
	};
}

function buildVerdict(args: {
	state: InventoryAccuracyState;
	extraUnits: number;
	deadCash: number;
	annualHolding: number;
	phantomLost: number;
	sigmaBase: number;
	sigmaEffective: number;
}): EngineVerdict {
	const { state, extraUnits, deadCash, annualHolding, phantomLost, sigmaBase, sigmaEffective } = args;
	const usd = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;
	const millions = (value: number) =>
		Math.abs(value) >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}m` : usd(value);

	if (extraUnits <= 0.5) {
		return {
			tone: 'base',
			call: 'Records are accurate enough',
			headline: `Record error adds ${extraUnits.toFixed(1)} units of buffer stock per SKU at these inputs.`,
			body: `Demand and lead-time variance already dominate at ${sigmaBase.toFixed(1)} units of standard deviation.`
		};
	}

	return {
		tone: 'erosion',
		call: 'Buffer stock against a data error',
		headline: `${Math.round(extraUnits)} extra units per SKU is ${millions(deadCash)} of working capital covering a record, not a demand.`,
		body: `Record error widens the effective deviation from ${sigmaBase.toFixed(1)} to ${sigmaEffective.toFixed(1)} units. It costs ${millions(annualHolding)} a year to hold, and the pick face loses ${millions(phantomLost)} of margin while the ERP says the stock is there.`
	};
}
