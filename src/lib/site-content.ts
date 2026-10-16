/**
 * Which WordPress posts this site owns.
 *
 * WHY AN EXPLICIT SLUG LIST, NOT CATEGORY FILTERING
 * The WordPress taxonomy was authored as one site's blog, so it mixes audiences:
 * `major-purchases-assets` holds both an espresso-machine cost-per-use piece and a
 * KV-cache concurrency post; `mental-models-strategy` holds both expat tax and Azure
 * control-plane outages. The 2026 split into giniloh.com (personal / career
 * optimisation) and aichieve.net (enterprise AI, compute and supply-chain operations)
 * therefore cannot be expressed as "category X goes here". It is expressed as this
 * list: one row per post, generated from the topical read of all 112 published posts.
 *
 * Both sites read the SAME WordPress install. This module is the only thing that
 * decides whose index a post lands in, so a post added later appears on neither site
 * until it is added here — silence is the safe default, not duplication.
 *
 * To re-generate after new posts are published: see `SPLIT.md` at the repo root.
 */

/** Posts that belong to aichieve.net. */
export const OWNED_POST_SLUGS = new Set<string>([
	'100-case-eval-925-coverage',
	'agent-audit-trail-not-evidence',
	'agent-failure-topology-not-model',
	'agent-failures-tests-stayed-green',
	'agent-loop-bound-not-a-budget',
	'agent-memory-poisoning-write-path',
	'agent-memory-tiering-l1-l4',
	'agent-reliability-pass-k-not-one-green-run',
	'agent-safety-gate-moves-to-verified-state',
	'agent-timeout-false-alarm-budget',
	'agent-tool-count-ceiling',
	'agentic-ai-adoption-soars-but-profits-stall-in-2026',
	'ai-coding-seats-measure-or-renew',
	'ai-incident-clock-4-hours-not-15-days',
	'ai-spend-27t-cost-visibility-mandate',
	'air-freight-wont-price-a-year',
	'automation-payback-splits-by-sku-geometry',
	'aws-cannot-restore-bahrain',
	'azure-control-plane-single-point-of-failure',
	'build-wait-payback-threshold',
	'buying-ai-quality-when-the-score-belongs-to-the-judge',
	'cache-boundary-decides-input-bill',
	'caseproof-stop-signing-3m-warehouse-automation-deals-on-a-vendors',
	'cheaper-model-pricier-task',
	'control-tower-silent-exception',
	'demurrage-invoice-30-day-clocks',
	'diesel-620-electric-freight-certificate-gap',
	'durable-execution-not-a-transaction',
	'enterprisebuildvsbuy-the-250k-ai-upkeep-tax',
	'facturgate-the-deterministic-pre-send-gate-converter-for-european-e',
	'fed-rate-hike-inverts-working-capital-trap',
	'fine-tune-vs-rent-by-token',
	'flat-price-was-the-hedge',
	'forecast-accuracy-is-not-shock-protection',
	'forecast-value-added-lose-to-last-period',
	'freight-scale-bet-vs-contract-duration',
	'freight-claim-dies-at-9-months',
	'fuel-surcharge-peg-mpg-audit',
	'gate-the-step-not-the-model',
	'goods-tariff-relief-vs-vessel-fee',
	'gpu-hour-price-set-by-memory',
	'hour-14-recovery-wall',
	'holiday-forecasts-miss-what-shoppers-count',
	'inventory-carrying-cost-rate',
	'kill-switch-misses-half-your-agents',
	'kv-cache-is-the-concurrency-ceiling',
	'last-mile-carbon-number-is-a-rate-table',
	'local-ai-payback-cloud-gpu-spread',
	'maskills-multi-agent-skills-optimization',
	'mcp-skills-extension',
	'multi-agent-orchestration-building-the-one-person-enterprise',
	'nearshoring-doesnt-move-the-trade-case',
	'nvidia-says-its-gpus-arent-sold-out-its-cfos-279-billion-memory-bet',
	'one-skill-too-many-green-test',
	'openai-just-made-the-agent-loop-a-commodity',
	'openais-custom-chip-beats-nvidia-on-power-2',
	'owned-shuttles-or-rented-robots',
	'parcelproof-stop-bleeding-28-on-carrier-invoices',
	'planner-as-router-fold-the-model-choice-into-the-plan',
	'planning-ai-buys-capability-not-autonomy',
	'prefill-decode-two-pool-gap',
	'rack-power-density-ceiling-build-before-you-buy',
	'rack-ride-through-two-second-duty',
	'remediator-recovers-46-percent',
	'reshoring-moved-the-tariff-upstream',
	'retry-is-the-failure-amplifier',
	'retry-permission-leaves-the-caller',
	'safety-stock-forecast-error-not-demand-noise',
	'same-day-race-undoes-route-optimization',
	'self-hosted-ai-when-to-buy-vs-rent-gpus',
	'shippers-stuck-in-the-gap',
	'sla-credit-is-not-insurance',
	'slow-movers-hold-your-stock',
	'stale-grants-travel-the-graph',
	'stripe-accounting-software-solving-the-payout-black-box-with',
	'tariff-cliff-already-priced-in',
	'tariff-split-reshoring-heavy-half',
	'the-cloud-bill-break-even-when-renting-servers-stops-paying',
	'the-sticker-price-lies-why-mexico-beats-china-on-total-landed-cost',
	'token-price-record-low-budget-overrun',
	'token-prices-just-halved-the-cfo-still-cant-read-the-bill',
	'up-ns-rail-merger-clears-summary-denial',
	'vendor-replacement-ai-ceiling',
	'wage-floor-sets-robot-payback',
	'warehouse-pick-error-tax-payback',
	'why-importers-forfeit-duty-refunds',
	'you-think-youre-governing-your-agents',
	'your-32gb-card-gone',
	'your-chip-stopped-deciding',
	'your-cluster-hidden-clock',
	'zet-scale-ev-truck-residual-value-risk',
]);

