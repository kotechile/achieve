/**
 * Agentic Workflow Breakeven — the verification cliff.
 *
 * THE QUESTION
 * A manual task costs minutes at a loaded rate. An agent replaces part of those minutes with tokens,
 * and adds four costs the per-token price hides: the human who audits a share of the output, the
 * human who reworks what failed, the liability for what failed and shipped, and the retry loop that
 * inflates every run.
 *
 * THE ANSWER THIS ENGINE EXISTS TO GIVE
 * The failure rate at which the agent stops being cheaper than the person. Above it, every extra
 * point of failure costs more than the labour it removed — and the default scenario in the published
 * brief is already above it.
 *
 * WHAT IT REFUSES
 * · a cliff when the agent's fixed cost (compute + audit) already exceeds the manual cost — there is
 *   no failure rate at which it wins, and printing a negative one would read as a small margin;
 * · a cliff when the denominator is zero — with nothing to rework and no penalty, no failure rate
 *   makes the agent more expensive, which is a different statement from "infinitely safe";
 * · any per-run cost below the token cost itself.
 *
 * MODELLING CHOICES, STATED ON THE PAGE
 * Rework is charged on every failure, not only on the audited share, and an escaped failure pays both
 * its rework and its penalty. That is deliberate: someone eventually finds it and fixes it.
 */
import type { EngineResultBase, EngineVerdict } from './engineTypes.ts';

export interface AgenticBreakevenState {
	monthlyTaskVolume: number;
	manualTimeMins: number;
	operatorHourlyRate: number;
	avgTokensPerRun: number;
	blendedTokenCostPer1M: number;
	agentRetryLoopRate: number;
	contractOrRagFailureRate: number;
	humanAuditSampleRate: number;
	seniorAuditTimeMins: number;
	exceptionReworkTimeMins: number;
	seniorReviewerHourlyRate: number;
	escapedDefectPenalty: number;
}

export const DEFAULT_AGENTIC_BREAKEVEN_STATE: AgenticBreakevenState = {
	monthlyTaskVolume: 25_000,
	manualTimeMins: 18,
	operatorHourlyRate: 45,
	avgTokensPerRun: 14_000,
	blendedTokenCostPer1M: 4.5,
	agentRetryLoopRate: 0.22,
	contractOrRagFailureRate: 0.057,
	humanAuditSampleRate: 0.25,
	seniorAuditTimeMins: 8,
	exceptionReworkTimeMins: 25,
	seniorReviewerHourlyRate: 160,
	escapedDefectPenalty: 250
};

export interface FailurePoint {
	/** Failure rate as a fraction (0.05 = 5%). */
	failureRate: number;
	agentCostPerRun: number;
	manualCostPerRun: number;
}

export type CliffStatus = 'assumed-costlier' | 'assumed-cheaper' | 'no-cliff' | 'undefined';

export interface AgenticBreakevenResult extends EngineResultBase {
	manualCostPerRun: number;
	computeCostPerRun: number;
	auditCostPerRun: number;
	reworkCostPerRun: number;
	liabilityCostPerRun: number;
	/** Audit + rework + liability — the layers the token price hides. */
	humanCostPerRun: number;
	agentCostPerRun: number;
	/** agent − manual. Positive means the agent is more expensive per run. */
	deltaPerRun: number;
	/** agent ÷ manual. 1 is parity. */
	costRatio: number;
	annualDelta: number;
	/** Failure rate at which agent cost equals manual cost, as a fraction. */
	verificationCliff: number | null;
	cliffStatus: CliffStatus;
	assumedFailureRate: number;
	assumedCostAtRate: number;
	/** The breakeven curve, sampled for the canvas. */
	series: FailurePoint[];
}

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const clamp01 = (value: number) => Math.min(Math.max(finite(value), 0), 1);

