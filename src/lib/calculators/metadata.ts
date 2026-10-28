/**
 * The AIChieve tool register.
 *
 * Seven deterministic engines, not a directory. Two were migrated from giniloh.com in the 2026
 * split (build the cluster or lease it; build the system or buy it). Five are the standard tools:
 * agentic breakeven, warehouse slotting payback, inventory record accuracy, total delivered cost
 * and parcel DIM weight. Everything else this property sells lives on the product host as a PRO
 * app — see `src/lib/apps.ts`.
 *
 * Migrated from giniloh.com in the 2026 split. Their canonical URLs moved from
 * `/calculators/<slug>/` to `/tools/<slug>/`; giniloh.com 301s the old paths here, and this
 * app 301s the old prefix internally (astro.config.mjs).
 */
export const calculators = [
	{
		slug: 'gpu-compute',
		title: 'GPU TCO Analyzer',
		href: '/tools/gpu-compute/',
		status: 'Live',
		accent: 'signal',
		domainCategory: 'Compute Infrastructure',
		outputType: 'Local Build vs. Cloud Lease',
		iconType: 'server',
		utility: 'Decide: build the cluster or lease the capacity',
		description:
			'Model a local GPU cluster against rented capacity: street hardware pricing, enterprise software licences, TDP load, persistent storage, and the utilization floor where owning stops paying.',
		keywords: [
			'gpu tco calculator',
			'local vs cloud gpu cost',
			'gpu cluster build vs lease',
			'ai infrastructure tco',
			'cloud gpu cost per hour'
		],
		category: 'BusinessApplication'
	},
	{
		slug: 'decision-intelligence',
		title: 'Master Asset & Software TCO Calculator',
		href: '/tools/master-asset-tco/',
		status: 'Live',
		accent: 'signal',
		domainCategory: 'Build vs. Buy',
		outputType: 'Loaded Build-vs-Buy Score',
		iconType: 'matrix',
		utility: 'Decide: build the system or buy it',
		description:
			'Score a custom build against a bought platform on fully loaded engineer-years, compliance certification, maintenance headcount and roadmap opportunity cost — then stress-test it for sunk-cost and key-person bias.',
		keywords: [
			'build vs buy calculator',
			'enterprise tco calculator',
			'custom software tco',
			'ciam build vs buy',
			'engineer years calculator'
		],
		category: 'BusinessApplication'
	},
	{
		slug: 'agentic-workflow-breakeven',
		title: 'Agentic Workflow Breakeven Calculator',
		href: '/tools/agentic-workflow-breakeven/',
		status: 'Live',
		accent: 'signal',
		domainCategory: 'Agentic Operations',
		outputType: 'Verification Cliff',
		iconType: 'flow',
		utility: 'Decide: how much failure an agent can absorb',
		description:
			'Model an agentic workflow against the task it replaces: tokens with retries, the human audit sample, rework of failures and the cost of what ships wrong.',
		keywords: [
			'agentic workflow cost calculator',
			'agent roi calculator',
			'human in the loop cost',
			'ai agent failure rate',
			'token cost per task'
		],
		category: 'BusinessApplication'
	},
	{
		slug: 'warehouse-slotting-payback',
		title: 'Warehouse Slotting & Automation Payback Calculator',
		href: '/tools/warehouse-slotting-payback/',
		status: 'Live',
		accent: 'signal',
		domainCategory: 'Warehouse / CAPEX',
		outputType: 'Buyer-Audited Payback',
		iconType: 'matrix',
		utility: 'Decide: move the racks or buy the machine',
		description:
			'Price the free re-slot before the automation: three labour scenarios, the walk a golden-zone layout recovers, and the payback a vendor model shortens.',
		keywords: [
			'warehouse automation payback calculator',
			'slotting roi calculator',
			'pick path labour cost',
			'asrs business case',
			'warehouse capex payback'
		],
		category: 'BusinessApplication'
	},
	{
		slug: 'inventory-record-accuracy',
		title: 'Inventory Record Accuracy Calculator',
		href: '/tools/inventory-record-accuracy/',
		status: 'Live',
		accent: 'signal',
		domainCategory: 'Supply chain',
		outputType: 'Dead Cash in Buffer Stock',
		iconType: 'server',
		utility: 'Decide: count the shelves or buy storage',
		description:
			'Size the safety stock the records force you to hold. Demand and lead-time variance, the error in the bin count, the capital tied up and the margin lost to phantom stockouts.',
		keywords: [
			'inventory accuracy calculator',
			'safety stock calculator',
			'record inaccuracy cost',
			'phantom inventory stockout',
			'working capital buffer stock'
		],
		category: 'BusinessApplication'
	},
	{
		slug: 'total-delivered-cost',
		title: 'Total Delivered Cost Calculator',
		href: '/tools/total-delivered-cost/',
		status: 'Live',
		accent: 'signal',
		domainCategory: 'Supply chain',
		outputType: 'Price-to-TDC Waterfall',
		iconType: 'table',
		utility: 'Decide: whether the margin survives the border',
		description:
			'Step a selling price down to contribution: goods at FOB, the customs assist in offshore tooling, the tariff stack, freight by cube, capital in transit and returns.',
		keywords: [
			'landed cost calculator',
			'total delivered cost',
			'customs assist tooling duty',
			'section 301 landed cost',
			'contribution margin import'
		],
		category: 'BusinessApplication'
	},
	{
		slug: 'parcel-dim-weight',
		title: 'Parcel DIM-Weight Calculator',
		href: '/tools/parcel-dim-weight/',
		status: 'Live',
		accent: 'signal',
		domainCategory: 'Logistics',
		outputType: 'Recoverable Surcharge',
		iconType: 'bolt',
		utility: 'Decide: renegotiate the divisor or re-box',
		description:
			'Price a parcel by its cube. Billable weight at the published divisor, a negotiated one and a smaller box, with the surcharges no carton removes kept apart.',
		keywords: [
			'dim weight calculator',
			'parcel surcharge audit',
			'billable weight divisor',
			'carton right sizing savings',
			'carrier invoice leakage'
		],
		category: 'BusinessApplication'
	}
] as const;

export type CalculatorTool = (typeof calculators)[number];

/** Retained under the old export name so module consumers need no import churn. */
export const calculatorTools = calculators;

export function getCalculatorSchema(tool: CalculatorTool, site: URL) {
	const url = new URL(tool.href, site).toString();
	const homeUrl = new URL('/', site).toString();
	const toolsUrl = new URL('/tools/', site).toString();

	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'SoftwareApplication',
				name: tool.title,
				description: tool.description,
				url,
				applicationCategory: tool.category,
				operatingSystem: 'Web',
				isAccessibleForFree: true,
				keywords: tool.keywords.join(', '),
				offers: {
					'@type': 'Offer',
					price: '0',
					priceCurrency: 'USD',
					url
				},
				publisher: {
					'@type': 'Organization',
					name: 'AIChieve',
					url: homeUrl
				}
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl },
					{ '@type': 'ListItem', position: 2, name: 'Tools', item: toolsUrl },
					{ '@type': 'ListItem', position: 3, name: tool.title, item: url }
				]
			}
		]
	};
}

export function getCalculatorBySlug(slug: CalculatorTool['slug']) {
	return calculators.find((tool) => tool.slug === slug);
}
