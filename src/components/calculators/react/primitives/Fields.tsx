/**
 * The engine's input controls.
 *
 * WHY NOT TAILWIND UTILITIES
 * Inside `.instrument-surface`, §4b of aichieve.css re-pins text colour with `!important` selectors
 * that match on class *substrings* (`[class*="text-cyan-300"]`, `.font-mono.text-xs`). A utility-first
 * control loses that fight silently — the number is right and the colour is inherited. So every part
 * here is a named `.en-*` class, exactly as §6 does for the decision instrument.
 *
 * THE PLATE IS THE INPUT
 * Each numeric field is a plate (the value) and a range (the same value, coarsely). Typing into the
 * plate is how someone with a real number works; the range is how someone exploring works. Both write
 * the same state, and the plate clamps on blur rather than on keystroke so `0.` does not snap to `0`
 * mid-entry.
 */
import React, { useId } from 'react';

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

export interface FieldProps {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	step?: number;
	/** Shown inside the plate after the number: $, %, min, lb. */
	affix?: string;
	/** Shown before the number: $ for money. */
	prefix?: string;
	hint?: string;
	/** Digits kept in the plate; also sets the field's width so it does not jitter. */
	decimals?: number;
	/** False for fields where a slider would imply a range the value does not have. */
	slider?: boolean;
	/** Overrides the spoken value on the range, e.g. "18 minutes per task". */
	ariaValueText?: (value: number) => string;
}

export function NumberField({
	label,
	value,
	onChange,
	min,
	max,
	step = 1,
	affix,
	prefix,
	hint,
	decimals = 0,
	slider = true,
	ariaValueText
}: FieldProps) {
	const id = useId();
	const hintId = hint ? `${id}-hint` : undefined;
	const shown = decimals ? value.toFixed(decimals) : String(Math.round(value));
	const plateWidth = `${Math.max(3, shown.length + 1)}ch`;
	const fillPct = `${((clamp(value, min, max) - min) / (max - min || 1)) * 100}%`;

	return (
		<div className="en-field">
			<div className="en-field__head">
				<label className="en-field__label" htmlFor={id}>
					{label}
				</label>
				<span className="en-plate">
					{prefix ? <span className="en-plate__affix">{prefix}</span> : null}
					<input
						id={id}
						className="en-plate__input"
						type="number"
						inputMode="decimal"
						style={{ width: plateWidth }}
						value={decimals ? Number(value.toFixed(decimals)) : Math.round(value)}
						min={min}
						max={max}
						step={step}
						aria-describedby={hintId}
						onChange={(event) => {
							const next = Number(event.target.value);
							if (event.target.value !== '' && Number.isFinite(next)) onChange(next);
						}}
						onBlur={(event) => onChange(clamp(Number(event.target.value), min, max))}
					/>
					{affix ? <span className="en-plate__affix">{affix}</span> : null}
				</span>
			</div>
			{slider ? (
				<input
					className="en-range"
					type="range"
					min={min}
					max={max}
					step={step}
					value={clamp(value, min, max)}
					style={{ '--en-pct': fillPct } as React.CSSProperties}
					aria-label={`${label} slider`}
					aria-valuetext={ariaValueText ? ariaValueText(clamp(value, min, max)) : undefined}
					aria-describedby={hintId}
					onChange={(event) => onChange(Number(event.target.value))}
				/>
			) : null}
			{hint ? (
				<p className="en-field__hint" id={hintId}>
					{hint}
				</p>
			) : null}
		</div>
	);
}

export interface SelectFieldProps<T extends string> {
	label: string;
	value: T;
	options: { value: T; label: string }[];
	onChange: (value: T) => void;
	hint?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, hint }: SelectFieldProps<T>) {
	const id = useId();
	return (
		<div className="en-field">
			<label className="en-field__label" htmlFor={id}>
				{label}
			</label>
			<select
				id={id}
				className="en-select"
				value={value}
				aria-describedby={hint ? `${id}-hint` : undefined}
				onChange={(event) => onChange(event.target.value as T)}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			{hint ? (
				<p className="en-field__hint" id={`${id}-hint`}>
					{hint}
				</p>
			) : null}
		</div>
	);
}

export interface SegmentedFieldProps<T extends string> {
	label: string;
	value: T;
	options: { value: T; label: string }[];
	onChange: (value: T) => void;
}

/** Radio group styled as one ruled strip. Native radios, so arrow keys work without extra code. */
export function SegmentedField<T extends string>({ label, value, options, onChange }: SegmentedFieldProps<T>) {
	const name = useId();
	return (
		<fieldset className="en-field">
			<legend className="en-field__head">
				<span className="en-field__label">{label}</span>
			</legend>
			<div className="en-seg__row">
				{options.map((option) => (
					<label key={option.value} className="en-seg__option">
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

export interface GroupProps {
	title: string;
	/** Number of controls inside, shown on the summary so a closed group still announces its size. */
	count?: number;
	open?: boolean;
	children: React.ReactNode;
}

/**
 * A collapsible group of inputs.
 *
 * `<details>` rather than a React accordion: it opens with JavaScript off, keeps its own state, and
 * is announced correctly by every screen reader without aria-expanded bookkeeping.
 */
export function Group({ title, count, open = false, children }: GroupProps) {
	return (
		<details className="en-group" open={open}>
			<summary className="en-group__summary">
				{title}
				{typeof count === 'number' ? <span className="en-group__count">{count}</span> : null}
			</summary>
			<div className="en-group__body">{children}</div>
		</details>
	);
}
