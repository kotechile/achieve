/**
 * Master Asset & Software TCO Calculator — the instrument.
 *
 * WHY THIS IS ONE GENERIC RENDERER
 * The old version had four hand-built layout branches and eight bespoke output blocks, which is
 * how a "break-even" label ended up displayed next to a number that contradicted it. The engine
 * now returns a decision record (two options, a breakdown each, a cumulative series, premises) and
 * this file renders exactly that — one contract, four modes. If a figure appears on screen it was
 * produced by `DecisionIntelligenceEngine`, never by JSX.
 *
 * STYLING
 * Every class here is a `.di-*` rule declared in `aichieve.css` §6, not a utility soup. The bay
 * is flattened by two `!important` policy layers (§4a light surfaces, §4b contrast re-pins);
 * writing against named classes keeps the instrument out of that fight and stops another round of
 * hex literals written without a `text-[…]` wrapper, which is how 20 dead classes got in.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
	DecisionIntelligenceEngine,
	defaultComplianceCost,
	type DecisionIntelligenceInputs,
	type DecisionMode,
	type DecisionResult,
	type OptionSide
} from '../../../lib/calculators/decisionIntelligence';

const STORAGE_KEY = 'gini_master_tco_inputs_v2';

const INITIAL_INPUTS: DecisionIntelligenceInputs = {
	activeMode: 'enterprise_ciam',

	// Enterprise
	mau: 25_000,
	devRate: 85,
	buildMonths: 3,
	buildTeam: 1.5,
	maintFtePct: 50,
	complianceLevel: 'soc2',
	complianceCostAnnual: 75_000,
	opportunityCost3Yr: 150_000,
	integrationHours: 8,
	hasSunkCostFallacy: false,
	hasKeyPersonRisk: false,
	hasTinkeringTax: false,

	// Per-use asset
	cpuStickerPrice: 3_000,
	cpuSecondaryCost: 1.5,
	cpuOutsourceCost: 6,
	cpuWeeklyUses: 5,
	cpuLifespanYears: 5,
	cpuResidualPct: 35,
	cpuAspirationalCheck: false,

	// Repair or replace
	repairAssetType: 'infrastructure',
	repairAssetAge: 11,
	repairCost: 600,
	repairReplacementCost: 6_800,
	repairExtraLifeYears: 3,
	repairReplacementLifeYears: 12,

	// Tinkering tax
	tinkerTroubleshootHours: 4,
	tinkerTimeValue: 50,
	tinkerSubscriptionCost: 15,
	tinkerHobbyOffset: false
};

const MODES: { id: DecisionMode; label: string; question: string }[] = [
	{ id: 'enterprise_ciam', label: 'Build vs buy', question: 'Own the auth stack or rent one' },
	{ id: 'personal_cpu', label: 'Cost per use', question: 'Own the asset or pay each time' },
	{ id: 'personal_repair', label: 'Repair or replace', question: 'Fix it or replace it' },
	{ id: 'personal_tinkering', label: 'Tinkering tax', question: 'Free workaround or paid app' }
];

/** Presets for the per-use mode. Sticker, upkeep, outsource rate, uses a week, years, residual. */
const PRESETS: { id: string; label: string; values: Partial<DecisionIntelligenceInputs> }[] = [
	{
		id: 'coffee',
		label: 'Espresso machine',
		values: {
			cpuStickerPrice: 3_000,
			cpuSecondaryCost: 1.5,
			cpuOutsourceCost: 6,
			cpuWeeklyUses: 5,
			cpuLifespanYears: 5,
			cpuResidualPct: 35
		}
	},
	{
		id: 'bike',
		label: 'Road bike',
		values: {
			cpuStickerPrice: 2_500,
			cpuSecondaryCost: 1.73,
			cpuOutsourceCost: 15,
			cpuWeeklyUses: 3,
			cpuLifespanYears: 3,
			cpuResidualPct: 45
		}
	},
	{
		id: 'gpu',
		label: 'Local GPU rig',
		values: {
			cpuStickerPrice: 3_500,
			cpuSecondaryCost: 0.45,
			cpuOutsourceCost: 1.8,
			cpuWeeklyUses: 12,
			cpuLifespanYears: 3,
			cpuResidualPct: 40
		}
	}
];