/** Agent cost per run at one failure rate. The single expression the curve and the KPIs share. */
export function agentCostAt(state: AgenticBreakevenState, failureRate: number): number {
	const compute =
		(finite(state.avgTokensPerRun) / 1_000_000) *
		finite(state.blendedTokenCostPer1M) *
		(1 + Math.max(0, finite(state.agentRetryLoopRate)));
	const audit = clamp01(state.humanAuditSampleRate) * ((finite(state.seniorAuditTimeMins) / 60) * finite(state.seniorReviewerHourlyRate));
	const reworkPerFailure = (finite(state.exceptionReworkTimeMins) / 60) * finite(state.seniorReviewerHourlyRate);
	const escapePerFailure = (1 - clamp01(state.humanAuditSampleRate)) * finite(state.escapedDefectPenalty);
	const rate = Math.max(0, finite(failureRate));
	return compute + audit + rate * reworkPerFailure + rate * escapePerFailure;
}

export function manualCostPerRun(state: AgenticBreakevenState): number {
	return (finite(state.manualTimeMins) / 60) * finite(state.operatorHourlyRate);
}

export function computeAgenticBreakeven(input: AgenticBreakevenState): AgenticBreakevenResult {
	const state: AgenticBreakevenState = {
		...DEFAULT_AGENTIC_BREAKEVEN_STATE,
		...input,
		// Every numeric field is coerced once here so no downstream figure can be NaN.
		monthlyTaskVolume: Math.max(0, finite(input.monthlyTaskVolume)),
		manualTimeMins: Math.max(0, finite(input.manualTimeMins)),
		operatorHourlyRate: Math.max(0, finite(input.operatorHourlyRate)),
		avgTokensPerRun: Math.max(0, finite(input.avgTokensPerRun)),
		blendedTokenCostPer1M: Math.max(0, finite(input.blendedTokenCostPer1M)),
		agentRetryLoopRate: clamp01(input.agentRetryLoopRate),
		contractOrRagFailureRate: clamp01(input.contractOrRagFailureRate),
		humanAuditSampleRate: clamp01(input.humanAuditSampleRate),
		seniorAuditTimeMins: Math.max(0, finite(input.seniorAuditTimeMins)),
		exceptionReworkTimeMins: Math.max(0, finite(input.exceptionReworkTimeMins)),
		seniorReviewerHourlyRate: Math.max(0, finite(input.seniorReviewerHourlyRate)),
		escapedDefectPenalty: Math.max(0, finite(input.escapedDefectPenalty))
	};

	const manual = manualCostPerRun(state);
	const compute =
		(state.avgTokensPerRun / 1_000_000) * state.blendedTokenCostPer1M * (1 + state.agentRetryLoopRate);
	const audit = state.humanAuditSampleRate * ((state.seniorAuditTimeMins / 60) * state.seniorReviewerHourlyRate);
	const rework = state.contractOrRagFailureRate * ((state.exceptionReworkTimeMins / 60) * state.seniorReviewerHourlyRate);
	const liability =
		state.contractOrRagFailureRate * (1 - state.humanAuditSampleRate) * state.escapedDefectPenalty;
	const human = audit + rework + liability;
	const agent = compute + human;
	const delta = agent - manual;
	const annual = delta * state.monthlyTaskVolume;

	// The cliff: solve compute + audit + rate·(reworkPerFailure + escapePerFailure) = manual for rate.
	const numerator = manual - compute - audit;
	const denominator =
		(state.exceptionReworkTimeMins / 60) * state.seniorReviewerHourlyRate +
		(1 - state.humanAuditSampleRate) * state.escapedDefectPenalty;

	let verificationCliff: number | null = null;
	let cliffStatus: CliffStatus;
	if (numerator <= 0) {
		cliffStatus = 'no-cliff';
	} else if (denominator <= 0) {
		cliffStatus = 'undefined';
	} else {
		verificationCliff = numerator / denominator;
		cliffStatus = state.contractOrRagFailureRate > verificationCliff ? 'assumed-costlier' : 'assumed-cheaper';
	}

	const series: FailurePoint[] = [];
	for (let step = 0; step <= 100; step += 1) {
		const rate = (step / 100) * 0.25;
		series.push({ failureRate: rate, agentCostPerRun: agentCostAt(state, rate), manualCostPerRun: manual });
	}

	const verdict = buildVerdict({ manual, agent, delta, annual, cliff: verificationCliff, cliffStatus, state });

	const refusals: string[] = [];
	if (cliffStatus === 'no-cliff') {
		refusals.push(
			'No verification cliff exists at these inputs: token cost plus the audit sample already exceeds the manual cost, so no failure rate makes the agent cheaper.'
		);
	}
	if (cliffStatus === 'undefined') {
		refusals.push(
			'No failure rate makes this agent more expensive at these inputs — rework time and escaped-defect penalty are both zero, so there is nothing to scale with failure.'
		);
	}
	refusals.push(
		'Rework is charged on every failure and escaped failures pay both rework and penalty. Audited failures are assumed to be caught, not shipped.'
	);
	if (state.contractOrRagFailureRate > 0 && state.humanAuditSampleRate === 0) {
		refusals.push('The audit sample is 0%, so every failure is priced as an escaped defect.');
	}

	return {
		manualCostPerRun: manual,
		computeCostPerRun: compute,
		auditCostPerRun: audit,
		reworkCostPerRun: rework,
		liabilityCostPerRun: liability,
		humanCostPerRun: human,
		agentCostPerRun: agent,
		deltaPerRun: delta,
		costRatio: manual > 0 ? agent / manual : 0,
		annualDelta: annual,
		verificationCliff,
		cliffStatus,
		assumedFailureRate: state.contractOrRagFailureRate,
		assumedCostAtRate: agentCostAt(state, state.contractOrRagFailureRate),
		series,
		verdict,
		refusals
	};
}

