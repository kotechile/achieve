/**
 * The canvases: one line chart, one bar-row primitive that three engines share.
 *
 * WHY ONLY ONE OF THEM IS SVG
 * A line chart with two series, a tick ladder and a marked intersection is genuinely easier in SVG: the
 * geometry is the point. A waterfall, a three-bar comparison and a payback pair are rows of labelled
 * quantities — in SVG every label needs manual truncation and still lands on top of the bars at 390px.
 * So those are HTML rows with a scaled fill, which keeps their labels in the document (and therefore
 * readable by a screen reader and by text search) while still reading as a chart.
 *
 * EVERY CANVAS CARRIES ITS DATA
 * `ChartFrame` renders a visually-hidden table of the same figures. The SVG is `role="img"` with a
 * headline label, so a screen reader gets one sentence and the table, not a stack of unlabeled paths.
 */
import React from 'react';
import type { EngineTone } from '../../../../lib/calculators/engineTypes';

export interface ChartFrameProps {
	title: string;
	note?: string;
	ariaLabel: string;
	legend?: { label: string; tone: EngineTone | 'muted' }[];
	table?: { caption: string; head: string[]; rows: (string | number)[][] };
	children: React.ReactNode;
}

export function ChartFrame({ title, note, ariaLabel, legend, table, children }: ChartFrameProps) {
	return (
		<figure className="en-canvas">
			<div className="en-canvas__cap">
				<span className="en-canvas__title">{title}</span>
				{note ? <span className="en-canvas__note">{note}</span> : null}
			</div>
			<div role="img" aria-label={ariaLabel}>
				{children}
			</div>
			{legend?.length ? (
				<div className="en-legend">
					{legend.map((item) => (
						<span className="en-legend__item" key={item.label}>
							<span className={`en-legend__swatch en-legend__swatch--${item.tone}`} aria-hidden="true" />
							{item.label}
						</span>
					))}
				</div>
			) : null}
			{table ? (
				<table className="en-datatable">
					<caption>{table.caption}</caption>
					<thead>
						<tr>
							{table.head.map((cell) => (
								<th key={cell} scope="col">
									{cell}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{table.rows.map((row, index) => (
							<tr key={index}>
								{row.map((cell, cellIndex) => (
									<td key={cellIndex}>{cell}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			) : null}
		</figure>
	);
}

/* ── the line chart ───────────────────────────────────────────────────────────────────────── */

export interface LinePoint {
	/** 0-1 fraction on the x-axis. */
	x: number;
	y: number;
}

export interface BreakevenChartProps {
	points: LinePoint[];
	/** The flat comparison line. */
	baseline: number;
	/** Vertical marker in x-units, when the model has a crossing. */
	marker?: number;
	markerLabel?: string;
	xLabel: string;
	yLabel: string;
	yFormat: (value: number) => string;
	xFormat: (value: number) => string;
}

const niceMax = (value: number) => {
	if (!Number.isFinite(value) || value <= 0) return 1;
	const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
	for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
		if (value <= step * magnitude) return step * magnitude;
	}
	return 10 * magnitude;
};

export function BreakevenChart({
	points,
	baseline,
	marker,
	markerLabel,
	xLabel,
	yLabel,
	yFormat,
	xFormat
}: BreakevenChartProps) {
	const width = 680;
	const height = 260;
	// pad.top leaves a row for the y-axis caption above the first tick; pad.bottom leaves a row for
	// the tick labels plus the x-axis caption, which was previously clipped by the viewBox edge.
	const pad = { top: 26, right: 16, bottom: 44, left: 62 };
	const plotW = width - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;

	const xMax = Math.max(...points.map((point) => point.x), 0.01);
	const yMax = niceMax(Math.max(...points.map((point) => point.y), baseline) * 1.08);
	const sx = (x: number) => pad.left + (x / xMax) * plotW;
	const sy = (y: number) => pad.top + plotH - (Math.min(Math.max(y, 0), yMax) / yMax) * plotH;

	const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${sx(point.x).toFixed(1)} ${sy(point.y).toFixed(1)}`).join(' ');
	const area = `${path} L${sx(points[points.length - 1]?.x ?? 0).toFixed(1)} ${sy(0).toFixed(1)} L${sx(points[0]?.x ?? 0).toFixed(1)} ${sy(0).toFixed(1)} Z`;
	const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * yMax);
	const xTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * xMax);

	return (
		<svg className="en-canvas__svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
			{yTicks.map((tick) => (
				<g key={`y-${tick}`}>
					<line className="en-chart__grid" x1={pad.left} x2={width - pad.right} y1={sy(tick)} y2={sy(tick)} />
					<text className="en-chart__tick" x={pad.left - 8} y={sy(tick) + 3} textAnchor="end">
						{yFormat(tick)}
					</text>
				</g>
			))}

			{xTicks.map((tick) => (
				<text className="en-chart__tick" key={`x-${tick}`} x={sx(tick)} y={height - 28} textAnchor="middle">
					{xFormat(tick)}
				</text>
			))}

			<path className="en-chart__area--base" d={area} />
			<line className="en-chart__axis" x1={pad.left} x2={width - pad.right} y1={sy(0)} y2={sy(0)} />

			{/* Manual baseline: flat, dashed, and always visible behind the agent curve. */}
			<line
				className="en-chart__line--muted"
				x1={pad.left}
				x2={width - pad.right}
				y1={sy(baseline)}
				y2={sy(baseline)}
			/>
			<text className="en-chart__label" x={width - pad.right} y={sy(baseline) - 6} textAnchor="end">
				{yFormat(baseline)} manual
			</text>

			<path className="en-chart__line--erosion" d={path} />

			{typeof marker === 'number' && marker > 0 && marker <= xMax ? (
				<g>
					<line className="en-chart__cross" x1={sx(marker)} x2={sx(marker)} y1={pad.top} y2={sy(0)} />
					<text className="en-chart__label en-chart__crosslabel" x={sx(marker) + 5} y={pad.top + 12}>
						{markerLabel ?? xFormat(marker)}
					</text>
				</g>
			) : null}

			<text className="en-chart__label" x={pad.left} y={height - 8} textAnchor="start">
				{xLabel}
			</text>
			<text className="en-chart__label" x={pad.left} y={11} textAnchor="start">
				{yLabel}
			</text>
		</svg>
	);
}

/* ── the bar rows ─────────────────────────────────────────────────────────────────────────── */

export interface BarRow {
	label: string;
	value: number;
	valueLabel: string;
	tone?: EngineTone | 'muted';
	/** Rendered as a note under the label, for the "what this bar is" detail. */
	note?: string;
}

export interface BarRowsProps {
	rows: BarRow[];
	/** Scale ceiling. Defaults to the largest row. */
	max?: number;
}

/**
 * The shared horizontal bar primitive: a waterfall step, a DIM comparison and a payback pair are all
 * "a labelled quantity against a common scale". Bars run from zero, so lengths are comparable across
 * rows — the failure mode this replaces is a chart whose bars start wherever the series does.
 */
export function BarRows({ rows, max }: BarRowsProps) {
	const ceiling = max ?? Math.max(...rows.map((row) => Math.abs(row.value)), 0.0001);
	return (
		<div>
			{rows.map((row) => {
				const width = `${Math.min(100, (Math.abs(row.value) / (ceiling || 1)) * 100)}%`;
				return (
					<div className="en-row" key={`${row.label}-${row.value}`}>
						<div className="en-row__head">
							<span className="en-row__label">{row.label}</span>
							<span className="en-row__value">{row.valueLabel}</span>
						</div>
						<div className="en-row__track">
							<div
								className={`en-row__fill en-row__fill--${row.tone ?? 'base'}`}
								style={{ width }}
							/>
						</div>
						{row.note ? <span className="en-row__note">{row.note}</span> : null}
					</div>
				);
			})}
		</div>
	);
}
