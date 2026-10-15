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
