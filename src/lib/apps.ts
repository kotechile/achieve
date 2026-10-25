/**
 * The PRO app directory.
 *
 * These are the paid, agentic workflow tools — the half of the 2026 split that is
 * B2B by nature. They run on the product host, not on this Astro site, so every
 * reference goes through `appUrl()` and the host is a single environment value.
 *
 * The apps were cut over to apps.aichieve.net; apps.giniloh.com now answers 503 for every path,
 * so the default follows the move rather than the old host. PUBLIC_APPS_BASE still overrides it,
 * and it is still the only place the host is written down.
 */
const APPS_BASE = (
	import.meta.env.PUBLIC_APPS_BASE ?? 'https://apps.aichieve.net'
).replace(/\/$/, '');

export interface ProApp {
	slug: string;
	name: string;
	tagline: string;
	/** What the operator hands the tool, and what comes back. */
	input: string;
	output: string;
	/** The operational failure this exists to catch. */
	failure: string;
	audience: 'Finance Operations' | 'Logistics Operations' | 'AI Platform' | 'Warehouse / CAPEX';
	/** Glyph used wherever the app is listed beside the free engines (ToolRail, index cards). */
	icon: 'table' | 'flow' | 'matrix' | 'server' | 'chart-line' | 'globe';
	path: string;
}

export const PRO_APPS: ProApp[] = [
	{
		slug: 'spendproof',
		icon: 'table',
		name: 'SpendProof',
		tagline: 'AI provider invoice ↔ tagged-usage reconciliation',
		input: 'AI provider invoice + your tagged usage export',
		output: 'Line-by-line reconciliation with an explicit clean-close or withhold verdict',
		failure: 'Untagged agent spend that closes the month as a surprise instead of a finding',
		audience: 'AI Platform',
		path: '/spendproof'
	},
	{
		slug: 'parcelproof',
		icon: 'flow',
		name: 'ParcelProof',
		tagline: 'Carrier invoice DIM-weight and surcharge audit',
		input: 'Carrier invoice lines + shipment file',
		output: 'Every rule-triggered charge recomputed, with the lines that have no basis named',
		failure: 'DIM divisor, AHS dimension and fuel-peg surcharges billed on rules that were never met',
		audience: 'Logistics Operations',
		path: '/parcelproof'
	},
	{
		slug: 'caseproof',
		icon: 'matrix',
		name: 'CaseProof',
		tagline: 'Buyer-side audit of a warehouse-automation business case',
		input: "Vendor's quoted business case + your own cost assumptions",
		output: 'A re-run of the vendor numbers on your loaded costs, plus what to confirm in writing',
		failure: 'Warehouse automation deals signed on a vendor’s own payback model',
		audience: 'Warehouse / CAPEX',
		path: '/caseproof'
	},
	{
		slug: 'facturgate',
		icon: 'table',
		name: 'FacturGate',
		tagline: 'EU e-invoice pre-send gate and Factur-X / UBL converter',
		input: 'Invoice model or CII / UBL file',
		output: 'EN 16931 validation verdict before the send, plus a converted payload',
		failure: 'E-invoices rejected downstream after they were already issued',
		audience: 'Finance Operations',
		path: '/facturgate'
	},
	{
		slug: 'ledgerlink',
		icon: 'chart-line',
		name: 'LedgerLink',
		tagline: 'Stripe payout → general ledger reconciliation engine',
		input: 'Stripe payout export',
		output: 'A decomposed payout that ties to the ledger, with breaks isolated',
		failure: 'Payouts that reach the bank unable to be tied back to the ledger',
		audience: 'Finance Operations',
		path: '/ledgerlink'
	}
];

export function appUrl(path: string) {
	return `${APPS_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getApp(slug: string) {
	return PRO_APPS.find((app) => app.slug === slug);
}

export function getAppsBase() {
	return APPS_BASE;
}

// Fail the Astro build rather than shipping a capitalised path: Next routes are
// case-sensitive and answer 404 for a capitalised segment.
for (const app of PRO_APPS) {
	if (app.path !== app.path.toLowerCase()) {
		throw new Error(`apps: ${app.slug} has a capital letter in its path (${app.path})`);
	}
}
