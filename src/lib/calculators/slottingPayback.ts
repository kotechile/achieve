/**
 * Warehouse Slotting & Automation Payback — the buyer-side re-run.
 *
 * THE QUESTION
 * A vendor quotes a payback on a goods-to-person system. The number that decides the deal is not
 * their payback, it is the payback on the labour that is left after the free fixes — because
 * re-slotting fast movers into the golden zone costs nothing and recovers walk time the automation
 * is being sold to recover.
 *
 * THE DOUBLE COUNT THIS ENGINE EXISTS TO BREAK
 * The published model adds `slotting saving + automation saving`, where each was measured against the
 * same unoptimised baseline. The walk seconds are then paid for twice, once by the rack layout and
 * again by the robot. Three scenarios are computed instead — current, slotted, slotted + automated —
 * and the automation saving is what is left between the last two.
 *
 * WHAT IT REFUSES
 * · a payback that leaves out the annual maintenance contract or the WMS integration;
 * · a payback when savings do not cover maintenance and downtime (the denominator is <= 0);
 * · any claim that the two savings stack.
 *
 * Payback is undiscounted and pre-tax: it answers "how long until the cash is back", not "what is the
 * IRR". Stated on the page rather than assumed.
 */
import type { EngineResultBase, EngineVerdict } from './engineTypes.ts';

export interface SlottingPaybackState {
	operatingDaysPerYear: number;
	dailyOrderLinesPicked: number;
	avgWalkFeetPerLine: number;
	pickerWalkSpeedFps: number;
	fixedPickTimeSecs: number;
	fullyLoadedWarehouseWage: number;
	/** Share of pick time lost to congestion and replenishment at the face. */
	utilisation: number;
	slottingWalkReductionPct: number;
	proposedAutomationCapex: number;
	wmsIntegrationCost: number;
	annualMaintenanceContractPct: number;
	automationThroughputGainPct: number;
	annualDowntimeCost: number;
}

export const DEFAULT_SLOTTING_PAYBACK_STATE: SlottingPaybackState = {
	operatingDaysPerYear: 260,
	dailyOrderLinesPicked: 12_000,
	avgWalkFeetPerLine: 85,
	pickerWalkSpeedFps: 3.8,
	fixedPickTimeSecs: 12,
	fullyLoadedWarehouseWage: 28.5,
	utilisation: 0.85,
	slottingWalkReductionPct: 0.32,
	proposedAutomationCapex: 1_850_000,
	wmsIntegrationCost: 220_000,
	annualMaintenanceContractPct: 0.09,
	automationThroughputGainPct: 0.55,
	annualDowntimeCost: 60_000
};

export interface LabourScenario {
	secondsPerLine: number;
	annualHours: number;
	annualCost: number;
	pickerMilesPerDay: number;
}

export interface SlottingPaybackResult extends EngineResultBase {
	current: LabourScenario;
	slotted: LabourScenario;
	automated: LabourScenario;
	/** Free recovery from re-slotting alone, measured against the current baseline. */
	slottingSavingAnnual: number;
	/** What the automation adds on top of the slotted layout, not on top of the original one. */
	automationSavingAnnual: number;
	/** What a vendor model claims: both savings measured from the same baseline. */
	vendorClaimedSavingAnnual: number;
	/** The seconds of walk recovered twice by that claim, in dollars per year. */
	doubleCountedAnnual: number;
	annualMaintenanceCost: number;
	/** CAPEX ÷ (vendor savings + slotting − AMC). */
	vendorPaybackYears: number | null;
	/** (CAPEX + WMS) ÷ (automation-only saving − AMC − downtime). */
	buyerPaybackYears: number | null;
	wmsIntegrationCost: number;
	annualDowntimeCost: number;
}

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(finite(value), min), max);

