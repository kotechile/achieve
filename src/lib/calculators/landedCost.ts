/**
 * Total Delivered Cost — the price-to-contribution waterfall.
 *
 * THE QUESTION
 * A selling price is compared against a unit cost. Between them sit four layers the purchase order
 * never shows: the customs assist (an offshore tool paid for once and dutiable on every unit), the
 * tariff stack on the duty base, the freight that is billed by cube, and the capital tied up while the
 * container is on the water. Then returns and cost-to-serve take their share of the selling price.
 *
 * THE TRAP THIS ENGINE EXISTS TO SHOW
 * Tooling amortisation. A mould paid for offshore is part of the dutiable value of every unit it
 * produces, so a $22,000 tool over 20,000 units adds $1.10 to the duty base of each one — and the
 * tariff is charged on that $1.10 as well.
 *
 * INCOTERMS ARE NOT COSMETIC
 * · FOB — the price is the goods at the port of export. Ocean freight is added here, and excluded from
 *   the duty base, because US transaction value excludes international freight.
 * · EXW — the importer also pays the inland leg in the country of origin, which IS dutiable, so it is
 *   added to both landed cost and the duty base.
 * · CIF — the invoice already contains freight, so freight is stripped out of the duty base and the
 *   separate freight line is suppressed instead of charged twice.
 * · DDP is deliberately not offered: a delivered price already contains the freight and duty this tool
 *   exists to itemise, and decomposing it would require the seller's cost stack.
 *
 * WHAT IT REFUSES
 * · a contribution figure when any duty layer is zero-by-omission rather than zero-by-input;
 * · a per-unit MPF below the per-entry floor without saying so;
 * · a duty base built on freight without saying which way the incoterm moved it.
 */
import { CBP, MPF_HMF_COMBINED, customsAssumptions } from './assumptions2026.ts';
import type { AssumptionLine, EngineResultBase, EngineVerdict, ExcludedItem } from './engineTypes.ts';

export type Incoterm = 'FOB' | 'EXW' | 'CIF';

export interface LandedCostState {
	sellingPrice: number;
	unitFobCost: number;
	offshoreToolingValue: number;
	amortizedProductionRun: number;
	incoterm: Incoterm;
	baseDutyRate: number;
	punitiveTariffRate: number;
	unitCartonCbm: number;
	unitWeightKg: number;
	containerFreightRate40HQ: number;
	emergencySurchargePer40HQ: number;
	containerCapacityCbm: number;
	containerPayloadKg: number;
	waccRate: number;
	shrinkInsuranceRate: number;
	daysSalesOfInventory: number;
	daysInTransit: number;
	pickPackCost: number;
	paymentTermsDiscountRate: number;
	rmaReturnRate: number;
	reverseLogisticsCost: number;
	rmaWriteoffRate: number;
	unitsPerEntry: number;
	/** Only used under EXW: the inland leg in the country of origin, dutiable. */
	foreignInlandFreightPerUnit: number;
}

export const DEFAULT_LANDED_COST_STATE: LandedCostState = {
	sellingPrice: 45,
	unitFobCost: 11.5,
	offshoreToolingValue: 22_000,
	amortizedProductionRun: 20_000,
	incoterm: 'FOB',
	baseDutyRate: 0.065,
	punitiveTariffRate: CBP.SECTION_301_DEFAULT_RATE,
	unitCartonCbm: 0.018,
	unitWeightKg: 0.9,
	containerFreightRate40HQ: 4_800,
	emergencySurchargePer40HQ: 1_200,
	containerCapacityCbm: 68,
	containerPayloadKg: 19_500,
	waccRate: 0.11,
	shrinkInsuranceRate: 0.02,
	daysSalesOfInventory: 75,
	daysInTransit: 30,
	pickPackCost: 3.5,
	paymentTermsDiscountRate: 0,
	rmaReturnRate: 0.06,
	reverseLogisticsCost: 14.5,
	rmaWriteoffRate: 0.35,
	unitsPerEntry: 20_000,
	foreignInlandFreightPerUnit: 0.85
};

export type WaterfallTone = 'base' | 'friction' | 'erosion' | 'positive';

