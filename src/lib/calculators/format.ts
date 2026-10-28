export function formatCurrency(value: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number) {
	return `${Number.isFinite(value) ? value : 0}%`;
}

/* ── standard-engine formats ──────────────────────────────────────────────────────────────── */

const finite = (value: number) => (Number.isFinite(value) ? value : 0);

/** Dollars at a chosen precision. `digits` defaults to 0 because most engine figures are totals. */
export function usd(value: number, digits = 0) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	}).format(finite(value));
}

/** Dollars at scale: $1.2m / $184k. Used on KPI plates where width is fixed. */
export function usdCompact(value: number) {
	const abs = Math.abs(finite(value));
	const sign = value < 0 ? '−' : '';
	if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
	if (abs >= 10_000) return `${sign}$${Math.round(abs / 1_000)}k`;
	return `${sign}${usd(abs, abs < 100 ? 2 : 0)}`;
}

/**
 * A fraction as a percentage: 0.057 → "5.7%".
 * Distinct from `formatPercent`, which takes an already-multiplied number and exists for callers
 * that store percentages. Mixing the two is how a 0.057% failure rate ships.
 */
export function pct(fraction: number, digits = 1) {
	return `${(finite(fraction) * 100).toFixed(digits)}%`;
}

export function num(value: number, digits = 0) {
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	}).format(finite(value));
}

export function years(value: number | null) {
	return value === null ? 'no payback' : `${finite(value).toFixed(2)} yr`;
}

export function months(value: number | null) {
	return value === null ? 'never' : `${(finite(value) * 12).toFixed(1)} mo`;
}
