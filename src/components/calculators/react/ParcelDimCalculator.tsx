/**
 * Parcel DIM-Weight — the instrument.
 *
 * Three billable weights per carton: what the carrier bills today, what the same box would bill at a
 * negotiated divisor, and what a smaller box would bill at that divisor. The money that comes back is the
 * difference between the first and the third, and it is deliberately kept apart from the surcharges no
 * carton change touches.
 *
 * THE CARTONS ARE EDITABLE, AND THEY LIVE IN THE LINK
 * The brief called for three box averages, and that is what the engine prices — but a reader whose worst
 * carton is none of the three cannot use a fixed profile. So each carton's five numbers are flattened into
 * the form state (`c1Length`, `c1Width`, …), which keeps the URL contract flat and means a buyer can send
 * the exact carton they are arguing about. Names stay fixed (A/B/C): they are the reader's ordering, not
 * a measurement.
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

/**
 * The form state: every engine scalar plus each carton's five numbers, flattened.
 * Flat because the URL contract is flat — a nested object in a query string needs an encoding this site
 * has no reason to invent, and fifteen short keys cost about 150 characters.
 */
interface ParcelFormState {
	monthlyShipmentVolume: number;
	currentDimDivisor: number;
	targetNegotiatedDivisor: number;
	incrementalRatePerLb: number;
	baseRatePerParcel: number;
	residentialSharePct: number;
	residentialSurcharge: number;
	deliveryAreaShare: number;
	deliveryAreaFee: number;
	cartonHeightReductionInches: number;
	c1Length: number;
	c1Width: number;
	c1Height: number;
	c1Weight: number;
	c1Share: number;
	c2Length: number;
	c2Width: number;
	c2Height: number;
	c2Weight: number;
	c2Share: number;
	c3Length: number;
	c3Width: number;
	c3Height: number;
	c3Weight: number;
	c3Share: number;
}

const [CARTON_A, CARTON_B, CARTON_C] = DEFAULT_PARCEL_DIM_STATE.cartons;

const DEFAULT_FORM: ParcelFormState = {
	monthlyShipmentVolume: DEFAULT_PARCEL_DIM_STATE.monthlyShipmentVolume,
	currentDimDivisor: DEFAULT_PARCEL_DIM_STATE.currentDimDivisor,
	targetNegotiatedDivisor: DEFAULT_PARCEL_DIM_STATE.targetNegotiatedDivisor,
	incrementalRatePerLb: DEFAULT_PARCEL_DIM_STATE.incrementalRatePerLb,
	baseRatePerParcel: DEFAULT_PARCEL_DIM_STATE.baseRatePerParcel,
	residentialSharePct: DEFAULT_PARCEL_DIM_STATE.residentialSharePct,
	residentialSurcharge: DEFAULT_PARCEL_DIM_STATE.residentialSurcharge,
	deliveryAreaShare: DEFAULT_PARCEL_DIM_STATE.deliveryAreaSurchargePct,
	deliveryAreaFee: DEFAULT_PARCEL_DIM_STATE.dasFeeAvg,
	cartonHeightReductionInches: DEFAULT_PARCEL_DIM_STATE.cartonHeightReductionInches,
	c1Length: CARTON_A.lengthInches,
	c1Width: CARTON_A.widthInches,
	c1Height: CARTON_A.heightInches,
	c1Weight: CARTON_A.actualWeightLbs,
	c1Share: CARTON_A.volumeSharePct,
	c2Length: CARTON_B.lengthInches,
	c2Width: CARTON_B.widthInches,
	c2Height: CARTON_B.heightInches,
	c2Weight: CARTON_B.actualWeightLbs,
	c2Share: CARTON_B.volumeSharePct,
	c3Length: CARTON_C.lengthInches,
	c3Width: CARTON_C.widthInches,
	c3Height: CARTON_C.heightInches,
	c3Weight: CARTON_C.actualWeightLbs,
	c3Share: CARTON_C.volumeSharePct
};

const SPEC: UrlSpec<ParcelFormState> = {
	monthlyShipmentVolume: { key: 'vol', min: 0, max: 5_000_000 },
	currentDimDivisor: { key: 'div', min: 90, max: 400 },
	targetNegotiatedDivisor: { key: 'tdiv', min: 90, max: 400 },
	incrementalRatePerLb: { key: 'rate', min: 0, max: 50, decimals: 3 },
	baseRatePerParcel: { key: 'base', min: 0, max: 500, decimals: 2 },
	residentialSharePct: { key: 'res', min: 0, max: 1, decimals: 3 },
	residentialSurcharge: { key: 'resfee', min: 0, max: 100, decimals: 2 },
	deliveryAreaShare: { key: 'das', min: 0, max: 1, decimals: 3 },
	deliveryAreaFee: { key: 'dasfee', min: 0, max: 100, decimals: 2 },
	cartonHeightReductionInches: { key: 'cut', min: 0, max: 12, decimals: 1 },
	c1Length: { key: 'a1l', min: 1, max: 96 },
	c1Width: { key: 'a1w', min: 1, max: 96 },
	c1Height: { key: 'a1h', min: 1, max: 96 },
	c1Weight: { key: 'a1lb', min: 0.1, max: 150, decimals: 2 },
	c1Share: { key: 'a1sh', min: 0, max: 1, decimals: 3 },
	c2Length: { key: 'b2l', min: 1, max: 96 },
	c2Width: { key: 'b2w', min: 1, max: 96 },
	c2Height: { key: 'b2h', min: 1, max: 96 },
	c2Weight: { key: 'b2lb', min: 0.1, max: 150, decimals: 2 },
	c2Share: { key: 'b2sh', min: 0, max: 1, decimals: 3 },
	c3Length: { key: 'c3l', min: 1, max: 96 },
	c3Width: { key: 'c3w', min: 1, max: 96 },
	c3Height: { key: 'c3h', min: 1, max: 96 },
	c3Weight: { key: 'c3lb', min: 0.1, max: 150, decimals: 2 },
	c3Share: { key: 'c3sh', min: 0, max: 1, decimals: 3 }
};