export interface WaterfallStep {
	id: string;
	label: string;
	/** Signed contribution to cost. Positive values step down from the selling price. */
	amount: number;
	running: number;
	tone: WaterfallTone;
}

/**
 * What this calculator does not answer, because the answer lives in a system it does not read.
 *
 * Every line is a figure a buyer will assume is in the total — "duty drawback", "what we actually paid
 * for freight" — and every one needs the ERP, the TMS, the broker's entry file or the bank. Naming the
 * system is the point: it tells the reader which team to ask and stops the model being credited with a
 * precision it does not have.
 */
export const LANDED_COST_EXCLUDED: ExcludedItem[] = [
	{
		label: 'Duty drawback and refunds',
		why: 'Recovering duty on re-exported goods needs entry summaries and proof of export, which sit in the ERP and with the broker.'
	},
	{
		label: 'Freight as actually invoiced',
		why: 'This prices a per-CBM average. Per-shipment freight, detention and demurrage are billed later and live in the TMS and the payables ledger.'
	},
	{
		label: 'Exchange rate at settlement',
		why: 'One currency and one rate. The purchase-order rate against the rate the bank settled is a treasury figure, not a model input.'
	},
	{
		label: 'Days of stock actually held',
		why: 'Stock days are typed in from your own knowledge. Real turns by SKU come from the inventory ledger, and they are rarely the number a buyer guesses.'
	},
	{
		label: 'Duty by classification line',
		why: 'One blended rate is applied to the whole unit. Per-HTS rates, exclusions and Chapter 99 treatment live on the customs entry itself.'
	},
	{
		label: 'Returns and write-offs per SKU',
		why: 'A single return rate is applied. RMA actuals, refurbishment cost and write-off approvals are recorded in the ERP after the fact.'
	},
	{
		label: 'Payment terms as cash',
		why: 'The early-payment discount is priced. Days payable, and what the cash conversion cycle does to funding, are ledger figures.'
	}
];

export interface LandedCostResult extends EngineResultBase {
	customsAssistPerUnit: number;
	dutyBase: number;
	dutyCharged: number;
	freightPerUnit: number;
	freightPerCbm: number;
	landedCost: number;
	carryingCost: number;
	carryingDays: number;
	costToServe: number;
	returnsCost: number;
	paymentTermsCost: number;
	tdc: number;
	contribution: number;
	contributionPct: number;
	dutyShareOfTdc: number;
	/** Which container limit binds first at these inputs. */
	freightBasis: 'cube' | 'weight';
	unitsPerContainer: number;
	mpfPerUnit: number;
	mpfFloorBinding: boolean;
	steps: WaterfallStep[];
	assumptions: AssumptionLine[];
}

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(finite(value), min), max);

