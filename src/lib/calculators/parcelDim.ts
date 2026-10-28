/**
 * Parcel DIM-Weight — what the box costs because of its cube.
 *
 * THE QUESTION
 * A carrier bills the greater of scale weight and dimensional weight. A box that is 40% air is billed as
 * if it were heavy, and the divisor in that arithmetic is the only part of the bill a shipper can
 * negotiate. This engine prices three states per carton: billed today, billed at a negotiated divisor,
 * billed at the negotiated divisor and a smaller box.
 *
 * THE HONESTY RULE
 * Excess billed pounds are not leakage. Carriers are entitled to bill DIM weight; a right-sized box
 * saves money because it stops being a 22 lb parcel, not because the carrier overcharged. So the
 * recoverable figure is what a smaller box or a better divisor would actually change, and the
 * residential and delivery-area surcharges — which no carton change unlocks — are reported separately
 * and never added to the same total.
 *
 * WHAT IT REFUSES
 * · summing structural surcharges into "recoverable";
 * · a large-package cliff warning on a carton that does not reach the threshold (130" girth is
 *   Additional Handling, not Large Package);
 * · a right-sizing saving when the reduced height would not clear the contents — the figure is a
 *   ceiling and says so;
 * · any surcharge claim without printing the rate guide's effective date.
 */
import { CARRIER, carrierAssumptions } from './assumptions2026.ts';
import type { AssumptionLine, EngineResultBase, EngineVerdict } from './engineTypes.ts';

export interface CartonProfile {
	id: string;
	name: string;
	lengthInches: number;
	widthInches: number;
	heightInches: number;
	actualWeightLbs: number;
	/** Share of monthly parcels shipped in this carton. */
	volumeSharePct: number;
}

export interface ParcelDimState {
	monthlyShipmentVolume: number;
	currentDimDivisor: number;
	targetNegotiatedDivisor: number;
	incrementalRatePerLb: number;
	baseRatePerParcel: number;
	residentialSharePct: number;
	residentialSurcharge: number;
	deliveryAreaSurchargePct: number;
	dasFeeAvg: number;
	/** Height removed from each carton when it is right-sized. */
	cartonHeightReductionInches: number;
	cartons: CartonProfile[];
}

export const DEFAULT_PARCEL_DIM_STATE: ParcelDimState = {
	monthlyShipmentVolume: 15_000,
	currentDimDivisor: CARRIER.DIM_DIVISOR_PUBLISHED,
	targetNegotiatedDivisor: CARRIER.DIM_DIVISOR_NEGOTIATED,
	incrementalRatePerLb: 0.68,
	baseRatePerParcel: 9.4,
	residentialSharePct: 0.7,
	residentialSurcharge: 5.85,
	deliveryAreaSurchargePct: 0.22,
	dasFeeAvg: 4.9,
	cartonHeightReductionInches: 2,
	cartons: [
		{ id: 'carton-a', name: 'Master carton A', lengthInches: 18, widthInches: 14, heightInches: 12, actualWeightLbs: 9.2, volumeSharePct: 0.5 },
		{ id: 'carton-b', name: 'Master carton B', lengthInches: 24, widthInches: 18, heightInches: 16, actualWeightLbs: 18.4, volumeSharePct: 0.3 },
		{ id: 'carton-c', name: 'Master carton C', lengthInches: 12, widthInches: 10, heightInches: 8, actualWeightLbs: 3.1, volumeSharePct: 0.2 }
	]
};

export interface CartonResult {
	id: string;
	name: string;
	dimWeightCurrent: number;
	dimWeightTarget: number;
	dimWeightRightSized: number;
	actualWeightBilled: number;
	billableCurrent: number;
	billableTarget: number;
	billableRightSized: number;
	excessLbBilled: number;
	girthInches: number;
	/** True when a smaller box is needed to reach the target billable weight's saving. */
	savingFromDivisorPerParcel: number;
	savingFromRightSizePerParcel: number;
	monthlyParcels: number;
	monthlySavingDivisor: number;
	monthlySavingRightSize: number;
	flags: {
		ahsDimension: boolean;
		largePackage: boolean;
		ahsWeight: boolean;
	};
}

export interface ParcelDimResult extends EngineResultBase {
	cartons: CartonResult[];
	/** Annual money a negotiated divisor alone recovers. */
	recoverableDivisorAnnual: number;
	/** Annual money the divisor plus a smaller box recovers. */
	recoverableRightSizeAnnual: number;
	/** Annual excess-weight cost that is a carrier rule, not an error. */
	excessWeightAnnual: number;
	structuralAnnual: number;
	structuralMonthly: number;
	/** Divisor lever vs a 4% across-the-board base-rate discount, per parcel. */
	negotiationLevers: {
		divisorPerParcel: number;
		baseDiscountPerParcel: number;
		winner: 'divisor' | 'discount' | 'tie';
	};
	assumptions: AssumptionLine[];
	effectiveFrom: string;
}

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(finite(value), min), max);
const ceil = (value: number) => Math.ceil(value - 1e-9);