/** Posts that belong to the other property and must never render here. */
export const FOREIGN_POST_SLUGS = new Set<string>([
	'best-ai-proof-jobs-in-a-changing-market',
	'beyond-the-emergency-fund-how-to-build-a-frictionless-wealth',
	'calculate-your-career-relocation-payback',
	'disney-hulu-fourth-hike-subscription-creep',
	'ebike-costs-per-use-calculator-for-commuters',
	'expats-evaluating-the-true-value-of-a-job-driven-move-overseas',
	'home-assistant-cloud-rename-hardware-rent',
	'how-to-use-giniloh-to-simulate-automate-and-backtest-frictionless',
	'is-a-3000-espresso-maker-machine-worth-it',
	'jobs-switch-calculator-step-by-step-profit-guide',
	'lease-break-calculator-save-1850-in-3-steps',
	'negotiate-job-offer-with-giniloh-visualizer',
	'nvidia-rtx-pro-groundbreaking-performance-but-does-the-math-check',
	'one-approval-two-payments',
	'post-termination-option-clock-tax',
	'replace-laptop-screen-let-this-decision-engine-do-the-math',
	'self-hosting-break-even-one-hour-a-year',
	'simulate-a-frictionless-liquidity-sweep-in-giniloh',
	'smart-ways-to-invest-an-extra-500-a-day',
	'split-year-two-clock-seam',
	'staggered-lockup-six-selling-decisions',
	'the-blueprint-behind-giniloh-money-flow',
	'the-giniloh-money-flow-simulator-explained',
	'three-forms-cost-more-than-tax',
	'why-70-of-startup-options-go-unexercised',
	'zapier-notion-integration-calculate-your-tinkering-tax',
]);

/**
 * The other property. Used for cross-links and the 301 map, never rendered as content.
 */
export const SIBLING_SITE = {
	name: 'Gini Loh',
	origin: 'https://giniloh.com'
} as const;

/** Top-level WordPress category slugs this site's navigation and index pages may show. */
export const OWNED_CATEGORY_SLUGS = [
	'supply-chain-operations',
	'artificial-intelligence-future-of-work',
	'ai-stack-tool-tco',
	'autonomous-agentic-workflows',
	'business-automation-operations',
	'career-ai-resilience'
] as const;

export function belongsToSite(post: { slug?: string | null }): boolean {
	const slug = post?.slug?.trim();
	return typeof slug === 'string' && slug.length > 0 && OWNED_POST_SLUGS.has(slug);
}

/** Drop everything the other property owns. Applied to every WordPress read. */
export function filterOwnedPosts<T extends { slug?: string | null }>(posts: T[]): T[] {
	return posts.filter(belongsToSite);
}