export function computeLandedCost(input: LandedCostState): LandedCostResult {
	const state: LandedCostState = {
		...DEFAULT_LANDED_COST_STATE,
		...input,
		sellingPrice: Math.max(0, finite(input.sellingPrice)),
		unitFobCost: Math.max(0, finite(input.unitFobCost)),
		offshoreToolingValue: Math.max(0, finite(input.offshoreToolingValue)),
		amortizedProductionRun: Math.max(1, finite(input.amortizedProductionRun, 1)),
		baseDutyRate: clamp(input.baseDutyRate, 0, 5),
		punitiveTariffRate: clamp(input.punitiveTariffRate, 0, 5),
		unitCartonCbm: Math.max(0, finite(input.unitCartonCbm)),
		unitWeightKg: Math.max(0, finite(input.unitWeightKg)),
		containerFreightRate40HQ: Math.max(0, finite(input.containerFreightRate40HQ)),
		emergencySurchargePer40HQ: Math.max(0, finite(input.emergencySurchargePer40HQ)),
		containerCapacityCbm: Math.max(1, finite(input.containerCapacityCbm, 68)),
		containerPayloadKg: Math.max(1, finite(input.containerPayloadKg, 19_500)),
		waccRate: clamp(input.waccRate, 0, 1),
		shrinkInsuranceRate: clamp(input.shrinkInsuranceRate, 0, 1),
		daysSalesOfInventory: clamp(input.daysSalesOfInventory, 0, 365),
		daysInTransit: clamp(input.daysInTransit, 0, 180),
		pickPackCost: Math.max(0, finite(input.pickPackCost)),
		paymentTermsDiscountRate: clamp(input.paymentTermsDiscountRate, 0, 0.5),
		rmaReturnRate: clamp(input.rmaReturnRate, 0, 1),
		reverseLogisticsCost: Math.max(0, finite(input.reverseLogisticsCost)),
		rmaWriteoffRate: clamp(input.rmaWriteoffRate, 0, 1),
		unitsPerEntry: Math.max(1, finite(input.unitsPerEntry, 1)),
		foreignInlandFreightPerUnit: Math.max(0, finite(input.foreignInlandFreightPerUnit))
	};

	const assist = state.offshoreToolingValue / state.amortizedProductionRun;
	const freightPerCbm = (state.containerFreightRate40HQ + state.emergencySurchargePer40HQ) / state.containerCapacityCbm;
	const freightPerUnit = state.unitCartonCbm * freightPerCbm;
	const inland = state.incoterm === 'EXW' ? state.foreignInlandFreightPerUnit : 0;

	// Duty base: FOB + dutiable assist + (EXW inland). CIF freight is stripped back out of the price.
	const dutyBase =
		state.incoterm === 'CIF'
			? Math.max(0, state.unitFobCost - freightPerUnit) + assist
			: state.unitFobCost + assist + inland;

	const dutyCharged = dutyBase * (state.baseDutyRate + state.punitiveTariffRate + MPF_HMF_COMBINED);
	const mpfPerUnit = (dutyBase * CBP.MPF_RATE) / state.unitsPerEntry;
	const mpfFloorBinding = mpfPerUnit < CBP.MPF_MIN_PER_ENTRY / state.unitsPerEntry;

	// Landed cost: freight is already inside a CIF price, so it is not charged again.
	const freightLine = state.incoterm === 'CIF' ? 0 : freightPerUnit;
	const landedCost = state.unitFobCost + assist + inland + dutyCharged + freightLine;

	const carryingDays = state.daysSalesOfInventory + state.daysInTransit;
	const carryingCost = landedCost * ((state.waccRate + state.shrinkInsuranceRate) / 365) * carryingDays;
	const paymentTermsCost = state.sellingPrice * state.paymentTermsDiscountRate;
	const returnsCost =
		state.rmaReturnRate * (state.reverseLogisticsCost + landedCost * state.rmaWriteoffRate);
	const costToServe = state.pickPackCost + paymentTermsCost + returnsCost;

	const tdc = landedCost + carryingCost + costToServe;
	const contribution = state.sellingPrice - tdc;
	const contributionPct = state.sellingPrice > 0 ? (contribution / state.sellingPrice) * 100 : 0;

	const unitsByCube = state.unitCartonCbm > 0 ? state.containerCapacityCbm / state.unitCartonCbm : Number.POSITIVE_INFINITY;
	const unitsByWeight = state.unitWeightKg > 0 ? state.containerPayloadKg / state.unitWeightKg : Number.POSITIVE_INFINITY;
	const freightBasis: 'cube' | 'weight' = unitsByCube <= unitsByWeight ? 'cube' : 'weight';
	const unitsPerContainer = Math.floor(Math.min(unitsByCube, unitsByWeight));

	const steps = buildSteps({
		sellingPrice: state.sellingPrice,
		unitFobCost: state.unitFobCost,
		assist,
		inland,
		dutyCharged,
		freightLine,
		carryingCost,
		pickPackCost: state.pickPackCost,
		paymentTermsCost,
		returnsCost
	});

	const refusals: string[] = [];
	if (state.incoterm === 'CIF') {
		refusals.push(
			'A CIF price already contains the ocean freight. The freight estimate is stripped out of the duty base instead of being charged a second time on the landed line.'
		);
	}
	if (state.incoterm === 'EXW') {
		refusals.push(
			'The EXW inland leg is dutiable. It is added to the duty base as well as to landed cost, because it is paid before the goods leave the origin country.'
		);
	}
	if (mpfFloorBinding) {
		refusals.push(
			`At ${state.unitsPerEntry.toLocaleString('en-US')} units per entry the ad-valorem MPF falls under the $${CBP.MPF_MIN_PER_ENTRY.toFixed(2)} per-entry floor, so this per-unit figure understates the fee.`
		);
	}
	if (state.punitiveTariffRate === 0) {
		refusals.push('No punitive tariff is applied. Duty is the base rate plus MPF and HMF only.');
	}
	refusals.push(
		'The model prices the goods, not the programme: duty drawback, first-sale valuation and Foreign Trade Zone treatment all change this figure and none is modelled.'
	);

	return {
		customsAssistPerUnit: assist,
		dutyBase,
		dutyCharged,
		freightPerUnit: freightLine,
		freightPerCbm,
		landedCost,
		carryingCost,
		carryingDays,
		costToServe,
		returnsCost,
		paymentTermsCost,
		tdc,
		contribution,
		contributionPct,
		dutyShareOfTdc: tdc > 0 ? (dutyCharged / tdc) * 100 : 0,
		freightBasis,
		unitsPerContainer,
		mpfPerUnit,
		mpfFloorBinding,
		steps,
		assumptions: customsAssumptions(),
		excluded: LANDED_COST_EXCLUDED,
		verdict: buildVerdict({ state, tdc, contribution, contributionPct, dutyCharged, assist }),
		refusals
	};
}

