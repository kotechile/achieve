/**
 * Warehouse Slotting & Automation Payback — the instrument.
 *
 * Three labour scenarios, in the order a buyer should price them: today's layout, the same layout after
 * a free re-slot, and the re-slotted layout after the vendor's machine. The gap that decides the deal is
 * the last one, and it is smaller than the number in the deck.
 */
import React, { useMemo } from 'react';
import { appUrl } from '../../../lib/apps';
import { num, usd, usdCompact, years } from '../../../lib/calculators/format';
import {
	computeSlottingPayback,
	DEFAULT_SLOTTING_PAYBACK_STATE,
	type SlottingPaybackState
} from '../../../lib/calculators/slottingPayback';
import { BarRows, ChartFrame } from './primitives/Charts';
import { EngineLayout } from './primitives/EngineLayout';
import { Group, NumberField } from './primitives/Fields';
import { KpiStrip, ProBridge, Refusals, ResetButton, Verdict } from './primitives/KpiStrip';
import { useUrlState, type UrlSpec } from './primitives/useUrlState';

const SPEC: UrlSpec<SlottingPaybackState> = {
	operatingDaysPerYear: { key: 'days', min: 0, max: 366 },
	dailyOrderLinesPicked: { key: 'lines', min: 0, max: 500_000 },
	avgWalkFeetPerLine: { key: 'walk', min: 0, max: 1000 },
	pickerWalkSpeedFps: { key: 'fps', min: 0.1, max: 10, decimals: 2 },
	fixedPickTimeSecs: { key: 'fix', min: 0, max: 600, decimals: 1 },
	fullyLoadedWarehouseWage: { key: 'wage', min: 0, max: 300, decimals: 2 },
	utilisation: { key: 'util', min: 0.4, max: 1, decimals: 2 },
	slottingWalkReductionPct: { key: 'cut', min: 0, max: 0.95, decimals: 2 },
	proposedAutomationCapex: { key: 'capex', min: 0, max: 100_000_000 },
	wmsIntegrationCost: { key: 'wms', min: 0, max: 50_000_000 },
	annualMaintenanceContractPct: { key: 'amc', min: 0, max: 0.5, decimals: 3 },
	automationThroughputGainPct: { key: 'gain', min: 0, max: 0.95, decimals: 2 },
	annualDowntimeCost: { key: 'down', min: 0, max: 100_000_000 }
};

