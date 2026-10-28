/**
 * Parcel DIM-Weight — the instrument.
 *
 * Three billable weights per carton: what the carrier bills today, what the same box would bill at a
 * negotiated divisor, and what a smaller box would bill at that divisor. The money that comes back is the
 * difference between the first and the third, and it is deliberately kept apart from the surcharges no
 * carton change touches.
 *
 * The carton profiles are fixed. Editing them per SKU is exactly what the paid audit does from an invoice,
 * and the page says so rather than offering three editable averages that would imply more precision than
 * the estimate has.
 */
import React, { useMemo } from 'react';
import { appUrl } from '../../../lib/apps';
import { num, usd, usdCompact } from '../../../lib/calculators/format';
import {
	computeParcelDim,
	DEFAULT_PARCEL_DIM_STATE,
	type ParcelDimState
} from '../../../lib/calculators/parcelDim';
import { BarRows, ChartFrame } from './primitives/Charts';
import { EngineLayout } from './primitives/EngineLayout';
import { Group, NumberField } from './primitives/Fields';
import { KpiStrip, ProBridge, Refusals, ResetButton, Verdict } from './primitives/KpiStrip';
import { useUrlState, type UrlSpec } from './primitives/useUrlState';

const SPEC: UrlSpec<ParcelDimState> = {
	monthlyShipmentVolume: { key: 'vol', min: 0, max: 5_000_000 },
	currentDimDivisor: { key: 'div', min: 90, max: 400 },
	targetNegotiatedDivisor: { key: 'tdiv', min: 90, max: 400 },
	incrementalRatePerLb: { key: 'rate', min: 0, max: 50, decimals: 3 },
	baseRatePerParcel: { key: 'base', min: 0, max: 500, decimals: 2 },
	residentialSharePct: { key: 'res', min: 0, max: 1, decimals: 3 },
	residentialSurcharge: { key: 'resfee', min: 0, max: 100, decimals: 2 },
	deliveryAreaSurchargePct: { key: 'das', min: 0, max: 1, decimals: 3 },
	dasFeeAvg: { key: 'dasfee', min: 0, max: 100, decimals: 2 },
	cartonHeightReductionInches: { key: 'cut', min: 0, max: 12, decimals: 1 }
};