/* ── helpers ───────────────────────────────────────────────────────────────── */

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

const money = (value: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: Math.abs(value) < 100 ? 2 : 0
	}).format(Number.isFinite(value) ? value : 0);

const int = (value: number) =>
	new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
		Number.isFinite(value) ? value : 0
	);

const compactMoney = (value: number) => {
	const abs = Math.abs(value);
	if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
	if (abs >= 1_000) return `$${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
	return `$${Math.round(value)}`;
};

const niceMax = (value: number) => {
	if (!Number.isFinite(value) || value <= 0) return 1;
	const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
	for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
		if (value <= step * magnitude) return step * magnitude;
	}
	return 10 * magnitude;
};

/* ── primitives ───────────────────────────────────────────────────────────── */

interface FieldProps {
	id: string;
	label: string;
	hint?: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
	prefix?: string;
	suffix?: string;
	/** Digits shown in the plate; keeps the input from jumping width as the value changes. */
	decimals?: number;
}

function Field({
	id,
	label,
	hint,
	value,
	min,
	max,
	step,
	onChange,
	prefix,
	suffix,
	decimals = 0
}: FieldProps) {
	const describedBy = hint ? `${id}-hint` : undefined;
	// Width is derived from the formatted figure so the plate does not jitter as the value moves.
	const plateWidth = `${Math.max(3, (decimals ? value.toFixed(decimals) : String(Math.round(value))).length + 1)}ch`;
	// The track fills to the value, so a slider reads as a quantity rather than a grey groove.
	const fillPct = `${((clamp(value, min, max) - min) / (max - min || 1)) * 100}%`;

	return (
		<div className="di-field">
			<div className="di-field__head">
				<label className="di-field__label" htmlFor={id}>
					{label}
				</label>
				<span className="di-plate">
					{prefix ? <span className="di-plate__affix">{prefix}</span> : null}
					<input
						id={id}
						className="di-plate__input"
						type="number"
						inputMode="decimal"
						style={{ width: plateWidth }}
						value={decimals ? Number(value.toFixed(decimals)) : Math.round(value)}
						min={min}
						max={max}
						step={step}
						aria-describedby={describedBy}
						onChange={(event) => {
							const next = Number(event.target.value);
							if (event.target.value !== '' && Number.isFinite(next)) onChange(next);
						}}
						onBlur={(event) => onChange(clamp(Number(event.target.value), min, max))}
					/>
					{suffix ? <span className="di-plate__affix">{suffix}</span> : null}
				</span>
			</div>
			<input
				className="di-range"
				type="range"
				min={min}
				max={max}
				step={step}
				value={clamp(value, min, max)}
				style={{ '--di-pct': fillPct } as React.CSSProperties}
				aria-label={`${label} slider`}
				aria-describedby={describedBy}
				onChange={(event) => onChange(Number(event.target.value))}
			/>
			{hint ? (
				<p className="di-field__hint" id={`${id}-hint`}>
					{hint}
				</p>
			) : null}
		</div>
	);
}

function Stepper({
	id,
	label,
	hint,
	value,
	min,
	max,
	step,
	onChange,
	suffix
}: FieldProps) {
	return (
		<div className="di-field di-field--stepper">
			<div className="di-field__head">
				<label className="di-field__label" htmlFor={id}>
					{label}
				</label>
			</div>
			<div className="di-stepper">
				<button
					type="button"
					className="di-stepper__btn"
					aria-label={`Decrease ${label}`}
					onClick={() => onChange(clamp(value - step, min, max))}
				>
					−
				</button>
				<input
					id={id}
					className="di-stepper__value"
					type="number"
					inputMode="decimal"
					value={value}
					min={min}
					max={max}
					step={step}
					onChange={(event) => {
						const next = Number(event.target.value);
						if (Number.isFinite(next)) onChange(clamp(next, min, max));
					}}
				/>
				<span className="di-stepper__suffix">{suffix}</span>
				<button
					type="button"
					className="di-stepper__btn"
					aria-label={`Increase ${label}`}
					onClick={() => onChange(clamp(value + step, min, max))}
				>
					+
				</button>
			</div>
			{hint ? <p className="di-field__hint">{hint}</p> : null}
		</div>
	);
}

interface SegmentedProps<T extends string> {
	legend: string;
	name: string;
	value: T;
	options: { value: T; label: string }[];
	onChange: (value: T) => void;
}

function Segmented<T extends string>({ legend, name, value, options, onChange }: SegmentedProps<T>) {
	return (
		<fieldset className="di-segmented">
			<legend className="di-legend">{legend}</legend>
			<div className="di-segmented__row">
				{options.map((option) => (
					<label key={option.value} className="di-segmented__option">
						<input
							type="radio"
							name={name}
							value={option.value}
							checked={value === option.value}
							onChange={() => onChange(option.value)}
						/>
						<span>{option.label}</span>
					</label>
				))}
			</div>
		</fieldset>
	);
}

/* ── the chart ────────────────────────────────────────────────────────────── */

function SpendChart({ result }: { result: DecisionResult }) {
	if (!result.series.length) return null;

	const width = 660;
	const height = 250;
	const pad = { top: 16, right: 78, bottom: 26, left: 58 };
	const plotW = width - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;

	const count = result.series[0].points.length;
	const peak = niceMax(Math.max(...result.series.flatMap((line) => line.points), 1));
	const x = (index: number) => pad.left + (index / Math.max(count - 1, 1)) * plotW;
	const y = (value: number) => pad.top + (1 - value / peak) * plotH;

	const ticks = [0, peak / 2, peak];
	const [first, second] = result.series;
	// The leader is whichever option ends cheaper — never a hard-coded side, because "BUY" means
	// the second option in the build-vs-buy mode and the first one in every other mode.
	const leader = first.points[count - 1] <= second.points[count - 1] ? first : second;
	const trailer = leader === first ? second : first;
	// Roughly seven marks across the axis, whichever horizon is in play.
	const labelEvery = Math.max(1, Math.ceil(count / 7));

	const summary = `${leader.label} ends at ${compactMoney(
		leader.points[count - 1]
	)} against ${compactMoney(trailer.points[count - 1])}.${
		result.crossoverMonth !== null
			? ` The lines cross at month ${result.crossoverMonth}.`
			: ' The lines do not cross inside the horizon.'
	}`;

	return (
		<figure className="di-chart">
			<figcaption className="di-chart__cap">
				<span className="di-legend">Cumulative spend</span>
				<span className="di-chart__note">{result.horizonLabel}</span>
			</figcaption>
			<svg
				className="di-chart__svg"
				viewBox={`0 0 ${width} ${height}`}
				role="img"
				aria-label={`Cumulative spend, two options. ${summary}`}
			>
				{ticks.map((tick) => (
					<g key={tick}>
						<line
							x1={pad.left}
							x2={width - pad.right}
							y1={y(tick)}
							y2={y(tick)}
							className="di-chart__grid"
						/>
						<text x={pad.left - 10} y={y(tick) + 3} textAnchor="end" className="di-chart__tick">
							{compactMoney(tick)}
						</text>
					</g>
				))}

				{result.seriesLabels.map((label, index) =>
					label && (index === 0 || index === count - 1 || index % labelEvery === 0) ? (
						<text
							key={`${label}-${index}`}
							x={x(index)}
							y={height - 6}
							textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
							className="di-chart__tick"
						>
							{label}
						</text>
					) : null
				)}

				{result.crossoverMonth !== null ? (
					<g>
						<line
							x1={x(result.crossoverMonth)}
							x2={x(result.crossoverMonth)}
							y1={pad.top}
							y2={height - pad.bottom}
							className="di-chart__cross"
						/>
						<text
							x={x(result.crossoverMonth)}
							y={pad.top - 4}
							textAnchor="middle"
							className="di-chart__crosslabel"
						>
							crosses m{result.crossoverMonth}
						</text>
					</g>
				) : null}

				{result.series.map((line, lineIndex) => {
					const path = line.points
						.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(point).toFixed(1)}`)
						.join(' ');
					const last = line.points[line.points.length - 1];
					return (
						<g key={line.key} className={`di-line di-line--${lineIndex}`}>
							<path
								d={path}
								fill="none"
								className="di-chart__stroke"
								strokeDasharray={lineIndex === 1 ? '5 4' : undefined}
							/>
							<circle cx={x(line.points.length - 1)} cy={y(last)} r="3" className="di-chart__dot" />
							<text
								x={width - pad.right + 8}
								y={y(last) + 4}
								className="di-chart__endlabel"
							>
								{compactMoney(last)}
							</text>
						</g>
					);
				})}
			</svg>

			<ul className="di-chart__legend">
				{result.series.map((line, index) => (
					<li key={line.key}>
						<span className={`di-swatch di-swatch--${index}`} aria-hidden="true" />
						<span>{line.label}</span>
						<span className="di-chart__legendvalue">
							{money(line.points[line.points.length - 1])}
						</span>
					</li>
				))}
			</ul>
		</figure>
	);
}

