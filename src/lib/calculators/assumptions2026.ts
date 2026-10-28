/**
 * The dated constants the standard engines run on.
 *
 * WHY ONE FILE
 * These are the only inputs on the site that go stale without anyone touching the code: an MPF
 * floor, a carrier's published DIM divisor, a Section 301 rate. Scattered through five components
 * they age silently. Here they age in one place with a date attached, and every engine that uses
 * one prints `EFFECTIVE_FROM` beside it.
 *
 * WHAT IS NOT VERIFIED
 * The values below reproduce the model this site publishes and the rates published for the period
 * named. They are NOT a substitute for the current CBP schedule or a carrier's rate guide at the
 * moment a real invoice is disputed — that is the paid apps' job, and each engine's PRO bridge says
 * so. Re-verify before quoting a page to anyone who is about to sign something.
 */
import type { AssumptionLine } from './engineTypes';

/** The date the figures below were read. Printed by every engine that uses them. */
export const EFFECTIVE_FROM = '2026-01-01';

/**
 * US customs fees on a formal entry.
 *
 * MPF is ad valorem with a floor and a ceiling per entry — the floor is what bites on small
 * entries, and it is why a per-unit model must know how many units share an entry.
 * HMF applies to ocean cargo only.
 */
export const CBP = {
	MPF_RATE: 0.003464,
	MPF_MIN_PER_ENTRY: 32.71,
	MPF_MAX_PER_ENTRY: 634.62,
	HMF_RATE: 0.00125,
	/** Default punitive rate used when the page is opened: Section 301 List 3/4A territory. */
	SECTION_301_DEFAULT_RATE: 0.25
} as const;

/** Combined ad-valorem add-on the TDC engine applies: MPF + HMF = 0.4714%. */
export const MPF_HMF_COMBINED = CBP.MPF_RATE + CBP.HMF_RATE;

/**
 * Carrier billing rules for parcel.
 *
 * The divisor is the whole argument: 139 is the published daily rate at UPS and FedEx, USPS bills
 * at 166, and a negotiated contract moves the number without changing the box. Girth thresholds are
 * per carrier rule, and the two thresholds are NOT the same charge — 130" triggers Additional
 * Handling (dimension), while Large Package starts at 165" of length-plus-girth or 96" of length.
 */
export const CARRIER = {
	DIM_DIVISOR_PUBLISHED: 139,
	DIM_DIVISOR_USPS: 166,
	DIM_DIVISOR_NEGOTIATED: 166,
	DIM_DIVISOR_CEILING: 180,
	/** Length + 2(W + H) above this is billed as Additional Handling — Dimension. */
	AHS_DIMENSION_GIRTH_IN: 130,
	/** Length + 2(W + H) above this, or length above 96", is billed as Large Package. */
	LARGE_PACKAGE_GIRTH_IN: 165,
	LARGE_PACKAGE_LENGTH_IN: 96,
	/** Actual weight above this is billed as Additional Handling — Weight. */
	AHS_WEIGHT_LB: 50,
	/** 40HQ usable cube and the payload a 40HQ can actually carry on US roads. */
	CONTAINER_40HQ_CBM: 68,
	CONTAINER_40HQ_PAYLOAD_KG: 19_500
} as const;

/**
 * Service-level Z values at full precision.
 *
 * The brief for these engines quoted 1.28 / 1.65 / 1.96 / 2.33 in one place and 1.645 / 2.326 in
 * another. Rounded to two decimals a safety-stock figure moves by a couple of percent, which is
 * several thousand units at 2,500 SKUs — so the table is the source, and no page hardcodes a Z.
 */
export const SERVICE_LEVEL_Z = [
	{ level: 0.9, z: 1.2816, label: '90%' },
	{ level: 0.95, z: 1.6449, label: '95%' },
	{ level: 0.975, z: 1.96, label: '97.5%' },
	{ level: 0.99, z: 2.3263, label: '99%' },
	{ level: 0.995, z: 2.5758, label: '99.5%' }
] as const;

export function zForServiceLevel(level: number): number {
	let closest: { level: number; z: number; label: string } = SERVICE_LEVEL_Z[0];
	for (const row of SERVICE_LEVEL_Z) {
		if (Math.abs(row.level - level) < Math.abs(closest.level - level)) closest = row;
	}
	return closest.z;
}

/** The audited-baseline accuracy every inventory engine compares against. */
export const AUDITED_RECORD_ACCURACY = 0.05;

export function agenticAssumptions(): AssumptionLine[] {
	return [
		{
			label: 'HITL audit and rework are priced at one senior rate',
			value: 'reviewer rate from your inputs',
			source: 'the model charges every human minute at the reviewer rate',
			effectiveFrom: EFFECTIVE_FROM
		}
	];
}

export function customsAssumptions(): AssumptionLine[] {
	return [
		{
			label: 'Merchandise Processing Fee + Harbor Maintenance Fee',
			value: '0.3464% + 0.125%',
			source: 'CBP formal-entry fees; MPF carries a per-entry floor and ceiling',
			effectiveFrom: EFFECTIVE_FROM
		},
		{
			label: 'Duty base',
			value: 'FOB + dutiable assists',
			source: 'US transaction value excludes international freight',
			effectiveFrom: EFFECTIVE_FROM
		}
	];
}

export function carrierAssumptions(): AssumptionLine[] {
	return [
		{
			label: 'DIM divisor, published daily rate',
			value: String(CARRIER.DIM_DIVISOR_PUBLISHED),
			source: 'UPS / FedEx published rates; USPS bills at 166',
			effectiveFrom: EFFECTIVE_FROM
		},
		{
			label: 'Additional Handling (dimension) threshold',
			value: `length + 2(W+H) > ${CARRIER.AHS_DIMENSION_GIRTH_IN}"`,
			source: 'carrier service guide; Large Package starts at 165" girth or 96" length',
			effectiveFrom: EFFECTIVE_FROM
		}
	];
}
