/**
 * Which paid tool, if any, genuinely answers the question this page is about.
 *
 * The rule this file must not break: **only map a page to a tool that actually answers it.**
 * A fabricated match costs the one visit the page earns and makes the whole corpus
 * untrustworthy, so the map is deliberately partial — a page with no honest match renders
 * nothing at all.
 *
 * Migrated from giniloh.com in the 2026 split: the app links, the categories they map from
 * and the launch notes they belong to all moved together, because all of them are B2B.
 */
import { appUrl } from './apps';

export interface ProductCta {
	product: string;
	name: string;
	tagline: string;
	url: string;
	/** One line naming why a reader of THIS page wants THIS tool. */
	why: string;
}

const PRODUCTS = {
	spendproof: {
		name: 'SpendProof',
		tagline: 'AI provider invoice ↔ tagged-usage reconciliation',
		url: appUrl('/spendproof')
	},
	parcelproof: {
		name: 'ParcelProof',
		tagline: 'Carrier invoice DIM-weight and surcharge audit',
		url: appUrl('/parcelproof')
	},
	caseproof: {
		name: 'CaseProof',
		tagline: 'Buyer-side audit of a warehouse-automation business case',
		url: appUrl('/caseproof')
	},
	facturgate: {
		name: 'FacturGate',
		tagline: 'EU e-invoice pre-send gate and Factur-X / UBL converter',
		url: appUrl('/facturgate')
	},
	ledgerlink: {
		name: 'LedgerLink',
		tagline: 'Stripe payout → GL reconciliation engine',
		url: appUrl('/ledgerlink')
	}
} as const;

type ProductSlug = keyof typeof PRODUCTS;

/** Category-level defaults: only categories whose whole subject is the tool's subject. */
const BY_CATEGORY: Record<string, { product: ProductSlug; why: string }> = {
	'supply-chain-operations': {
		product: 'parcelproof',
		why: 'This page is about money a carrier bills by rule — ParcelProof recomputes those same rule triggers (DIM divisor, AHS dimensions, fuel peg, the dispute clock) from your own invoice lines and names the ones with no basis.'
	},
	'ai-stack-tool-tco': {
		product: 'spendproof',
		why: 'The bill this page is about, line by line: SpendProof reconciles an AI provider invoice against your own tagged usage and withholds a clean close whenever a bucket does not reconcile.'
	},
	'autonomous-agentic-workflows': {
		product: 'spendproof',
		why: 'Governance stops at the invoice: SpendProof ties each AI provider line to tagged usage, so untagged agent spend becomes a finding instead of a surprise.'
	},
	'business-automation-operations': {
		product: 'caseproof',
		why: 'This is the buying decision CaseProof audits: it re-runs a vendor’s quoted numbers against your own fully loaded costs and lists what to confirm in writing before you sign.'
	}
};

/** Slug-level matches, where the page's subject is a specific product's subject. */
const BY_SLUG: Record<string, { product: ProductSlug; why: string }> = {
	'parcelproof-stop-bleeding-28-on-carrier-invoices': {
		product: 'parcelproof',
		why: 'This is the launch note for ParcelProof — the audit it describes runs on your own invoice and shipment files.'
	},
	'facturgate-the-deterministic-pre-send-gate-converter-for-european-e': {
		product: 'facturgate',
		why: 'This is the launch note for FacturGate — the EN 16931 pre-send gate it describes runs on your own invoice model or CII/UBL file.'
	},
	'caseproof-stop-signing-3m-warehouse-automation-deals-on-a-vendors': {
		product: 'caseproof',
		why: 'This is the launch note for CaseProof — the buyer-side audit it describes runs on your own quote and cost assumptions.'
	},
	'stripe-accounting-software-solving-the-payout-black-box-with': {
		product: 'ledgerlink',
		why: 'This is the launch note for LedgerLink — the payout decomposition it describes runs on your own Stripe payout export.'
	}
};

export function productCtaFor(input: {
	slug?: string | null;
	categorySlug?: string | null;
}): ProductCta | null {
	const match =
		(input.slug ? BY_SLUG[input.slug] : undefined) ??
		(input.categorySlug ? BY_CATEGORY[input.categorySlug] : undefined);
	if (!match) return null;
	const product = PRODUCTS[match.product];
	return {
		product: match.product,
		name: product.name,
		tagline: product.tagline,
		url: product.url,
		why: match.why
	};
}
