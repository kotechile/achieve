/**
 * Launch-video config — one entry per tool.
 *
 * The template in `compose.mjs` is generic; this file is the only creative surface. Every figure
 * that reaches a frame must be reproducible from the product itself: the GPU numbers below are the
 * tool's own default-configuration output (RTX PRO 6000 Blackwell, 36-month horizon, one NVAIE seat),
 * and the copy strings come from the calculator metadata the page already publishes.
 *
 * Adding a tool = adding an entry. `build.mjs` iterates this object and writes
 * `src/data/launch-videos.ts`, so every tool with an entry gets a video on its page automatically.
 */

export const TOOLS = {
	'gpu-compute': {
		slug: 'gpu-compute',
		// Voice and bed are cast per build (scripts/video/cast.mjs): shuffled pools, no repeat across
		// tools, draw frozen into casting.json. Pin one only to override that draw deliberately.
		eyebrow: 'Compute infrastructure',
		title: 'GPU TCO Analyzer',
		kicker: 'Own it or rent it',
		stats: [
			{ label: 'Street cost', value: '$16,000', note: 'vs $8,565 list' },
			{ label: 'Power draw', value: '600W', note: '+250W chassis' },
			{ label: 'NVAIE seat', value: '$4,500', note: 'per GPU / year' }
		],
		answer: {
			label: 'The verdict · 36 months',
			headline: 'Renting saves $25,438',
			bars: [
				{ label: 'Owned', value: 32797, tone: 'emerald' },
				{ label: 'Rented', value: 7358, tone: 'cyan' }
			],
			footnote: 'No break-even inside 84 months at this utilisation.'
		},
		path: '/tools/gpu-compute/',
		narration:
			"I'm the GPU TCO Analyzer. I price an owned accelerator against rented capacity over your own horizon: street cost, power, maintenance, and the software licences everyone drops. NVIDIA AI Enterprise alone is four thousand five hundred dollars per GPU, per year. Put your utilisation in before you sign."
	},
	'decision-intelligence': {
		slug: 'decision-intelligence',
		// cast per build — see scripts/video/cast.mjs
		eyebrow: 'Build vs. buy',
		title: 'Master Asset & Software TCO Calculator',
		kicker: 'Build it or buy it',
		stats: [
			{ label: 'Implementation', value: 'Capex', note: 'one-time build' },
			{ label: 'Licences', value: 'Opex', note: 'per seat, escalating' },
			{ label: 'Upkeep', value: 'Opex', note: 'the part that outlives it' }
		],
		// No comparison bars here on purpose: this calculator's output depends entirely on the reader's
		// inputs, so any bar ratio on screen would be a fabricated metric. The template falls back to
		// the cost buckets instead.
		answer: {
			label: 'The output',
			headline: 'One loaded five-year score',
			bars: null,
			buckets: [
				{ label: 'Implementation', note: 'one-time build capex' },
				{ label: 'Licences', note: 'per seat, escalating at renewal' },
				{ label: 'Upkeep', note: 'the line that outlives the project' }
			],
			footnote: 'Your inputs set the ratio. The tool returns the number.'
		},
		path: '/tools/master-asset-tco/',
		narration:
			"I'm the Master Asset and Software TCO calculator. I score a build against a buy across five years on fully loaded cost: implementation, licences, and the upkeep that quietly outlives the project. Bring your own numbers. I return one figure you can defend in a budget meeting."
	}
};

/** FNV-1a — the same derivation the launch pipeline uses, so beds and voices do not cluster. */
export function hashSlug(slug) {
	let h = 0x811c9dc5;
	for (let i = 0; i < slug.length; i++) {
		h ^= slug.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h;
}