/** Dim weight with each dimension rounded up to the next whole inch, per carrier measurement. */
export function dimWeight(length: number, width: number, height: number, divisor: number): number {
	if (divisor <= 0) return 0;
	return ceil((ceil(length) * ceil(width) * ceil(height)) / divisor);
}

export function computeParcelDim(input: ParcelDimState): ParcelDimResult {
	const state: ParcelDimState = {
		...DEFAULT_PARCEL_DIM_STATE,
		...input,
		monthlyShipmentVolume: Math.max(0, finite(input.monthlyShipmentVolume)),
		currentDimDivisor: clamp(input.currentDimDivisor, 90, 400),
		targetNegotiatedDivisor: clamp(input.targetNegotiatedDivisor, 90, 400),
		incrementalRatePerLb: Math.max(0, finite(input.incrementalRatePerLb)),
		baseRatePerParcel: Math.max(0, finite(input.baseRatePerParcel)),
		residentialSharePct: clamp(input.residentialSharePct, 0, 1),
		residentialSurcharge: Math.max(0, finite(input.residentialSurcharge)),
		deliveryAreaSurchargePct: clamp(input.deliveryAreaSurchargePct, 0, 1),
		dasFeeAvg: Math.max(0, finite(input.dasFeeAvg)),
		cartonHeightReductionInches: clamp(input.cartonHeightReductionInches, 0, 12),
		cartons: input.cartons?.length ? input.cartons : DEFAULT_PARCEL_DIM_STATE.cartons
	};

	const shareTotal = state.cartons.reduce((sum, carton) => sum + clamp(carton.volumeSharePct, 0, 1), 0);

	const cartons: CartonResult[] = state.cartons.map((carton) => {
		const actualBilled = Math.max(1, ceil(carton.actualWeightLbs));
		const current = dimWeight(carton.lengthInches, carton.widthInches, carton.heightInches, state.currentDimDivisor);
		const target = dimWeight(carton.lengthInches, carton.widthInches, carton.heightInches, state.targetNegotiatedDivisor);
		const reducedHeight = Math.max(1, carton.heightInches - state.cartonHeightReductionInches);
		const rightSized = dimWeight(carton.lengthInches, carton.widthInches, reducedHeight, state.targetNegotiatedDivisor);

		const billableCurrent = Math.max(actualBilled, current);
		const billableTarget = Math.max(actualBilled, target);
		const billableRightSized = Math.max(actualBilled, rightSized);

		// Normalise the carton's share so an unsplit mix still prices the whole volume.
		const share = shareTotal > 0 ? clamp(carton.volumeSharePct, 0, 1) / shareTotal : 1 / state.cartons.length;
		const monthlyParcels = state.monthlyShipmentVolume * share;

		const savingDivisor = Math.max(0, billableCurrent - billableTarget) * state.incrementalRatePerLb;
		const savingRightSize = Math.max(0, billableCurrent - billableRightSized) * state.incrementalRatePerLb;

		const girth = carton.lengthInches + 2 * (carton.widthInches + carton.heightInches);

		return {
			id: carton.id,
			name: carton.name,
			dimWeightCurrent: current,
			dimWeightTarget: target,
			dimWeightRightSized: rightSized,
			actualWeightBilled: actualBilled,
			billableCurrent,
			billableTarget,
			billableRightSized,
			excessLbBilled: Math.max(0, billableCurrent - actualBilled),
			girthInches: girth,
			savingFromDivisorPerParcel: savingDivisor,
			savingFromRightSizePerParcel: savingRightSize,
			monthlyParcels,
			monthlySavingDivisor: savingDivisor * monthlyParcels,
			monthlySavingRightSize: savingRightSize * monthlyParcels,
			flags: {
				ahsDimension: girth > CARRIER.AHS_DIMENSION_GIRTH_IN,
				largePackage:
					girth > CARRIER.LARGE_PACKAGE_GIRTH_IN ||
					carton.lengthInches > CARRIER.LARGE_PACKAGE_LENGTH_IN,
				ahsWeight: carton.actualWeightLbs > CARRIER.AHS_WEIGHT_LB
			}
		};
	});

	const recoverableDivisorAnnual = cartons.reduce((sum, c) => sum + c.monthlySavingDivisor, 0) * 12;
	const recoverableRightSizeAnnual = cartons.reduce((sum, c) => sum + c.monthlySavingRightSize, 0) * 12;
	const excessWeightAnnual =
		cartons.reduce((sum, c) => sum + c.excessLbBilled * state.incrementalRatePerLb * c.monthlyParcels, 0) * 12;

	const structuralMonthly =
		state.monthlyShipmentVolume * state.residentialSharePct * state.residentialSurcharge +
		state.monthlyShipmentVolume * state.deliveryAreaSurchargePct * state.dasFeeAvg;

	// Weighted per-parcel levers, so the comparison is against the same mix the rest of the page prices.
	const weighted = (pick: (carton: CartonResult) => number) =>
		cartons.reduce((sum, carton) => sum + pick(carton) * (state.monthlyShipmentVolume > 0 ? carton.monthlyParcels / state.monthlyShipmentVolume : 0), 0);
	const divisorLever = weighted((carton) => carton.savingFromDivisorPerParcel);
	const discountLever = state.baseRatePerParcel * 0.04;

	const refusals: string[] = [
		`Excess billed pounds are the carrier's rule, not a billing error. ${usd(excessWeightAnnual)} a year of it is priced at today's box, and only the divisor and right-sizing lines are recoverable.`
	];
	refusals.push(
		`Residential and delivery-area surcharges (${usd(structuralMonthly)} a month) are structural. No carton or contract term in this model removes them.`
	);
	if (state.cartonHeightReductionInches > 0) {
		refusals.push(
			`The right-sizing saving assumes ${state.cartonHeightReductionInches}" can come out of the box and the contents still fit. It is a ceiling, not a specification.`
		);
	}
	if (state.targetNegotiatedDivisor < state.currentDimDivisor) {
		refusals.push('The target divisor is below today\'s published rate, which no carrier agrees to: the saving is shown as zero.');
	}
	if (cartons.some((carton) => carton.flags.largePackage)) {
		refusals.push(
			`At least one carton is past ${CARRIER.LARGE_PACKAGE_GIRTH_IN}" of length-plus-girth or ${CARRIER.LARGE_PACKAGE_LENGTH_IN}" of length, so it carries a Large Package charge on top of DIM weight.`
		);
	}

	return {
		cartons,
		recoverableDivisorAnnual,
		recoverableRightSizeAnnual,
		excessWeightAnnual,
		structuralAnnual: structuralMonthly * 12,
		structuralMonthly,
		negotiationLevers: {
			divisorPerParcel: divisorLever,
			baseDiscountPerParcel: discountLever,
			winner: Math.abs(divisorLever - discountLever) < 0.005 ? 'tie' : divisorLever > discountLever ? 'divisor' : 'discount'
		},
		assumptions: carrierAssumptions(),
		effectiveFrom: carrierAssumptions()[0].effectiveFrom,
		verdict: buildVerdict({ state, cartons, recoverableDivisorAnnual, recoverableRightSizeAnnual, structuralMonthly, excessWeightAnnual }),
		refusals
	};
}

