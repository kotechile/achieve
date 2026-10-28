/**
 * Total Delivered Cost — the instrument.
 *
 * The waterfall is the page: a selling price steps down through goods, the customs assist, the tariff
 * stack, freight, the capital tied up in transit, cost-to-serve and returns, and the last bar is what the
 * unit actually contributes.
 */
import React, { useMemo } from 'react';
import { appUrl } from '../../../lib/apps';
import { num, pct, usd, usdCompact } from '../../../lib/calculators/format';
import {
	computeLandedCost,
	DEFAULT_LANDED_COST_STATE,
	type Incoterm,
	type LandedCostState
} from '../../../lib/calculators/landedCost';
import { BarRows, ChartFrame } from './primitives/Charts';
import { EngineLayout } from './primitives/EngineLayout';
import { Group, NumberField, SegmentedField } from './primitives/Fields';
import { KpiStrip, ProBridge, Refusals, ResetButton, Verdict } from './primitives/KpiStrip';
import { useUrlState, type UrlSpec } from './primitives/useUrlState';

const SPEC: UrlSpec<LandedCostState> = {
	sellingPrice: { key: 'price', min: 0, max: 100_000, decimals: 2 },
	unitFobCost: { key: 'fob', min: 0, max: 100_000, decimals: 2 },
	offshoreToolingValue: { key: 'tool', min: 0, max: 100_000_000 },
	amortizedProductionRun: { key: 'run', min: 1, max: 100_000_000 },
	incoterm: { key: 'term', values: ['FOB', 'EXW', 'CIF'] },
	baseDutyRate: { key: 'duty', min: 0, max: 2, decimals: 4 },
	punitiveTariffRate: { key: 's301', min: 0, max: 2, decimals: 4 },
	unitCartonCbm: { key: 'cbm', min: 0, max: 5, decimals: 5 },
	unitWeightKg: { key: 'kg', min: 0, max: 500, decimals: 3 },
	containerFreightRate40HQ: { key: 'ocean', min: 0, max: 100_000 },
	emergencySurchargePer40HQ: { key: 'sur', min: 0, max: 100_000 },
	containerCapacityCbm: { key: 'cap', min: 1, max: 200 },
	containerPayloadKg: { key: 'pay', min: 1, max: 100_000 },
	waccRate: { key: 'wacc', min: 0, max: 1, decimals: 4 },
	shrinkInsuranceRate: { key: 'shrink', min: 0, max: 1, decimals: 4 },
	daysSalesOfInventory: { key: 'dsi', min: 0, max: 365, decimals: 1 },
	daysInTransit: { key: 'transit', min: 0, max: 180, decimals: 1 },
	pickPackCost: { key: 'pick', min: 0, max: 10_000, decimals: 2 },
	paymentTermsDiscountRate: { key: 'terms', min: 0, max: 0.5, decimals: 4 },
	rmaReturnRate: { key: 'rma', min: 0, max: 1, decimals: 3 },
	reverseLogisticsCost: { key: 'rev', min: 0, max: 10_000, decimals: 2 },
	rmaWriteoffRate: { key: 'woff', min: 0, max: 1, decimals: 3 },
	unitsPerEntry: { key: 'entry', min: 1, max: 10_000_000 },
	foreignInlandFreightPerUnit: { key: 'inland', min: 0, max: 10_000, decimals: 2 }
};

const INCOTERMS: { value: Incoterm; label: string }[] = [
	{ value: 'FOB', label: 'FOB' },
	{ value: 'EXW', label: 'EXW' },
	{ value: 'CIF', label: 'CIF' }
];