export default function ParcelDimCalculator() {
	const { state, setField, reset } = useUrlState(DEFAULT_PARCEL_DIM_STATE, SPEC);
	const result = useMemo(() => computeParcelDim(state), [state]);

	const maxBillable = Math.max(...result.cartons.flatMap((carton) => [carton.billableCurrent, carton.billableRightSized]), 1);

	return (
		<EngineLayout
			rail={
				<>
					<Group title="Volume and divisors" count={4} open>
						<NumberField
							label="Parcels a month"
							value={state.monthlyShipmentVolume}
							onChange={(value) => setField('monthlyShipmentVolume', value)}
							min={0}
							max={500_000}
							step={500}
							affix="parcels"
						/>
						<NumberField
							label="Divisor billed today"
							value={state.currentDimDivisor}
							onChange={(value) => setField('currentDimDivisor', value)}
							min={90}
							max={400}
							step={1}
							ariaValueText={(value) => `divisor ${value}`}
							hint="139 is the published daily rate at UPS and FedEx. USPS bills at 166."
						/>
						<NumberField
							label="Divisor in the contract"
							value={state.targetNegotiatedDivisor}
							onChange={(value) => setField('targetNegotiatedDivisor', value)}
							min={90}
							max={400}
							step={1}
							ariaValueText={(value) => `divisor ${value}`}
							hint="A larger divisor bills fewer pounds for the same box."
						/>
						<NumberField
							label="Rate per billed pound"
							value={state.incrementalRatePerLb}
							onChange={(value) => setField('incrementalRatePerLb', value)}
							min={0}
							max={20}
							step={0.01}
							prefix="$"
							decimals={2}
							hint="The incremental rate on the excess pounds, not the whole freight bill."
						/>
					</Group>

					<Group title="Surcharges" count={5}>
						<NumberField
							label="Base rate a parcel"
							value={state.baseRatePerParcel}
							onChange={(value) => setField('baseRatePerParcel', value)}
							min={0}
							max={200}
							step={0.1}
							prefix="$"
							decimals={2}
						/>
						<NumberField
							label="Residential share"
							value={state.residentialSharePct}
							onChange={(value) => setField('residentialSharePct', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
							hint="Decimal: 0.70 is 70% of parcels."
						/>
						<NumberField
							label="Residential surcharge"
							value={state.residentialSurcharge}
							onChange={(value) => setField('residentialSurcharge', value)}
							min={0}
							max={50}
							step={0.05}
							prefix="$"
							decimals={2}
						/>
						<NumberField
							label="Delivery-area share"
							value={state.deliveryAreaSurchargePct}
							onChange={(value) => setField('deliveryAreaSurchargePct', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
						/>
						<NumberField
							label="Delivery-area fee"
							value={state.dasFeeAvg}
							onChange={(value) => setField('dasFeeAvg', value)}
							min={0}
							max={50}
							step={0.05}
							prefix="$"
							decimals={2}
						/>
					</Group>

					<Group title="Right-sizing" count={1}>
						<NumberField
							label="Height removed per carton"
							value={state.cartonHeightReductionInches}
							onChange={(value) => setField('cartonHeightReductionInches', value)}
							min={0}
							max={8}
							step={0.5}
							affix="in"
							decimals={1}
							hint="A ceiling, assuming the contents still fit."
						/>
					</Group>

					<ResetButton onClick={reset} />
				</>
			}
		>
			<KpiStrip
				items={[
					{
						label: 'Recoverable a year',
						value: usdCompact(result.recoverableRightSizeAnnual),
						note: 'divisor plus a smaller box',
						tone: 'positive'
					},
					{
						label: 'Excess billed pounds',
						value: `${num(
							result.cartons.reduce((sum, carton) => sum + carton.excessLbBilled * carton.monthlyParcels, 0) / 1000,
							1
						)}k`,
						note: 'a month, across the carton mix',
						tone: 'friction'
					},
					{
						label: 'Structural a year',
						value: usdCompact(result.structuralAnnual),
						note: 'residential and delivery area',
						tone: 'erosion'
					}
				]}
			/>

			<Verdict verdict={result.verdict} />

			<ChartFrame
				title="Billable weight by carton"
				note={`divisor ${state.currentDimDivisor} → ${state.targetNegotiatedDivisor}, ${state.cartonHeightReductionInches}" smaller`}
				ariaLabel={result.cartons
					.map(
						(carton) =>
							`${carton.name}: ${carton.actualWeightBilled} lb actual, billed at ${carton.billableCurrent} lb today and ${carton.billableRightSized} lb after the divisor and a smaller box.`
					)
					.join(' ')}
				legend={[
					{ label: 'Scale weight', tone: 'muted' },
					{ label: 'Billed today', tone: 'erosion' },
					{ label: 'After the fix', tone: 'positive' }
				]}
				table={{
					caption: 'Billable weight by carton',
					head: ['Carton', 'Scale weight', 'Billed today', 'After the fix'],
					rows: result.cartons.map((carton) => [
						carton.name,
						`${carton.actualWeightBilled} lb`,
						`${carton.billableCurrent} lb`,
						`${carton.billableRightSized} lb`
					])
				}}
			>
				<BarRows
					max={maxBillable}
					rows={result.cartons.flatMap((carton) => [
						{
							label: `${carton.name} · scale weight`,
							value: carton.actualWeightBilled,
							valueLabel: `${carton.actualWeightBilled} lb`,
							tone: 'muted' as const
						},
						{
							label: `${carton.name} · billed today`,
							value: carton.billableCurrent,
							valueLabel: `${carton.billableCurrent} lb`,
							tone: 'erosion' as const,
							note: `${carton.excessLbBilled} lb of the charge is cube, ${carton.girthInches}" of girth`
						},
						{
							label: `${carton.name} · after the fix`,
							value: carton.billableRightSized,
							valueLabel: `${carton.billableRightSized} lb`,
							tone: 'positive' as const
						}
					])}
				/>
			</ChartFrame>

			<ChartFrame
				title="What comes back, and what does not"
				note={`effective ${result.effectiveFrom}`}
				ariaLabel={`A negotiated divisor recovers ${usd(result.recoverableDivisorAnnual)} a year and a smaller box on top of it recovers ${usd(result.recoverableRightSizeAnnual)}. ${usd(result.excessWeightAnnual)} a year is billed on cube and is the carrier's rule, and ${usd(result.structuralAnnual)} of residential and delivery-area surcharges is structural.`}
			>
				<BarRows
					rows={[
						{
							label: 'Divisor renegotiation',
							value: result.recoverableDivisorAnnual,
							valueLabel: usdCompact(result.recoverableDivisorAnnual),
							tone: 'positive',
							note: `${usd(result.negotiationLevers.divisorPerParcel, 2)} a parcel against ${usd(result.negotiationLevers.baseDiscountPerParcel, 2)} from a 4% base discount`
						},
						{
							label: 'Divisor and right-sizing',
							value: result.recoverableRightSizeAnnual,
							valueLabel: usdCompact(result.recoverableRightSizeAnnual),
							tone: 'positive'
						},
						{
							label: 'Billed on cube',
							value: result.excessWeightAnnual,
							valueLabel: usdCompact(result.excessWeightAnnual),
							tone: 'muted',
							note: 'a carrier rule, not an error'
						},
						{
							label: 'Structural surcharges',
							value: result.structuralAnnual,
							valueLabel: usdCompact(result.structuralAnnual),
							tone: 'erosion',
							note: 'no carton or divisor change removes these'
						}
					]}
				/>
			</ChartFrame>

			<Refusals lines={result.refusals} />

			<ProBridge
				label="When three box averages is not enough"
				body="This estimate prices three cartons. ParcelProof reads the carrier's invoice and shipment file line by line, recomputes every rule-triggered charge and names the ones with no basis."
				appName="ParcelProof"
				href={appUrl('/parcelproof')}
			/>
		</EngineLayout>
	);
}