const usd = (value: number) => `$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;

function buildVerdict(args: {
	state: ParcelDimState;
	cartons: CartonResult[];
	recoverableDivisorAnnual: number;
	recoverableRightSizeAnnual: number;
	structuralMonthly: number;
	excessWeightAnnual: number;
}): EngineVerdict {
	const { state, cartons, recoverableDivisorAnnual, recoverableRightSizeAnnual, structuralMonthly, excessWeightAnnual } = args;
	const worst = [...cartons].sort((a, b) => b.excessLbBilled - a.excessLbBilled)[0];

	if (recoverableRightSizeAnnual <= 0) {
		return {
			tone: 'positive',
			call: 'Nothing to recover',
			headline: 'Every carton already bills at its scale weight, so the divisor is not costing anything.',
			body: `The parcel mix still carries ${usd(structuralMonthly)} a month of residential and delivery-area surcharges, which no box change touches.`
		};
	}

	return {
		tone: 'friction',
		call: 'Recoverable by contract and carton',
		headline: `${usd(recoverableRightSizeAnnual)} a year comes back from the divisor and a smaller box, against ${usd(excessWeightAnnual)} billed on cube alone.`,
		body: `${worst.name} is the worst offender: ${worst.excessLbBilled} lb of air per parcel, billed at ${worst.billableCurrent} lb against a scale weight of ${worst.actualWeightBilled} lb. A divisor move to ${state.targetNegotiatedDivisor} alone returns ${usd(recoverableDivisorAnnual)}.`
	};
}
