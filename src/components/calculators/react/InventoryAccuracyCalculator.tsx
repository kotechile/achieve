/**
 * Inventory Record Accuracy — the instrument.
 *
 * The service-level curve is the argument: at every level, the working capital the records force you to
 * hold sits above what the same service level costs when the records are right. The gap is the number,
 * not the total.
 */
import React, { useMemo } from 'react';
import { appUrl } from '../../../lib/apps';
import { num, pct, usd, usdCompact } from '../../../lib/calculators/format';
import {
	computeInventoryAccuracy,
	DEFAULT_INVENTORY_ACCURACY_STATE,
	type InventoryAccuracyState
} from '../../../lib/calculators/inventoryAccuracy';
import { BarRows, ChartFrame } from './primitives/Charts';
import { EngineLayout } from './primitives/EngineLayout';
import { Group, NumberField, SegmentedField } from './primitives/Fields';
import { KpiStrip, ProBridge, Refusals, ResetButton, Verdict } from './primitives/KpiStrip';
import { useUrlState, type UrlSpec } from './primitives/useUrlState';

const SPEC: UrlSpec<InventoryAccuracyState> = {
	activeSkuCount: { key: 'skus', min: 0, max: 500_000 },
	avgUnitCost: { key: 'cost', min: 0, max: 100_000, decimals: 2 },
	avgUnitMargin: { key: 'mgn', min: 0, max: 100_000, decimals: 2 },
	avgDailyDemandPerSku: { key: 'dem', min: 0, max: 100_000, decimals: 2 },
	demandStdDev: { key: 'sdd', min: 0, max: 100_000, decimals: 2 },
	supplierLeadTimeDays: { key: 'lt', min: 1, max: 365, decimals: 1 },
	leadTimeStdDevDays: { key: 'slt', min: 0, max: 180, decimals: 1 },
	erpRecordInaccuracyRate: { key: 'ira', min: 0, max: 1, decimals: 3 },
	phantomOverstatementShare: { key: 'phm', min: 0, max: 1, decimals: 2 },
	targetServiceLevel: { key: 'sl', min: 0.5, max: 0.9999, decimals: 4 },
	annualHoldingCostRate: { key: 'hold', min: 0, max: 1, decimals: 3 },
	daysToDetectPhantom: { key: 'det', min: 0, max: 60, decimals: 1 },
	recordErrorSpread: { key: 'spr', min: 0, max: 3, decimals: 2 }
};

const SERVICE_LEVELS = [
	{ value: '0.9', label: '90%' },
	{ value: '0.95', label: '95%' },
	{ value: '0.975', label: '97.5%' },
	{ value: '0.99', label: '99%' },
	{ value: '0.995', label: '99.5%' }
];

