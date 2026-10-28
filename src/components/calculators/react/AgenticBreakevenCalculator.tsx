/**
 * Agentic Workflow Breakeven — the instrument.
 *
 * The page is the engine's output rendered through the shared primitives; nothing here computes a
 * figure. Every number, the verdict, its tone and its caveats come out of `agenticBreakeven.ts`, which
 * is what lets `scripts/check-engines.mjs` hold this page to a fixture.
 *
 * The strip answers the question a CFO asks first (what does a run cost, against what), the canvas
 * answers the one an operator asks second (how much failure can this absorb), and the bar rows answer
 * the one the vendor hopes nobody asks (where the money actually went).
 */
import React, { useMemo } from 'react';
import {
	computeAgenticBreakeven,
	DEFAULT_AGENTIC_BREAKEVEN_STATE,
	type AgenticBreakevenState
} from '../../../lib/calculators/agenticBreakeven';
import { appUrl } from '../../../lib/apps';
import { pct, usd, usdCompact } from '../../../lib/calculators/format';
import { BreakevenChart, BarRows, ChartFrame } from './primitives/Charts';
import { EngineLayout } from './primitives/EngineLayout';
import { Group, NumberField } from './primitives/Fields';
import { KpiStrip, ProBridge, Refusals, ResetButton, Verdict } from './primitives/KpiStrip';
import { useUrlState, type UrlSpec } from './primitives/useUrlState';

/**
 * The URL contract. Keys are short because these links get pasted into memos, and they are frozen:
 * renaming one breaks every link already sent.
 */
const SPEC: UrlSpec<AgenticBreakevenState> = {
	monthlyTaskVolume: { key: 'vol', min: 0, max: 5_000_000 },
	manualTimeMins: { key: 'tm', min: 0, max: 480, decimals: 1 },
	operatorHourlyRate: { key: 'orh', min: 0, max: 500 },
	avgTokensPerRun: { key: 'tok', min: 0, max: 2_000_000 },
	blendedTokenCostPer1M: { key: 'tp', min: 0, max: 200, decimals: 2 },
	agentRetryLoopRate: { key: 'rt', min: 0, max: 1, decimals: 3 },
	contractOrRagFailureRate: { key: 'fail', min: 0, max: 1, decimals: 4 },
	humanAuditSampleRate: { key: 'aud', min: 0, max: 1, decimals: 3 },
	seniorAuditTimeMins: { key: 'atm', min: 0, max: 240, decimals: 1 },
	exceptionReworkTimeMins: { key: 'rwm', min: 0, max: 480, decimals: 1 },
	seniorReviewerHourlyRate: { key: 'srh', min: 0, max: 1000 },
	escapedDefectPenalty: { key: 'pen', min: 0, max: 100_000 }
};