/* ── the ledger ───────────────────────────────────────────────────────────── */

function Side({ side, scale, index }: { side: OptionSide; scale: number; index: number }) {
	return (
		<div className={`di-side di-side--${index}`}>
			<p className="di-side__eyebrow">{side.eyebrow}</p>
			<h3 className="di-side__label">{side.label}</h3>
			<p className="di-side__total">
				{money(side.total)}
				{side.totalLabel ? <span className="di-side__unit">{side.totalLabel}</span> : null}
			</p>
			<ul className="di-side__rows">
				{side.rows.map((row) => {
					const share = scale > 0 ? Math.min(Math.abs(row.amount) / scale, 1) : 0;
					return (
						<li key={row.label} className="di-row">
							<span className="di-row__bar" aria-hidden="true">
								<span
									className={`di-row__fill${row.hidden ? ' di-row__fill--hidden' : ''}`}
									style={{ width: `${Math.max(share * 100, row.amount ? 2.3 : 0)}%` }}
								/>
							</span>
							<span className="di-row__label">
								{row.label}
								{row.hidden ? <span className="di-row__mark" title="Not on the first invoice">off invoice</span> : null}
								{row.note ? <span className="di-row__note">{row.note}</span> : null}
							</span>
							<span className="di-row__amount">
								{row.amount === 0 ? '—' : money(row.amount)}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

/* ── the instrument ───────────────────────────────────────────────────────── */

export default function DecisionIntelligenceCalculator() {
	const [inputs, setInputs] = useState<DecisionIntelligenceInputs>(INITIAL_INPUTS);
	const [isLoaded, setIsLoaded] = useState(false);
	const [copied, setCopied] = useState(false);
	const uid = useId();
	const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored) as Partial<DecisionIntelligenceInputs>;
				setInputs((current) => ({ ...current, ...parsed }));
			} catch {
				// A corrupt payload is not worth a broken instrument: fall back to defaults silently.
				localStorage.removeItem(STORAGE_KEY);
			}
		}
		setIsLoaded(true);
	}, []);

	useEffect(() => {
		if (isLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
	}, [inputs, isLoaded]);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 2200);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const updateInput = <K extends keyof DecisionIntelligenceInputs>(
		key: K,
		value: DecisionIntelligenceInputs[K]
	) => setInputs((current) => ({ ...current, [key]: value }));

	const result = useMemo(() => DecisionIntelligenceEngine.calculate(inputs), [inputs]);

	const unresolved = result.premises.filter((premise) => premise.checked).length;
	const scale = Math.max(...result.sides.map((side) => side.total), 1);
	const delta = Math.abs(result.sides[0].total - result.sides[1].total);
	const hasOffInvoice = result.sides.some((side) => side.rows.some((row) => row.hidden));

	const onTabKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		const index = MODES.findIndex((mode) => mode.id === inputs.activeMode);
		let next: number | null = null;
		if (event.key === 'ArrowRight') next = (index + 1) % MODES.length;
		if (event.key === 'ArrowLeft') next = (index - 1 + MODES.length) % MODES.length;
		if (event.key === 'Home') next = 0;
		if (event.key === 'End') next = MODES.length - 1;
		if (next === null) return;
		event.preventDefault();
		updateInput('activeMode', MODES[next].id);
		tabsRef.current[next]?.focus();
	};

	const copySummary = async () => {
		const lines = [
			`${MODES.find((mode) => mode.id === inputs.activeMode)?.label} — ${result.horizonLabel}`,
			`Verdict: ${result.verdictLabel}`,
			result.headline,
			''
		];
		result.sides.forEach((side) => {
			lines.push(`${side.label}: ${money(side.total)}`);
			side.rows.forEach((row) => {
				lines.push(`  ${row.label}${row.hidden ? ' (off invoice)' : ''}: ${money(row.amount)}`);
			});
			lines.push('');
		});
		result.figures.forEach((figure) => lines.push(`${figure.label}: ${figure.value}`));
		lines.push(`Unresolved premises: ${unresolved} of ${result.premises.length}`);
		try {
			await navigator.clipboard.writeText(lines.join('\n'));
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	const reset = () => {
		setInputs(INITIAL_INPUTS);
		setCopied(false);
	};

	return (
		<div className="di" data-mode={inputs.activeMode}>
			{/* ── modes ─────────────────────────────────────────────────────── */}
			<div className="di__tabs" role="tablist" aria-label="Decision mode">
				{MODES.map((mode, index) => {
					const active = mode.id === inputs.activeMode;
					return (
						<button
							key={mode.id}
							ref={(node) => {
								tabsRef.current[index] = node;
							}}
							id={`${uid}-tab-${mode.id}`}
							type="button"
							role="tab"
							aria-selected={active}
							aria-controls={`${uid}-panel`}
							tabIndex={active ? 0 : -1}
							className="di__tab"
							onClick={() => updateInput('activeMode', mode.id)}
							onKeyDown={onTabKey}
						>
							<span className="di__tablabel">{mode.label}</span>
							<span className="di__tabq">{mode.question}</span>
						</button>
					);
				})}
			</div>

			<div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${inputs.activeMode}`} className="di__grid">
				{/* ── assumptions ─────────────────────────────────────────────── */}
				<div className="di__rail">
					{inputs.activeMode === 'enterprise_ciam' && (
						<>
							<fieldset className="di-fieldset">
								<legend className="di-legend">01 · Cost basis</legend>
								<Field
									id={`${uid}-mau`}
									label="Monthly active users"
									hint="Drives the managed platform's volume tier."
									value={inputs.mau}
									min={1_000}
									max={500_000}
									step={1_000}
									onChange={(value) => updateInput('mau', value)}
								/>
								<Field
									id={`${uid}-rate`}
									label="Loaded engineer rate"
									hint="Salary plus overhead, per hour. Both sides use it."
									prefix="$"
									suffix="/h"
									value={inputs.devRate}
									min={40}
									max={250}
									step={5}
									onChange={(value) => updateInput('devRate', value)}
								/>
								<div className="di-pair">
									<Stepper
										id={`${uid}-months`}
										label="Build window"
										suffix="months"
										value={inputs.buildMonths}
										min={1}
										max={24}
										step={1}
										onChange={(value) => updateInput('buildMonths', value)}
									/>
									<Stepper
										id={`${uid}-team`}
										label="Engineers"
										suffix="FTE"
										value={inputs.buildTeam}
										min={0.5}
										max={10}
										step={0.5}
										onChange={(value) => updateInput('buildTeam', value)}
									/>
								</div>
							</fieldset>

							<fieldset className="di-fieldset">
								<legend className="di-legend">02 · Cost you do not see on the invoice</legend>
								<Field
									id={`${uid}-maint`}
									label="Maintenance load"
									hint="Share of one engineer held on the custom system, in perpetuity."
									suffix="% FTE"
									value={inputs.maintFtePct}
									min={0}
									max={100}
									step={5}
									onChange={(value) => updateInput('maintFtePct', value)}
								/>
								<Field
									id={`${uid}-opp`}
									label="Roadmap opportunity, 3 years"
									hint="Value of the features the team does not ship while maintaining this."
									prefix="$"
									value={inputs.opportunityCost3Yr}
									min={0}
									max={900_000}
									step={10_000}
									onChange={(value) => updateInput('opportunityCost3Yr', value)}
								/>
								<Field
									id={`${uid}-comp`}
									label="Compliance cost per year"
									hint="Audit, evidence collection and the controls that follow it. The vendor carries this if you buy."
									prefix="$"
									value={inputs.complianceCostAnnual}
									min={0}
									max={300_000}
									step={5_000}
									onChange={(value) => updateInput('complianceCostAnnual', value)}
								/>
								<Segmented
									legend="Compliance target"
									name={`${uid}-compliance`}
									value={inputs.complianceLevel}
									options={[
										{ value: 'none', label: 'None' },
										{ value: 'soc2', label: 'SOC 2 II' },
										{ value: 'hipaa', label: 'HIPAA' }
									]}
									onChange={(level) => {
										updateInput('complianceLevel', level);
										updateInput('complianceCostAnnual', defaultComplianceCost(level));
									}}
								/>
								<Field
									id={`${uid}-integ`}
									label="Integration effort"
									hint="Hours to wire the managed platform in."
									suffix="hours"
									value={inputs.integrationHours}
									min={0}
									max={120}
									step={2}
									onChange={(value) => updateInput('integrationHours', value)}
								/>
							</fieldset>
						</>
					)}

					{inputs.activeMode === 'personal_cpu' && (
						<>
							<fieldset className="di-fieldset">
								<legend className="di-legend">01 · Cost basis</legend>
								<div className="di-presets">
									{PRESETS.map((preset) => (
										<button
											key={preset.id}
											type="button"
											className="di-preset"
											onClick={() => setInputs((current) => ({ ...current, ...preset.values }))}
										>
											{preset.label}
										</button>
									))}
								</div>
								<Field
									id={`${uid}-sticker`}
									label="Sticker price"
									prefix="$"
									value={inputs.cpuStickerPrice}
									min={10}
									max={20_000}
									step={50}
									onChange={(value) => updateInput('cpuStickerPrice', value)}
								/>
								<Field
									id={`${uid}-uses`}
									label="Uses per week"
									hint="Be honest here — this is the number the verdict turns on."
									suffix="/wk"
									value={inputs.cpuWeeklyUses}
									min={1}
									max={100}
									step={1}
									onChange={(value) => updateInput('cpuWeeklyUses', value)}
								/>
								<Field
									id={`${uid}-outsource`}
									label="Outsourced cost per use"
									hint="Café price, rideshare fare, or cloud rate for the same job."
									prefix="$"
									value={inputs.cpuOutsourceCost}
									min={0.5}
									max={200}
									step={0.5}
									decimals={2}
									onChange={(value) => updateInput('cpuOutsourceCost', value)}
								/>
							</fieldset>

							<fieldset className="di-fieldset">
								<legend className="di-legend">02 · Cost you do not see on the invoice</legend>
								<Field
									id={`${uid}-secondary`}
									label="Operating cost per use"
									hint="Beans, charging, consumables, the parts that wear."
									prefix="$"
									value={inputs.cpuSecondaryCost}
									min={0}
									max={50}
									step={0.1}
									decimals={2}
									onChange={(value) => updateInput('cpuSecondaryCost', value)}
								/>
								<Field
									id={`${uid}-residual`}
									label="Resale value at exit"
									hint="Share of the sticker you get back when you sell it on."
									suffix="%"
									value={inputs.cpuResidualPct}
									min={0}
									max={90}
									step={5}
									onChange={(value) => updateInput('cpuResidualPct', value)}
								/>
								<Stepper
									id={`${uid}-lifespan`}
									label="Lifespan"
									hint="Upkeep is reserved at 5% of the sticker per year."
									suffix="years"
									value={inputs.cpuLifespanYears}
									min={1}
									max={15}
									step={1}
									onChange={(value) => updateInput('cpuLifespanYears', value)}
								/>
							</fieldset>
						</>
					)}

					{inputs.activeMode === 'personal_repair' && (
						<>
							<fieldset className="di-fieldset">
								<legend className="di-legend">01 · The asset</legend>
								<Segmented
									legend="Asset class"
									name={`${uid}-asset`}
									value={inputs.repairAssetType}
									options={[
										{ value: 'infrastructure', label: 'Building systems' },
										{ value: 'electronics', label: 'Electronics' }
									]}
									onChange={(value) => updateInput('repairAssetType', value)}
								/>
								<Field
									id={`${uid}-age`}
									label="Age"
									hint="Index threshold is 5,000 for building systems, 1,500 for electronics."
									suffix="years"
									value={inputs.repairAssetAge}
									min={0}
									max={30}
									step={1}
									onChange={(value) => updateInput('repairAssetAge', value)}
								/>
								<Field
									id={`${uid}-repair`}
									label="Repair quote"
									prefix="$"
									value={inputs.repairCost}
									min={50}
									max={25_000}
									step={50}
									onChange={(value) => updateInput('repairCost', value)}
								/>
								<Field
									id={`${uid}-replace-cost`}
									label="Replacement price"
									hint="Same specification, delivered and installed."
									prefix="$"
									value={inputs.repairReplacementCost}
									min={100}
									max={60_000}
									step={100}
									onChange={(value) => updateInput('repairReplacementCost', value)}
								/>
							</fieldset>

							<fieldset className="di-fieldset">
								<legend className="di-legend">02 · Life bought</legend>
								<Stepper
									id={`${uid}-extra-life`}
									label="Years the repair buys"
									suffix="years"
									value={inputs.repairExtraLifeYears}
									min={1}
									max={10}
									step={1}
									onChange={(value) => updateInput('repairExtraLifeYears', value)}
								/>
								<Stepper
									id={`${uid}-replace-life`}
									label="Years a replacement lasts"
									suffix="years"
									value={inputs.repairReplacementLifeYears}
									min={1}
									max={30}
									step={1}
									onChange={(value) => updateInput('repairReplacementLifeYears', value)}
								/>
							</fieldset>
						</>
					)}

					{inputs.activeMode === 'personal_tinkering' && (
						<>
							<fieldset className="di-fieldset">
								<legend className="di-legend">01 · The workaround</legend>
								<Field
									id={`${uid}-hours`}
									label="Tinkering hours per month"
									hint="Debugging the stack, fixing syncs, re-authenticating things."
									suffix="h/mo"
									value={inputs.tinkerTroubleshootHours}
									min={0.5}
									max={40}
									step={0.5}
									decimals={1}
									onChange={(value) => updateInput('tinkerTroubleshootHours', value)}
								/>
								<Field
									id={`${uid}-timevalue`}
									label="Value of an hour"
									hint="What that hour would be worth spent on the work you are paid for."
									prefix="$"
									suffix="/h"
									value={inputs.tinkerTimeValue}
									min={10}
									max={250}
									step={5}
									onChange={(value) => updateInput('tinkerTimeValue', value)}
								/>
							</fieldset>
							<fieldset className="di-fieldset">
								<legend className="di-legend">02 · The paid alternative</legend>
								<Field
									id={`${uid}-sub`}
									label="Subscription"
									suffix="/mo"
									prefix="$"
									value={inputs.tinkerSubscriptionCost}
									min={2}
									max={500}
									step={1}
									onChange={(value) => updateInput('tinkerSubscriptionCost', value)}
								/>
							</fieldset>
						</>
					)}

					<fieldset className="di-fieldset di-fieldset--premises">
						<legend className="di-legend">03 · Premise check</legend>
						<p className="di-note">
							These do not move the arithmetic. They mark the parts of the decision the arithmetic cannot
							settle, which is what a reviewer will ask about.
						</p>
						{result.premises.map((premise) => (
							<label key={premise.label} className="di-premise">
								<input
									type="checkbox"
									checked={premise.checked}
									onChange={(event) => {
										const flag =
											inputs.activeMode === 'enterprise_ciam'
												? premise.label === 'Sunk-cost pull'
													? 'hasSunkCostFallacy'
													: premise.label === 'Single-maintainer risk'
														? 'hasKeyPersonRisk'
														: 'hasTinkeringTax'
												: inputs.activeMode === 'personal_cpu'
													? 'cpuAspirationalCheck'
													: 'tinkerHobbyOffset';
										updateInput(flag, event.target.checked);
									}}
								/>
								<span className="di-premise__body">
									<span className="di-premise__label">{premise.label}</span>
									<span className="di-premise__statement">{premise.statement}</span>
								</span>
							</label>
						))}
						<p className="di-premise__status" data-state={unresolved ? 'warn' : 'ok'}>
							{unresolved
								? `${unresolved} of ${result.premises.length} unresolved — the number stands, the premise does not.`
								: 'No unresolved premises logged.'}
						</p>
					</fieldset>
				</div>

				{/* ── readout ─────────────────────────────────────────────────── */}
				<div className="di__readout">
					<div className="di-verdict" data-tone={result.tossUp ? 'flat' : 'clear'} aria-live="polite">
						<div className="di-verdict__top">
							<span className="di-legend">Verdict</span>
							<span className="di-chip">{result.verdict}</span>
						</div>
						<p className="di-verdict__call">{result.verdictLabel}</p>
						<p className="di-verdict__headline">{result.headline}</p>
						<p className="di-verdict__horizon">{result.horizonLabel}</p>
					</div>

					<dl className="di-figures">
						{result.figures.map((figure) => (
							<div key={figure.label} className="di-figure">
								<dt className="di-figure__label">{figure.label}</dt>
								<dd className="di-figure__value">{figure.value}</dd>
								{figure.note ? <dd className="di-figure__note">{figure.note}</dd> : null}
							</div>
						))}
					</dl>

					<SpendChart result={result} />

					<div className="di-ledger">
						<div className="di-ledger__head">
							<span className="di-legend">Ledger</span>
							<span className="di-chart__note">{result.horizonLabel}</span>
						</div>
						<div className="di-ledger__sides">
							{result.sides.map((side, index) => (
								<Side key={side.key} side={side} scale={scale} index={index} />
							))}
						</div>
						<p className="di-ledger__foot">
							{money(delta)}
							{result.sides[0].totalLabel ?? ''} apart.
							{hasOffInvoice ? (
								<>
									{' '}
									Rows marked <span className="di-row__mark">off invoice</span> are the costs that do not
									appear on the first quote.
								</>
							) : null}
						</p>
					</div>

					<div className="di-actions">
						<button type="button" className="di-action" onClick={copySummary}>
							{copied ? 'Copied' : 'Copy the summary'}
						</button>
						<button type="button" className="di-action di-action--ghost" onClick={reset}>
							Reset to defaults
						</button>
					</div>
				</div>
			</div>

			{/* Mobile: the verdict stays in view while the sliders move. */}
			<div className="di-mobilebar" data-tone={result.tossUp ? 'flat' : 'clear'}>
				<span className="di-chip di-chip--small">{result.verdict}</span>
				<span className="di-mobilebar__text">{result.verdictLabel}</span>
				<span className="di-mobilebar__delta">
					{money(delta)}
					{result.sides[0].totalLabel ?? ''}
				</span>
			</div>
		</div>
	);
}