export default function InventoryAccuracyCalculator() {
	const { state, setField, reset } = useUrlState(DEFAULT_INVENTORY_ACCURACY_STATE, SPEC);
	const result = useMemo(() => computeInventoryAccuracy(state), [state]);

	return (
		<EngineLayout
			rail={
				<>
					<Group title="What the records cover" count={3} open>
						<NumberField
							label="Active SKUs"
							value={state.activeSkuCount}
							onChange={(value) => setField('activeSkuCount', value)}
							min={0}
							max={200_000}
							step={50}
							affix="skus"
						/>
						<NumberField
							label="Unit cost"
							value={state.avgUnitCost}
							onChange={(value) => setField('avgUnitCost', value)}
							min={0}
							max={10_000}
							step={1}
							prefix="$"
							decimals={2}
						/>
						<NumberField
							label="Unit margin"
							value={state.avgUnitMargin}
							onChange={(value) => setField('avgUnitMargin', value)}
							min={0}
							max={10_000}
							step={1}
							prefix="$"
							decimals={2}
							hint="What a lost sale costs you, not what it sells for."
						/>
					</Group>

					<Group title="Demand and supply" count={4} open>
						<NumberField
							label="Daily demand per SKU"
							value={state.avgDailyDemandPerSku}
							onChange={(value) => setField('avgDailyDemandPerSku', value)}
							min={0}
							max={10_000}
							step={1}
							affix="units"
							decimals={1}
						/>
						<NumberField
							label="Demand swing"
							value={state.demandStdDev}
							onChange={(value) => setField('demandStdDev', value)}
							min={0}
							max={10_000}
							step={1}
							affix="σ/day"
							decimals={1}
						/>
						<NumberField
							label="Supplier lead time"
							value={state.supplierLeadTimeDays}
							onChange={(value) => setField('supplierLeadTimeDays', value)}
							min={1}
							max={365}
							step={1}
							affix="days"
							decimals={1}
						/>
						<NumberField
							label="Lead-time swing"
							value={state.leadTimeStdDevDays}
							onChange={(value) => setField('leadTimeStdDevDays', value)}
							min={0}
							max={180}
							step={1}
							affix="σ days"
							decimals={1}
						/>
					</Group>

					<Group title="What the records get wrong" count={4} open>
						<NumberField
							label="Records that disagree with the shelf"
							value={state.erpRecordInaccuracyRate}
							onChange={(value) => setField('erpRecordInaccuracyRate', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
							hint="Share of SKU records with a variance, as a decimal: 0.65 is 65%."
						/>
						<NumberField
							label="Errors that overstate stock"
							value={state.phantomOverstatementShare}
							onChange={(value) => setField('phantomOverstatementShare', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
							hint="Overstatement is what cuts orders at the pick face."
						/>
						<NumberField
							label="Days to notice a phantom"
							value={state.daysToDetectPhantom}
							onChange={(value) => setField('daysToDetectPhantom', value)}
							min={0}
							max={60}
							step={0.5}
							affix="days"
							decimals={1}
						/>
						<NumberField
							label="Error spread"
							value={state.recordErrorSpread}
							onChange={(value) => setField('recordErrorSpread', value)}
							min={0}
							max={3}
							step={0.05}
							decimals={2}
							hint="Record error as a share of mean on-hand. An assumption, not a measurement."
						/>
					</Group>

					<Group title="Service level and carrying cost" count={2}>
						<SegmentedField
							label="Target service level"
							value={String(state.targetServiceLevel)}
							options={SERVICE_LEVELS}
							onChange={(value) => setField('targetServiceLevel', Number(value))}
						/>
						<NumberField
							label="Annual holding cost"
							value={state.annualHoldingCostRate}
							onChange={(value) => setField('annualHoldingCostRate', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
							hint="Capital, storage and shrink together, as a decimal: 0.22 is 22%."
						/>
					</Group>

					<ResetButton onClick={reset} />
				</>
			}
		>
			<KpiStrip
				items={[
					{
						label: 'Dead cash in buffer',
						value: usdCompact(result.deadCash),
						note: `${usdCompact(result.annualHoldingCost)} a year to hold`,
						tone: 'erosion'
					},
					{
						label: 'Phantom stockouts',
						value: usdCompact(result.phantomLostMargin),
						note: 'margin a year, orders cut at the face',
						tone: 'friction'
					},
					{
						label: 'Extra units per SKU',
						value: num(result.extraUnitsPerSku, 1),
						note: `${num(result.safetyStockClean)} → ${num(result.safetyStockWithInaccuracy)}`
					}
				]}
			/>

			<Verdict verdict={result.verdict} />

			<ChartFrame
				title="Working capital the records force you to hold"
				note={`${pct(state.erpRecordInaccuracyRate, 0)} of records wrong`}
				ariaLabel={`At the inputs on this page, buffer stock costs ${usd(result.deadCash)} more than it would with accurate records. The excess grows with the service level: ${result.curve.map((point) => `${point.label} costs ${usdCompact(point.workingCapitalCurrent)} against ${usdCompact(point.workingCapitalAudited)}`).join('; ')}.`}
				legend={[
					{ label: 'Excess over accurate records', tone: 'erosion' }
				]}
				table={{
					caption: 'Working capital by service level',
					head: ['Service level', 'Current records', 'Accurate records'],
					rows: result.curve.map((point) => [
						point.label,
						usdCompact(point.workingCapitalCurrent),
						usdCompact(point.workingCapitalAudited)
					])
				}}
			>
				<BarRows
					rows={result.curve.map((point) => ({
						label: `${point.label} service level`,
						value: point.workingCapitalCurrent - point.workingCapitalAudited,
						valueLabel: usdCompact(point.workingCapitalCurrent - point.workingCapitalAudited),
						tone: 'erosion' as const,
						note: `${usdCompact(point.workingCapitalCurrent)} with these records, ${usdCompact(point.workingCapitalAudited)} with audited ones`
					}))}
				/>
			</ChartFrame>

			<ChartFrame
				title="Where the money is"
				note={`σ ${num(result.sigmaBase, 1)} → ${num(result.sigmaEffective, 1)} units`}
				ariaLabel={`Record error widens the effective deviation from ${num(result.sigmaBase, 1)} to ${num(result.sigmaEffective, 1)} units. That holds ${usd(result.deadCash)} of stock at ${usd(result.annualHoldingCost)} a year, and costs ${usd(result.phantomLostMargin)} of margin in stockouts caused by records that show stock the shelf does not have.`}
			>
				<BarRows
					rows={[
						{
							label: 'Stock held against the records',
							value: result.deadCash,
							valueLabel: usdCompact(result.deadCash),
							tone: 'erosion',
							note: 'working capital, recovered once the records are fixed'
						},
						{
							label: 'Holding cost a year',
							value: result.annualHoldingCost,
							valueLabel: usdCompact(result.annualHoldingCost),
							tone: 'friction'
						},
						{
							label: 'Margin lost to phantom stock',
							value: result.phantomLostMargin,
							valueLabel: usdCompact(result.phantomLostMargin),
							tone: 'friction',
							note: `${num(result.phantomEventsPerYear)} stockout events a year`
						}
					]}
				/>
			</ChartFrame>

			<Refusals lines={result.refusals} />

			<ProBridge
				label="When a vendor is selling the fix"
				body="An automated storage system is often quoted against the cost of inaccuracy. CaseProof re-runs the vendor's payback on your own costs, so the storage is priced against cycle counting and slotting first."
				appName="CaseProof"
				href={appUrl('/caseproof')}
			/>
		</EngineLayout>
	);
}
