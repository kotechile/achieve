/**
 * The AIChieve tool register.
 *
 * Two deterministic engines, not a directory: the GPU TCO Analyzer answers "build the
 * cluster or lease it", and the Master Asset & Software TCO Calculator answers "build the
 * system or buy it". Everything else this property sells lives on the product host as a
 * PRO app — see `src/lib/apps.ts`.
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
			'Model an agentic workflow against the task it replaces: tokens with retry overhead, the human audit sample, rework of failures and the cost of what ships wrong — then read the failure rate at which the saving reverses.',
		keywords: [
			'agentic workflow cost calculator',
			'agent roi calculator',
			'human in the loop cost',
			'ai agent failure rate',
			'token cost per task'
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