function buildSteps(args: {
	sellingPrice: number;
	unitFobCost: number;
	assist: number;
	inland: number;
	dutyCharged: number;
	freightLine: number;
	carryingCost: number;
	pickPackCost: number;
	paymentTermsCost: number;
	returnsCost: number;
}): WaterfallStep[] {
	const steps: WaterfallStep[] = [];
	let running = args.sellingPrice;
	const push = (id: string, label: string, amount: number, tone: WaterfallTone) => {
		running -= amount;
		steps.push({ id, label, amount, running, tone });
	};

	steps.push({ id: 'price', label: 'Selling price', amount: args.sellingPrice, running, tone: 'base' });
	push('fob', 'Goods at FOB', args.unitFobCost, 'base');
	if (args.assist > 0) push('assist', 'Customs assist', args.assist, 'friction');
	if (args.inland > 0) push('inland', 'Origin inland', args.inland, 'friction');
	push('duty', 'Duty + 301 + MPF/HMF', args.dutyCharged, 'friction');
	if (args.freightLine > 0) push('freight', 'Ocean freight', args.freightLine, 'friction');
	push('carrying', 'Capital while in transit', args.carryingCost, 'friction');
	push('pickpack', 'Pick, pack, payment terms', args.pickPackCost + args.paymentTermsCost, 'friction');
	push('returns', 'Returns and write-off', args.returnsCost, 'erosion');

	return steps;
}

function buildVerdict(args: {
	state: LandedCostState;
	tdc: number;
	contribution: number;
	contributionPct: number;
	dutyCharged: number;
	assist: number;
}): EngineVerdict {
	const { state, tdc, contribution, contributionPct, dutyCharged, assist } = args;
	const usd = (value: number) => `$${value.toFixed(2)}`;
	const pct = (value: number) => `${value.toFixed(1)}%`;

	if (contribution <= 0) {
		return {
			tone: 'erosion',
			call: 'No contribution',
			headline: `At ${usd(state.sellingPrice)} the unit returns ${usd(contribution)} after ${usd(tdc)} of delivered cost.`,
			body: `Duty and the customs assist alone are ${usd(dutyCharged + assist)} per unit. Nothing in the price covers the capital it takes to move it.`
		};
	}

	if (dutyCharged > state.unitFobCost * 0.3) {
		return {
			tone: 'friction',
			call: 'Duty is the second cost',
			headline: `Duty and fees cost ${usd(dutyCharged)} per unit against ${usd(state.unitFobCost)} of goods — ${pct((dutyCharged / tdc) * 100)} of delivered cost.`,
			body: `The customs assist adds ${usd(assist)} to the dutiable value of every unit, so the tariff is charged on the tool as well as the product. Contribution is ${usd(contribution)} (${pct(contributionPct)}).`
		};
	}

	return {
		tone: 'base',
		call: 'Delivered cost',
		headline: `The unit contributes ${usd(contribution)} (${pct(contributionPct)}) after ${usd(tdc)} of delivered cost.`,
		body: `Duty and fees are ${usd(dutyCharged)} of that, including ${usd(assist)} of amortised tooling inside the dutiable value.`
	};
}