export default function SlottingPaybackCalculator() {
	const { state, setField, reset } = useUrlState(DEFAULT_SLOTTING_PAYBACK_STATE, SPEC);
	const result = useMemo(() => computeSlottingPayback(state), [state]);

	const worstPayback = Math.max(result.vendorPaybackYears ?? 0, result.buyerPaybackYears ?? 0, 1);

	return (
		<EngineLayout
			rail={
				<>
					<Group title="The picking operation" count={6} open>
						<NumberField
							label="Operating days a year"
							value={state.operatingDaysPerYear}
							onChange={(value) => setField('operatingDaysPerYear', value)}
							min={0}
							max={366}
							step={1}
							affix="days"
						/>
						<NumberField
							label="Order lines picked a day"
							value={state.dailyOrderLinesPicked}
							onChange={(value) => setField('dailyOrderLinesPicked', value)}
							min={0}
							max={200_000}
							step={500}
							affix="lines"
						/>
						<NumberField
							label="Walk per line"
							value={state.avgWalkFeetPerLine}
							onChange={(value) => setField('avgWalkFeetPerLine', value)}
							min={0}
							max={600}
							step={5}
							affix="ft"
							hint="Distance from the pick face to the next, averaged across the layout."
						/>
						<NumberField
							label="Picker walking speed"
							value={state.pickerWalkSpeedFps}
							onChange={(value) => setField('pickerWalkSpeedFps', value)}
							min={0.1}
							max={10}
							step={0.1}
							affix="ft/s"
							decimals={2}
						/>
						<NumberField
							label="Fixed time per line"
							value={state.fixedPickTimeSecs}
							onChange={(value) => setField('fixedPickTimeSecs', value)}
							min={0}
							max={600}
							step={1}
							affix="s"
							decimals={1}
							hint="Scan, grab and confirm, before any walking."
						/>
						<NumberField
							label="Loaded warehouse wage"
							value={state.fullyLoadedWarehouseWage}
							onChange={(value) => setField('fullyLoadedWarehouseWage', value)}
							min={0}
							max={200}
							step={0.5}
							prefix="$"
							affix="/hr"
							decimals={2}
							hint="Wage plus burden and supervision, not the hourly rate on the offer letter."
						/>
					</Group>

					<Group title="Layout and utilisation" count={2}>
						<NumberField
							label="Utilisation"
							value={state.utilisation}
							onChange={(value) => setField('utilisation', value)}
							min={0.4}
							max={1}
							step={0.01}
							decimals={2}
							hint="Productive share of paid hours, as a decimal: 0.85 is 85%."
						/>
						<NumberField
							label="Walk cut from re-slotting"
							value={state.slottingWalkReductionPct}
							onChange={(value) => setField('slottingWalkReductionPct', value)}
							min={0}
							max={0.9}
							step={0.01}
							decimals={2}
							hint="Share of walking removed by moving fast movers to the golden zone."
						/>
					</Group>

					<Group title="The vendor's proposal" count={5}>
						<NumberField
							label="Automation capital"
							value={state.proposedAutomationCapex}
							onChange={(value) => setField('proposedAutomationCapex', value)}
							min={0}
							max={50_000_000}
							step={50_000}
							prefix="$"
						/>
						<NumberField
							label="WMS integration"
							value={state.wmsIntegrationCost}
							onChange={(value) => setField('wmsIntegrationCost', value)}
							min={0}
							max={20_000_000}
							step={10_000}
							prefix="$"
							hint="Usually quoted separately and left out of the payback."
						/>
						<NumberField
							label="Maintenance contract"
							value={state.annualMaintenanceContractPct}
							onChange={(value) => setField('annualMaintenanceContractPct', value)}
							min={0}
							max={0.3}
							step={0.005}
							decimals={3}
							affix="of CAPEX"
							hint="Annual service and parts, as a decimal share of the capital: 0.09 is 9%."
						/>
						<NumberField
							label="Throughput gain"
							value={state.automationThroughputGainPct}
							onChange={(value) => setField('automationThroughputGainPct', value)}
							min={0}
							max={0.95}
							step={0.01}
							decimals={2}
							hint="Reduction in pick time, as a decimal: 0.55 is 55%."
						/>
						<NumberField
							label="Downtime cost a year"
							value={state.annualDowntimeCost}
							onChange={(value) => setField('annualDowntimeCost', value)}
							min={0}
							max={10_000_000}
							step={5_000}
							prefix="$"
						/>
					</Group>

					<ResetButton onClick={reset} />
				</>
			}
		>
			<KpiStrip
				items={[
					{
						label: 'Buyer payback',
						value: years(result.buyerPaybackYears),
						note: result.vendorPaybackYears === null ? 'no vendor figure' : `vendor says ${years(result.vendorPaybackYears)}`,
						tone: result.buyerPaybackYears === null ? 'erosion' : 'friction'
					},
					{
						label: 'Free recovery',
						value: usdCompact(result.slottingSavingAnnual),
						note: 'a year, before any capital',
						tone: 'positive'
					},
					{
						label: 'Picker miles a day',
						value: num(result.current.pickerMilesPerDay),
						note: `${num(result.slotted.pickerMilesPerDay)} after re-slotting`
					}
				]}
			/>

			<Verdict verdict={result.verdict} />

			<ChartFrame
				title="Payback horizon"
				note="vendor model against your baseline"
				ariaLabel={`The vendor model returns the capital in ${years(result.vendorPaybackYears)}. Priced on the layout you will actually have after re-slotting, and carrying maintenance and downtime, it returns in ${years(result.buyerPaybackYears)}.`}
				legend={[
					{ label: 'Vendor model', tone: 'friction' },
					{ label: 'Buyer audit', tone: 'erosion' }
				]}
			>
				<BarRows
					max={worstPayback}
					rows={[
						{
							label: 'Vendor payback',
							value: result.vendorPaybackYears ?? 0,
							valueLabel: years(result.vendorPaybackYears),
							tone: 'friction',
							note: 'Both savings measured from today\'s layout, maintenance deducted'
						},
						{
							label: 'Buyer payback',
							value: result.buyerPaybackYears ?? 0,
							valueLabel: years(result.buyerPaybackYears),
							tone: 'erosion',
							note: `Capital plus ${usdCompact(result.wmsIntegrationCost)} of WMS integration, maintenance and ${usdCompact(result.annualDowntimeCost)} of downtime`
						}
					]}
				/>
			</ChartFrame>

			<ChartFrame
				title="Labour cost by scenario"
				note={`${usd(result.current.annualCost)} a year today`}
				ariaLabel={`Annual pick labour is ${usd(result.current.annualCost)} today, ${usd(result.slotted.annualCost)} after re-slotting and ${usd(result.automated.annualCost)} with the automation in place.`}
			>
				<BarRows
					rows={[
						{
							label: 'Today',
							value: result.current.annualCost,
							valueLabel: usdCompact(result.current.annualCost),
							tone: 'muted',
							note: `${result.current.secondsPerLine.toFixed(1)}s a line`
						},
						{
							label: 'After re-slotting',
							value: result.slotted.annualCost,
							valueLabel: usdCompact(result.slotted.annualCost),
							tone: 'positive',
							note: `${result.slotted.secondsPerLine.toFixed(1)}s a line, no capital`
						},
						{
							label: 'After automation',
							value: result.automated.annualCost,
							valueLabel: usdCompact(result.automated.annualCost),
							tone: 'base',
							note: `${result.automated.secondsPerLine.toFixed(1)}s a line, ${usdCompact(result.annualMaintenanceCost)} of maintenance a year`
						}
					]}
				/>
			</ChartFrame>

			<ChartFrame
				title="What the two claims share"
				note={`${usd(result.doubleCountedAnnual)} counted twice`}
				ariaLabel={`The vendor's combined saving is ${usd(result.vendorClaimedSavingAnnual)} a year. The slotting saving is ${usd(result.slottingSavingAnnual)} and the automation adds ${usd(result.automationSavingAnnual)} on top of it, so ${usd(result.doubleCountedAnnual)} of the combined figure is the same walk time counted twice.`}
			>
				<BarRows
					rows={[
						{
							label: 'Vendor combined saving',
							value: result.vendorClaimedSavingAnnual,
							valueLabel: usdCompact(result.vendorClaimedSavingAnnual),
							tone: 'friction'
						},
						{
							label: 'Slotting alone',
							value: result.slottingSavingAnnual,
							valueLabel: usdCompact(result.slottingSavingAnnual),
							tone: 'positive'
						},
						{
							label: 'Automation on the slotted layout',
							value: result.automationSavingAnnual,
							valueLabel: usdCompact(result.automationSavingAnnual),
							tone: 'base'
						}
					]}
				/>
			</ChartFrame>

			<Refusals lines={result.refusals} />

			<ProBridge
				label="When the model is the thing being sold"
				body="This page re-runs the arithmetic. CaseProof takes the vendor's own business case, re-prices it on your loaded costs and lists what has to be confirmed in writing before anyone signs."
				appName="CaseProof"
				href={appUrl('/caseproof')}
			/>
		</EngineLayout>
	);
}