export default function ParcelDimCalculator() {
	const { state, setField, reset } = useUrlState(DEFAULT_FORM, SPEC);

	const engineState = useMemo<ParcelDimState>(
		() => ({
			monthlyShipmentVolume: state.monthlyShipmentVolume,
			currentDimDivisor: state.currentDimDivisor,
			targetNegotiatedDivisor: state.targetNegotiatedDivisor,
			incrementalRatePerLb: state.incrementalRatePerLb,
			baseRatePerParcel: state.baseRatePerParcel,
			residentialSharePct: state.residentialSharePct,
			residentialSurcharge: state.residentialSurcharge,
			deliveryAreaSurchargePct: state.deliveryAreaShare,
			dasFeeAvg: state.deliveryAreaFee,
			cartonHeightReductionInches: state.cartonHeightReductionInches,
			cartons: [
				{
					id: CARTON_A.id,
					name: CARTON_A.name,
					lengthInches: state.c1Length,
					widthInches: state.c1Width,
					heightInches: state.c1Height,
					actualWeightLbs: state.c1Weight,
					volumeSharePct: state.c1Share
				},
				{
					id: CARTON_B.id,
					name: CARTON_B.name,
					lengthInches: state.c2Length,
					widthInches: state.c2Width,
					heightInches: state.c2Height,
					actualWeightLbs: state.c2Weight,
					volumeSharePct: state.c2Share
				},
				{
					id: CARTON_C.id,
					name: CARTON_C.name,
					lengthInches: state.c3Length,
					widthInches: state.c3Width,
					heightInches: state.c3Height,
					actualWeightLbs: state.c3Weight,
					volumeSharePct: state.c3Share
				}
			]
		}),
		[state]
	);

	const result = useMemo(() => computeParcelDim(engineState), [engineState]);

	/** One carton's five numbers, as a closed group so the rail does not open with fifteen controls. */
	const cartonGroup = (index: 1 | 2 | 3, name: string) => {
		const field = (suffix: 'Length' | 'Width' | 'Height' | 'Weight' | 'Share') =>
			`c${index}${suffix}` as keyof ParcelFormState;
		return (
			<Group title={name} count={5}>
				<NumberField
					label="Length"
					value={state[field('Length')]}
					onChange={(value) => setField(field('Length'), value)}
					min={1}
					max={96}
					step={1}
					affix="in"
				/>
				<NumberField
					label="Width"
					value={state[field('Width')]}
					onChange={(value) => setField(field('Width'), value)}
					min={1}
					max={96}
					step={1}
					affix="in"
				/>
				<NumberField
					label="Height"
					value={state[field('Height')]}
					onChange={(value) => setField(field('Height'), value)}
					min={1}
					max={96}
					step={1}
					affix="in"
					hint="Right-sizing takes the height out, so this is the dimension to check first."
				/>
				<NumberField
					label="Scale weight"
					value={state[field('Weight')]}
					onChange={(value) => setField(field('Weight'), value)}
					min={0.1}
					max={150}
					step={0.1}
					affix="lb"
					decimals={2}
				/>
				<NumberField
					label="Share of volume"
					value={state[field('Share')]}
					onChange={(value) => setField(field('Share'), value)}
					min={0}
					max={1}
					step={0.01}
					decimals={2}
					hint="Decimal: 0.50 is half the parcels. Shares are normalised to their total."
				/>
			</Group>
		);
	};

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

					<Group title="Carton profiles" count={15}>
						{cartonGroup(1, CARTON_A.name)}
						{cartonGroup(2, CARTON_B.name)}
						{cartonGroup(3, CARTON_C.name)}
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
							value={state.deliveryAreaShare}
							onChange={(value) => setField('deliveryAreaShare', value)}
							min={0}
							max={1}
							step={0.01}
							decimals={2}
						/>
						<NumberField
							label="Delivery-area fee"
							value={state.deliveryAreaFee}
							onChange={(value) => setField('deliveryAreaFee', value)}
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
				label="When three cartons is not the whole invoice"
				body="This estimate prices the cartons you entered. ParcelProof reads the carrier's invoice and shipment file line by line, recomputes every rule-triggered charge and names the ones with no basis."
				appName="ParcelProof"
				href={appUrl('/parcelproof')}
			/>
		</EngineLayout>
	);
}