function buildVerdict(args: {
	manual: number;
	agent: number;
	delta: number;
	annual: number;
	cliff: number | null;
	cliffStatus: CliffStatus;
	state: AgenticBreakevenState;
}): EngineVerdict {
	const { manual, agent, delta, annual, cliff, cliffStatus, state } = args;
	const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
	const usd = (value: number) =>
		`$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: Math.abs(value) < 100 ? 2 : 0 })}`;

	if (cliffStatus === 'no-cliff') {
		return {
			tone: 'erosion',
			call: 'No viable failure rate',
			headline: 'The agent costs more per run than the task it replaces, before a single failure.',
			body: `Compute plus audit is ${usd(agent - state.contractOrRagFailureRate * ((state.exceptionReworkTimeMins / 60) * state.seniorReviewerHourlyRate + (1 - state.humanAuditSampleRate) * state.escapedDefectPenalty))} against a manual cost of ${usd(manual)}. Cut the audit sample or the reviewer rate, or the agent cannot win at all.`
		};
	}

	if (cliffStatus === 'undefined') {
		return {
			tone: 'base',
			call: 'No upper failure rate',
			headline: `Rework and liability are unpriced, so the agent is cheaper at every failure rate up to 100%.`,
			body: `Manual cost is ${usd(manual)} per run against ${usd(agent)} for the agent. Set a rework time and an escaped-defect penalty to get a cliff.`
		};
	}

	if (delta > 0) {
		return {
			tone: 'erosion',
			call: 'Above the verification cliff',
			headline: `At ${pct(state.contractOrRagFailureRate)} failure the agent costs ${usd(agent)} against ${usd(manual)} manually — ${pct(agent / manual - 1)} more per run, ${usd(annual)} more a month.`,
			body: `The cliff sits at ${pct(cliff ?? 0)}. Every failure point above it adds ${usd(((state.exceptionReworkTimeMins / 60) * state.seniorReviewerHourlyRate + (1 - state.humanAuditSampleRate) * state.escapedDefectPenalty))} per run.`
		};
	}

	return {
		tone: 'positive',
		call: 'Below the verification cliff',
		headline: `At ${pct(state.contractOrRagFailureRate)} failure the agent costs ${usd(agent)} against ${usd(manual)} manually — ${pct(1 - agent / manual)} cheaper per run, ${usd(Math.abs(annual))} a month.`,
		body: `The cliff sits at ${pct(cliff ?? 0)}: that is how much failure this design can absorb before the saving reverses.`
	};
}
