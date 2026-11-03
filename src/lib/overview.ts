/**
 * Positioning copy for aichieve.net.
 *
 * Written as a module rather than parsed out of a markdown source file: after the 2026 split
 * the overview document describes the old combined property, and half-parsing it produced
 * exactly the kind of near-miss copy ("supply chain leaders" bolted onto a personal-finance
 * page) that a dedicated site exists to avoid. Change the text here, deliberately.
 *
 * The voice is the lab's, not an agency's: this is one person's applied AI and operations
 * sandbox. giniloh.com keeps reading `giniloh_overview.md`; this file is the engineering voice,
 * attributed to Jorge Fernandez (see SITE_AUTHOR in `./site-content.ts`, the single place the
 * byline name lives).
 */
export interface MethodSection {
	title: string;
	body: string;
}

export interface OverviewContent {
	eyebrow: string;
	headline: string;
	subheadline: string;
	mission: string;
	/** The operating model AS IT IS TODAY — agents on the pipeline, a human on the gate. */
	now: string;
	originStory: string;
	/** `// 01 THE LAB` — what the sandbox is and why it exists. */
	lab: { title: string; body: string[] };
	/** `// 02 THE METHODOLOGY` — the guardrails that keep the output out of slop territory. */
	methodology: MethodSection[];
	/** `// 03 THE ARCHITECT` — who builds it, and the independence disclaimer. */
	architect: { title: string; body: string[]; disclaimer: string };
	/** The compact architecture banner that sits beside the coverage board on the homepage. */
	architecture: { kicker: string; body: string; steps: string[] };
}

export const OVERVIEW: OverviewContent = {
	eyebrow: 'AIChieve // Applied AI & Operations Lab',
	headline: 'Where supply chain, enterprise data, and human-in-the-loop AI converge.',
	subheadline:
		'An independent engineering sandbox by Jorge Fernandez. Exploring how human-in-the-loop (HITL) agentic workflows turn field data into operational dispatches, deterministic calculators, and file-based audit prototypes.',
	mission:
		'The lab exists to put a number on a decision instead of a slide. What a GPU estate costs to own. What a vendor business case looks like re-run on loaded costs. Which invoice line has no basis. Each one is modelled, documented and published with the working shown.',
	now:
		'Today the platform runs on an agentic workflow with a strict human-in-the-loop gate. Agents surface real operational bottlenecks from practitioner discussions across the web. Every model and dispatch that results is checked against trusted primary sources before release.',
	originStory:
		'AIChieve started in 2026 as the enterprise half of a split from giniloh.com. The consumer questions stayed on the other side; compute economics, agentic reliability and freight mechanics came here. It is now where I publish what the pipelines draft and what survives review.',
	lab: {
		title: 'An independent R&D sandbox',
		body: [
			'AIChieve is a personal lab, not an agency. I build the pipelines here, run them, and publish whatever holds up after a human pass.',
			'The question under test: how much of a dispatch, a calculator or an audit model can a machine draft before the output stops being trustworthy? The answer is measured, not asserted.',
			'Experiments ship in public with the arithmetic attached. A prototype that fails is documented as a failure rather than quietly deleted.'
		]
	},
	methodology: [
		{
			title: 'How tools are chosen: signal over speculation',
			body:
				'None of the calculators or audit tools here were invented in a vacuum. Research agents monitor operator forums, technical communities and practitioner threads. They look for where people running real businesses are losing money or fighting broken spreadsheet maths. A bottleneck that keeps surfacing gets queued, then built as a deterministic tool.'
		},
		{
			title: 'Agent-maintained, human-validated (HITL)',
			body:
				'AIChieve runs on the architecture it writes about. Agents handle continuous site maintenance, tariff and rate-table monitoring, and first-pass research synthesis. A strict human review gate sits at the end of that: every benchmark, regulatory rule and cost assumption is cross-examined against primary sources before it goes live.'
		},
		{
			title: 'Primary-source dispatches',
			body:
				'Every article starts from something checkable: SEC filings, carrier invoices, hardware benchmarks, operational telemetry. The pipeline drafts; I verify the figures, cut the padding, and sign the result.'
		},
		{
			title: 'Deterministic client-side engines',
			body:
				'The standard calculators run entirely in your browser on transparent formulas. No number on this site comes from a language model guessing at arithmetic, and nothing you type is uploaded.'
		},
		{
			title: 'File-based audit prototypes (PRO)',
			body:
				'The PRO apps stress-test messy real-world files: carrier invoices, EU e-invoices, ledger exports, warehouse CAPEX cases. Each one names the lines that do not reconcile instead of summarising them.'
		}
	],
	architect: {
		title: 'Jorge Fernandez',
		body: [
			'I work at the intersection of supply chain operations, enterprise systems architecture, data and applied AI. That overlap is where the questions on this site come from.',
			'I own the pipeline end to end: the agents do the monitoring, drafting and maintenance, and I do the verification and the judgement calls.'
		],
		disclaimer:
			'Independence Disclaimer: AIChieve.net is an independent personal research and software engineering project. All dispatches, mathematical models, prototypes and opinions published here are strictly my own and do not represent the views, strategies or endorsements of my employer or any enterprise client.'
	},
	architecture: {
		kicker: 'System Architecture // Human-in-the-Loop',
		body:
			'AIChieve is a live engineering testbed for semi-autonomous research and tool generation. Agents monitor practitioner threads, operator forums and hardware benchmarks for bottlenecks worth modelling. They draft the dispatches and the models; a human systems architect then stress-tests, edits and verifies each output before it deploys.',
		steps: ['Ingest', 'Draft', 'Human review', 'Deploy']
	}
};

export async function getOverviewContent() {
	return OVERVIEW;
}