export default function AgenticBreakevenCalculator() {
	const { state, setField, reset } = useUrlState(DEFAULT_AGENTIC_BREAKEVEN_STATE, SPEC);
	const result = useMemo(() => computeAgenticBreakeven(state), [state]);

	const cliffNote =
		result.verificationCliff === null
			? 'no cliff at these inputs'
			: `${pct(result.verificationCliff)} failure`;

	return (
		<EngineLayout
			rail={
				<>
					<Group title="The task it replaces" count={3} open>
						<NumberField
							label="Monthly task volume"
							value={state.monthlyTaskVolume}
							onChange={(value) => setField('monthlyTaskVolume', value)}
							min={0}
							max={500_000}
							step={500}
							affix="runs"
							hint="Runs started per month, including the ones that fail."
						/>
						<NumberField
							label="Manual time per task"
							value={state.manualTimeMins}
							onChange={(value) => setField('manualTimeMins', value)}
							min={0}
							max={480}
							step={1}
							affix="min"
							decimals={1}
							ariaValueText={(value) => `${value} minutes per task`}
						/>
						<NumberField
							label="Operator cost, fully loaded"
							value={state.operatorHourlyRate}
							onChange={(value) => setField('operatorHourlyRate', value)}
							min={0}
							max={400}
							step={1}
							prefix="$"
							affix="/hr"
						/>
					</Group>

					<Group title="Token economics" count={3}>
						<NumberField
							label="Tokens per run"
							value={state.avgTokensPerRun}
							onChange={(value) => setField('avgTokensPerRun', value)}
							min={0}
							max={2_000_000}
							step={500}
							affix="tok"
							hint="Prompt, completion and retrieved context, per run."
						/>
						<NumberField
							label="Blended token price"
							value={state.blendedTokenCostPer1M}
							onChange={(value) => setField('blendedTokenCostPer1M', value)}
							min={0}
							max={200}
							step={0.05}
							prefix="$"
							affix="/1M"
							decimals={2}
						/>
						<NumberField
							label="Retry overhead"
							value={state.agentRetryLoopRate}
							onChange={(value) => setField('agentRetryLoopRate', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
							hint="Share of runs, as a decimal: 0.22 is 22%."
							ariaValueText={(value) => `${pct(value)} retry overhead`}
						/>
					</Group>

					<Group title="Human in the loop" count={4} open>
						<NumberField
							label="Failure rate"
							value={state.contractOrRagFailureRate}
							onChange={(value) => setField('contractOrRagFailureRate', value)}
							min={0}
							max={1}
							step={0.001}
							decimals={3}
							hint="Contract or retrieval misses per run, as a decimal: 0.057 is 5.7%."
							ariaValueText={(value) => `${pct(value)} failure rate`}
						/>
						<NumberField
							label="Audit sample"
							value={state.humanAuditSampleRate}
							onChange={(value) => setField('humanAuditSampleRate', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
							hint="Share of runs a person reads, as a decimal: 0.25 is 25%."
							ariaValueText={(value) => `${pct(value)} of runs audited`}
						/>
						<NumberField
							label="Audit time per checked run"
							value={state.seniorAuditTimeMins}
							onChange={(value) => setField('seniorAuditTimeMins', value)}
							min={0}
							max={240}
							step={1}
							affix="min"
							decimals={1}
						/>
						<NumberField
							label="Rework time per failure"
							value={state.exceptionReworkTimeMins}
							onChange={(value) => setField('exceptionReworkTimeMins', value)}
							min={0}
							max={480}
							step={1}
							affix="min"
							decimals={1}
						/>
					</Group>

					<Group title="Reviewer and exposure" count={2}>
						<NumberField
							label="Reviewer cost"
							value={state.seniorReviewerHourlyRate}
							onChange={(value) => setField('seniorReviewerHourlyRate', value)}
							min={0}
							max={1000}
							step={5}
							prefix="$"
							affix="/hr"
							hint="The person who audits and reworks, not the operator."
						/>
						<NumberField
							label="Escaped defect cost"
							value={state.escapedDefectPenalty}
							onChange={(value) => setField('escapedDefectPenalty', value)}
							min={0}
							max={100_000}
							step={10}
							prefix="$"
							affix="/run"
							hint="SLA credit, refund or remediation for a failure nobody reviewed."
						/>
					</Group>

					<ResetButton onClick={reset} />
				</>
			}
		>
			<KpiStrip
				items={[
					{
						label: 'Cost per run',
						value: usd(result.agentCostPerRun, 2),
						note: `${result.deltaPerRun >= 0 ? '+' : '−'}${usd(Math.abs(result.deltaPerRun), 2)} vs manual`,
						tone: result.deltaPerRun > 0 ? 'erosion' : 'positive'
					},
					{
						label: 'Verification cliff',
						value: result.verificationCliff === null ? '—' : pct(result.verificationCliff),
						note: cliffNote,
						tone: result.cliffStatus === 'assumed-costlier' ? 'erosion' : 'base'
					},
					{
						label: 'Monthly delta',
						value: usdCompact(result.annualDelta),
						note: 'against manual handling',
						tone: result.annualDelta > 0 ? 'erosion' : 'positive'
					}
				]}
			/>

			<Verdict verdict={result.verdict} />

			<ChartFrame
				title="Cost per run against failure rate"
				note={`${pct(result.assumedFailureRate)} assumed`}
				ariaLabel={`Cost per run rises from ${usd(result.series[0].agentCostPerRun, 2)} at zero failure to ${usd(result.series[result.series.length - 1].agentCostPerRun, 2)} at 25% failure, against a flat manual cost of ${usd(result.manualCostPerRun, 2)}. ${result.verificationCliff === null ? 'There is no crossing point at these inputs.' : `The curves cross at ${pct(result.verificationCliff)}.`}`}
				legend={[
					{ label: 'Manual handling', tone: 'muted' },
					{ label: 'Agentic run', tone: 'erosion' }
				]}
				table={{
					caption: 'Cost per run by failure rate',
					head: ['Failure rate', 'Agent cost', 'Manual cost'],
					rows: result.series
						.filter((_, index) => index % 10 === 0)
						.map((point) => [pct(point.failureRate), usd(point.agentCostPerRun, 2), usd(point.manualCostPerRun, 2)])
				}}
			>
				<BreakevenChart
					points={result.series.map((point) => ({ x: point.failureRate, y: point.agentCostPerRun }))}
					baseline={result.manualCostPerRun}
					marker={result.verificationCliff ?? undefined}
					markerLabel={result.verificationCliff === null ? undefined : `cliff ${pct(result.verificationCliff)}`}
					xLabel="Agent failure rate"
					yLabel="Cost per run"
					xFormat={(value) => pct(value, 0)}
					yFormat={(value) => usd(value, 2)}
				/>
			</ChartFrame>

			<ChartFrame
				title="Where the money goes"
				note="one run at the assumed failure rate"
				ariaLabel={`Of ${usd(result.agentCostPerRun, 2)} per run, ${usd(result.computeCostPerRun, 2)} is tokens, ${usd(result.auditCostPerRun, 2)} audit, ${usd(result.reworkCostPerRun, 2)} rework and ${usd(result.liabilityCostPerRun, 2)} escaped defects.`}
			>
				<BarRows
					max={result.agentCostPerRun}
					rows={[
						{ label: 'Tokens, including retries', value: result.computeCostPerRun, valueLabel: usd(result.computeCostPerRun, 2), tone: 'base' },
						{ label: 'Human audit sample', value: result.auditCostPerRun, valueLabel: usd(result.auditCostPerRun, 2), tone: 'friction' },
						{ label: 'Rework of failures', value: result.reworkCostPerRun, valueLabel: usd(result.reworkCostPerRun, 2), tone: 'friction' },
						{ label: 'Escaped defects', value: result.liabilityCostPerRun, valueLabel: usd(result.liabilityCostPerRun, 2), tone: 'erosion' },
						{ label: 'Manual handling', value: result.manualCostPerRun, valueLabel: usd(result.manualCostPerRun, 2), tone: 'muted' }
					]}
				/>
			</ChartFrame>

			<Refusals lines={result.refusals} />

			<ProBridge
				label="When the invoice is the question"
				body={`This estimate takes your retry overhead on trust. SpendProof reconciles an AI provider invoice against your own tagged usage and withholds a clean close when a bucket does not tie out.`}
				appName="SpendProof"
				href={appUrl('/spendproof')}
			/>
		</EngineLayout>
	);
}