export default function LandedCostCalculator() {
	const { state, setField, reset } = useUrlState(DEFAULT_LANDED_COST_STATE, SPEC);
	const result = useMemo(() => computeLandedCost(state), [state]);

	const price = Math.max(state.sellingPrice, result.tdc, 1);

	return (
		<EngineLayout
			rail={
				<>
					<Group title="The unit" count={4} open>
						<NumberField
							label="Selling price"
							value={state.sellingPrice}
							onChange={(value) => setField('sellingPrice', value)}
							min={0}
							max={10_000}
							step={0.5}
							prefix="$"
							decimals={2}
						/>
						<NumberField
							label="Goods at FOB"
							value={state.unitFobCost}
							onChange={(value) => setField('unitFobCost', value)}
							min={0}
							max={10_000}
							step={0.25}
							prefix="$"
							decimals={2}
						/>
						<NumberField
							label="Offshore tooling paid"
							value={state.offshoreToolingValue}
							onChange={(value) => setField('offshoreToolingValue', value)}
							min={0}
							max={5_000_000}
							step={1000}
							prefix="$"
							hint="A mould, die or fixture paid to the supplier. Dutiable on every unit it makes."
						/>
						<NumberField
							label="Units over which it amortises"
							value={state.amortizedProductionRun}
							onChange={(value) => setField('amortizedProductionRun', value)}
							min={1}
							max={5_000_000}
							step={1000}
							affix="units"
						/>
					</Group>

					<Group title="Duty and terms" count={5} open>
						<SegmentedField
							label="Incoterm"
							value={state.incoterm}
							options={INCOTERMS}
							onChange={(value) => setField('incoterm', value as Incoterm)}
						/>
						<NumberField
							label="Base duty rate"
							value={state.baseDutyRate}
							onChange={(value) => setField('baseDutyRate', value)}
							min={0}
							max={1}
							step={0.005}
							decimals={3}
							hint="Decimal, not percent: 0.065 is 6.5%."
						/>
						<NumberField
							label="Section 301 / emergency tariff"
							value={state.punitiveTariffRate}
							onChange={(value) => setField('punitiveTariffRate', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
							hint="Applied to the same dutiable value as the base rate."
						/>
						<NumberField
							label="Units per customs entry"
							value={state.unitsPerEntry}
							onChange={(value) => setField('unitsPerEntry', value)}
							min={1}
							max={1_000_000}
							step={500}
							affix="units"
							hint="The MPF floor and ceiling apply per entry, not per unit."
						/>
						<NumberField
							label="Origin inland freight"
							value={state.foreignInlandFreightPerUnit}
							onChange={(value) => setField('foreignInlandFreightPerUnit', value)}
							min={0}
							max={100}
							step={0.05}
							prefix="$"
							decimals={2}
							hint="Only charged under EXW, and it is dutiable."
						/>
					</Group>

					<Group title="Freight" count={6}>
						<NumberField
							label="Carton volume per unit"
							value={state.unitCartonCbm}
							onChange={(value) => setField('unitCartonCbm', value)}
							min={0}
							max={2}
							step={0.001}
							affix="CBM"
							decimals={4}
						/>
						<NumberField
							label="Weight per unit"
							value={state.unitWeightKg}
							onChange={(value) => setField('unitWeightKg', value)}
							min={0}
							max={200}
							step={0.05}
							affix="kg"
							decimals={3}
						/>
						<NumberField
							label="40HQ ocean rate"
							value={state.containerFreightRate40HQ}
							onChange={(value) => setField('containerFreightRate40HQ', value)}
							min={0}
							max={50_000}
							step={100}
							prefix="$"
						/>
						<NumberField
							label="Emergency surcharge"
							value={state.emergencySurchargePer40HQ}
							onChange={(value) => setField('emergencySurchargePer40HQ', value)}
							min={0}
							max={20_000}
							step={50}
							prefix="$"
							hint="Red Sea, peak season or war-risk, per container."
						/>
						<NumberField
							label="Container cube"
							value={state.containerCapacityCbm}
							onChange={(value) => setField('containerCapacityCbm', value)}
							min={1}
							max={120}
							step={1}
							affix="CBM"
						/>
						<NumberField
							label="Container payload"
							value={state.containerPayloadKg}
							onChange={(value) => setField('containerPayloadKg', value)}
							min={1}
							max={40_000}
							step={500}
							affix="kg"
						/>
					</Group>

					<Group title="Capital and returns" count={7}>
						<NumberField
							label="Cost of capital"
							value={state.waccRate}
							onChange={(value) => setField('waccRate', value)}
							min={0}
							max={0.6}
							step={0.005}
							decimals={3}
						/>
						<NumberField
							label="Shrink and insurance"
							value={state.shrinkInsuranceRate}
							onChange={(value) => setField('shrinkInsuranceRate', value)}
							min={0}
							max={0.5}
							step={0.005}
							decimals={3}
						/>
						<NumberField
							label="Days of stock"
							value={state.daysSalesOfInventory}
							onChange={(value) => setField('daysSalesOfInventory', value)}
							min={0}
							max={365}
							step={5}
							affix="days"
							decimals={1}
						/>
						<NumberField
							label="Days in transit"
							value={state.daysInTransit}
							onChange={(value) => setField('daysInTransit', value)}
							min={0}
							max={180}
							step={1}
							affix="days"
							decimals={1}
						/>
						<NumberField
							label="Pick and pack"
							value={state.pickPackCost}
							onChange={(value) => setField('pickPackCost', value)}
							min={0}
							max={500}
							step={0.25}
							prefix="$"
							decimals={2}
						/>
						<NumberField
							label="Payment terms discount"
							value={state.paymentTermsDiscountRate}
							onChange={(value) => setField('paymentTermsDiscountRate', value)}
							min={0}
							max={0.2}
							step={0.005}
							decimals={3}
							hint="Early-payment discount taken off the selling price."
						/>
						<NumberField
							label="Return rate"
							value={state.rmaReturnRate}
							onChange={(value) => setField('rmaReturnRate', value)}
							min={0}
							max={1}
							step={0.005}
							decimals={3}
							hint="Decimal: 0.06 is 6%."
						/>
					</Group>

					<Group title="Returns detail" count={2}>
						<NumberField
							label="Reverse logistics"
							value={state.reverseLogisticsCost}
							onChange={(value) => setField('reverseLogisticsCost', value)}
							min={0}
							max={500}
							step={0.5}
							prefix="$"
							decimals={2}
						/>
						<NumberField
							label="Write-off on a return"
							value={state.rmaWriteoffRate}
							onChange={(value) => setField('rmaWriteoffRate', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
							hint="Share of landed cost lost on a returned unit."
						/>
					</Group>

					<ResetButton onClick={reset} />
				</>
			}
		>
			<KpiStrip
				items={[
					{
						label: 'Contribution',
						value: usd(result.contribution, 2),
						note: `${pct(result.contributionPct / 100)} of the selling price`,
						tone: result.contribution > 0 ? 'positive' : 'erosion'
					},
					{
						label: 'Duty per unit',
						value: usd(result.dutyCharged, 2),
						note: `${pct(result.dutyShareOfTdc / 100)} of delivered cost`,
						tone: 'friction'
					},
					{
						label: 'Delivered cost',
						value: usd(result.tdc, 2),
						note: `${usd(result.landedCost, 2)} landed`
					}
				]}
			/>

			<Verdict verdict={result.verdict} />

			<ChartFrame
				title="Price to contribution"
				note={`${state.incoterm} · ${num(result.unitsPerContainer)} units per 40HQ`}
				ariaLabel={`A selling price of ${usd(state.sellingPrice, 2)} steps down through ${result.steps.map((step) => `${step.label} at ${usd(step.amount, 2)}`).join(', ')}, leaving ${usd(result.contribution, 2)} of contribution.`}
				legend={[
					{ label: 'Goods and freight', tone: 'base' },
					{ label: 'Duty, capital, cost to serve', tone: 'friction' },
					{ label: 'Returns', tone: 'erosion' }
				]}
				table={{
					caption: 'Delivered cost waterfall',
					head: ['Step', 'Amount', 'Running'],
					rows: result.steps.map((step) => [step.label, usd(step.amount, 2), usd(step.running, 2)])
				}}
			>
				<BarRows
					max={price}
					rows={result.steps.map((step) => ({
						label: step.label,
						value: step.amount,
						valueLabel: usd(step.amount, 2),
						tone: step.tone,
						note: step.id === 'price' ? 'what the customer pays' : `leaves ${usd(step.running, 2)}`
					}))}
				/>
			</ChartFrame>

			<ChartFrame
				title="Where the duty comes from"
				note={`${usd(result.freightPerCbm, 2)} a CBM · ${result.freightBasis}-limited`}
				ariaLabel={`The dutiable value is ${usd(result.dutyBase, 2)}: goods plus ${usd(result.customsAssistPerUnit, 2)} of amortised tooling. Duty and fees come to ${usd(result.dutyCharged, 2)}. Ocean freight is ${usd(result.freightPerUnit, 2)} a unit, and ${num(result.carryingDays)} days of capital cost ${usd(result.carryingCost, 2)}.`}
			>
				<BarRows
					rows={[
						{
							label: 'Goods at FOB',
							value: state.unitFobCost,
							valueLabel: usd(state.unitFobCost, 2),
							tone: 'base'
						},
						{
							label: 'Customs assist',
							value: result.customsAssistPerUnit,
							valueLabel: usd(result.customsAssistPerUnit, 2),
							tone: 'friction',
							note: 'inside the dutiable value, so it is taxed again'
						},
						{
							label: 'Duty, 301 and MPF/HMF',
							value: result.dutyCharged,
							valueLabel: usd(result.dutyCharged, 2),
							tone: 'friction'
						},
						{
							label: 'Ocean freight',
							value: result.freightPerUnit,
							valueLabel: usd(result.freightPerUnit, 2),
							tone: 'base'
						},
						{
							label: 'Capital while in transit',
							value: result.carryingCost,
							valueLabel: usd(result.carryingCost, 2),
							tone: 'friction'
						},
						{
							label: 'Cost to serve',
							value: result.costToServe,
							valueLabel: usd(result.costToServe, 2),
							tone: 'friction'
						}
					]}
				/>
			</ChartFrame>

			<Refusals lines={result.refusals} />

			<ProBridge
				label="When the paperwork is the exposure"
				body={`This model applies one duty rate to one HS code. FacturGate validates an invoice payload against EN 16931 before it is sent, and ParcelProof recomputes the freight lines on the invoices you were actually billed.`}
				appName="FacturGate"
				href={appUrl('/facturgate')}
			/>
		</EngineLayout>
	);
}