export function computeSlottingPayback(input: SlottingPaybackState): SlottingPaybackResult {
	const state: SlottingPaybackState = {
		...DEFAULT_SLOTTING_PAYBACK_STATE,
		...input,
		operatingDaysPerYear: clamp(input.operatingDaysPerYear, 0, 366),
		dailyOrderLinesPicked: Math.max(0, finite(input.dailyOrderLinesPicked)),
		avgWalkFeetPerLine: Math.max(0, finite(input.avgWalkFeetPerLine)),
		pickerWalkSpeedFps: clamp(input.pickerWalkSpeedFps, 0.1, 30),
		fixedPickTimeSecs: Math.max(0, finite(input.fixedPickTimeSecs)),
		fullyLoadedWarehouseWage: Math.max(0, finite(input.fullyLoadedWarehouseWage)),
		utilisation: clamp(input.utilisation, 0.4, 1),
		slottingWalkReductionPct: clamp(input.slottingWalkReductionPct, 0, 0.95),
		proposedAutomationCapex: Math.max(0, finite(input.proposedAutomationCapex)),
		wmsIntegrationCost: Math.max(0, finite(input.wmsIntegrationCost)),
		annualMaintenanceContractPct: clamp(input.annualMaintenanceContractPct, 0, 0.5),
		automationThroughputGainPct: clamp(input.automationThroughputGainPct, 0, 0.95),
		annualDowntimeCost: Math.max(0, finite(input.annualDowntimeCost))
	};

	const scenario = (secondsPerLine: number, feetPerLine: number): LabourScenario => {
		const annualHours =
			(state.operatingDaysPerYear * state.dailyOrderLinesPicked * secondsPerLine) /
			(3600 * state.utilisation);
		return {
			secondsPerLine,
			annualHours,
			annualCost: annualHours * state.fullyLoadedWarehouseWage,
			pickerMilesPerDay:
				(state.dailyOrderLinesPicked * feetPerLine) / 5280
		};
	};

	const pickSecs = (feetPerLine: number) => state.fixedPickTimeSecs + feetPerLine / state.pickerWalkSpeedFps;
	const slottedWalk = state.avgWalkFeetPerLine * (1 - state.slottingWalkReductionPct);

	const current = scenario(pickSecs(state.avgWalkFeetPerLine), state.avgWalkFeetPerLine);
	const slotted = scenario(pickSecs(slottedWalk), slottedWalk);
	const automated = scenario(pickSecs(slottedWalk) * (1 - state.automationThroughputGainPct), slottedWalk);

	const slottingSaving = current.annualCost - slotted.annualCost;
	const automationSaving = slotted.annualCost - automated.annualCost;

	// What a vendor model reports: automation applied to the untouched baseline, then slotting added.
	const vendorAutomated = scenario(
		pickSecs(state.avgWalkFeetPerLine) * (1 - state.automationThroughputGainPct),
		state.avgWalkFeetPerLine
	);
	const vendorClaimedSaving = current.annualCost - vendorAutomated.annualCost + slottingSaving;
	const doubleCounted = Math.max(0, vendorClaimedSaving - (slottingSaving + automationSaving));

	const amc = state.proposedAutomationCapex * state.annualMaintenanceContractPct;
	const vendorDenominator = vendorClaimedSaving - amc;
	const buyerDenominator = automationSaving - amc - state.annualDowntimeCost;

	const vendorPayback = vendorDenominator > 0 ? state.proposedAutomationCapex / vendorDenominator : null;
	const buyerPayback =
		buyerDenominator > 0 ? (state.proposedAutomationCapex + state.wmsIntegrationCost) / buyerDenominator : null;

	const refusals: string[] = [
		'Payback is undiscounted and pre-tax: it measures when the cash returns, not the return on it.'
	];
	if (buyerPayback === null) {
		refusals.push(
			'The automation does not pay back at these inputs: the saving left after maintenance and downtime is zero or negative, so no horizon exists.'
		);
	}
	if (doubleCounted > 0) {
		refusals.push(
			'Slotting and automation savings are not additive. The two figures a vendor adds are both measured against your current layout.'
		);
	}
	if (state.slottingWalkReductionPct > 0.45) {
		refusals.push(
			'A walk reduction above 45% needs your own slotting data behind it. The engine treats it as a stated input, not a measured result.'
		);
	}

	return {
		current,
		slotted,
		automated,
		slottingSavingAnnual: slottingSaving,
		automationSavingAnnual: automationSaving,
		vendorClaimedSavingAnnual: vendorClaimedSaving,
		doubleCountedAnnual: doubleCounted,
		annualMaintenanceCost: amc,
		vendorPaybackYears: vendorPayback,
		buyerPaybackYears: buyerPayback,
		wmsIntegrationCost: state.wmsIntegrationCost,
		annualDowntimeCost: state.annualDowntimeCost,
		verdict: buildVerdict({ state, slottingSaving, automationSaving, amc, vendorPayback, buyerPayback, current, slotted }),
		refusals
	};
}

function buildVerdict(args: {
	state: SlottingPaybackState;
	slottingSaving: number;
	automationSaving: number;
	amc: number;
	vendorPayback: number | null;
	buyerPayback: number | null;
	current: LabourScenario;
	slotted: LabourScenario;
}): EngineVerdict {
	const { state, slottingSaving, automationSaving, amc, vendorPayback, buyerPayback, current, slotted } = args;
	const usd = (value: number) =>
		`$${Math.round(value).toLocaleString('en-US')}`;
	const years = (value: number) => `${value.toFixed(2)} years`;

	if (slottingSaving >= state.proposedAutomationCapex * 0.5) {
		return {
			tone: 'positive',
			call: 'Free recovery first',
			headline: `Re-slotting the fast movers recovers ${usd(slottingSaving)} a year with no capital at all.`,
			body: `Walk falls from ${current.secondsPerLine.toFixed(1)}s to ${slotted.secondsPerLine.toFixed(1)}s per line, which is ${usd(slottingSaving)} against ${usd(state.proposedAutomationCapex)} of proposed CAPEX.`
		};
	}

	if (buyerPayback === null) {
		return {
			tone: 'erosion',
			call: 'No payback',
			headline: `The automation never returns its ${usd(state.proposedAutomationCapex)} at these inputs.`,
			body: `After ${usd(amc)} of maintenance and ${usd(state.annualDowntimeCost)} of downtime, ${usd(automationSaving)} of incremental saving is all that is left.`
		};
	}

	const gap = vendorPayback !== null && buyerPayback > vendorPayback;
	return {
		tone: gap ? 'erosion' : 'base',
		call: gap ? 'The vendor number is short' : 'The vendor number holds',
		headline: gap
			? `The quoted ${vendorPayback !== null ? years(vendorPayback) : 'payback'} becomes ${years(buyerPayback)} on your own baseline.`
			: `The buyer-side payback is ${years(buyerPayback)} on a fully loaded basis.`,
		body: `Slotting returns ${usd(slottingSaving)} a year before any capital is committed, and the automation adds ${usd(automationSaving)} on top of that layout rather than on top of today's.`
	};
}
