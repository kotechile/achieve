/**
 * The decision engine behind the Master Asset & Software TCO Calculator.
 *
 * WHY THE SHAPE CHANGED (2026-10 redesign)
 * The old engine returned ~35 flat fields, one third of which only ever fed a single line of
 * JSX, and the component hard-coded eight separate layouts against them. Two problems came out
 * of that: the presentation logic drifted from the arithmetic (the "break-even" number was
 * computed on the wrong side of its own comparison), and every new mode meant another bespoke
 * block of markup.
 *
 * This engine instead returns a **decision record**: two options, each with a total and an
 * itemised breakdown, plus the figures, the premise flags and — where it means something — a
 * cumulative spend series. The React island renders one contract for all four modes, so a
 * verdict can no longer disagree with the numbers that produced it.
 *
 * Rules this file keeps:
 *   · Every number the UI shows is produced here. No arithmetic in JSX.
 *   · Every assumption the reader can argue with is an input, not a constant.
 *   · Premise flags never touch the arithmetic — they are not numbers. They downgrade the
 *     verdict's standing, which is a separate, honestly-labelled thing.
 */

export type DecisionMode =
	| 'enterprise_ciam'
	| 'personal_cpu'
	| 'personal_repair'
	| 'personal_tinkering';

export interface DecisionIntelligenceInputs {
	activeMode: DecisionMode;

	/* ── Enterprise: build the system or buy the platform ─────────────────── */
	mau: number;
	devRate: number;
	buildMonths: number;
	buildTeam: number;
	maintFtePct: number;
	complianceLevel: 'none' | 'soc2' | 'hipaa';
	complianceCostAnnual: number;
	opportunityCost3Yr: number;
	integrationHours: number;
	hasSunkCostFallacy: boolean;
	hasKeyPersonRisk: boolean;
	hasTinkeringTax: boolean;

	/* ── Per-use asset: own it or pay per use ─────────────────────────────── */
	cpuStickerPrice: number;
	cpuSecondaryCost: number;
	cpuOutsourceCost: number;
	cpuWeeklyUses: number;
	cpuLifespanYears: number;
	cpuResidualPct: number;
	cpuAspirationalCheck: boolean;

	/* ── Repair or replace ────────────────────────────────────────────────── */
	repairAssetType: 'infrastructure' | 'electronics';
	repairAssetAge: number;
	repairCost: number;
	repairReplacementCost: number;
	repairExtraLifeYears: number;
	repairReplacementLifeYears: number;

	/* ── Tinkering tax: free workaround or paid app ───────────────────────── */
	tinkerTroubleshootHours: number;
	tinkerTimeValue: number;
	tinkerSubscriptionCost: number;
	tinkerHobbyOffset: boolean;
}

/** One line of a cost breakdown. `hidden` marks the off-ledger costs. */
export interface LedgerRow {
	label: string;
	amount: number;
	/** Cost that does not appear on the invoice the reader is first shown. */
	hidden?: boolean;
	note?: string;
}

/** One side of the comparison. Always exactly two per decision. */
export interface OptionSide {
	key: string;
	eyebrow: string;
	label: string;
	total: number;
	/** Unit suffix for the total, when the sides are rates rather than sums ("/yr"). */
	totalLabel?: string;
	rows: LedgerRow[];
}

/** A single figure quoted next to the verdict. */
export interface DecisionFigure {
	label: string;
	value: string;
	note?: string;
}

/** A premise the arithmetic cannot decide. Checking one weakens the verdict. */
export interface Premise {
	label: string;
	statement: string;
	checked: boolean;
}

/** Cumulative spend, one value per month from month 0. */
export interface SpendSeries {
	key: string;
	label: string;
	points: number[];
}

export interface DecisionResult {
	mode: DecisionMode;
	/** Short slug for the verdict chip: BUY, BUILD, TOSS-UP, SKIP, REPAIR, WAIT. */
	verdict: string;
	/** What to actually do, in the imperative. */
	verdictLabel: string;
	/** One sentence: the conclusion, with the figure in it. */
	headline: string;
	/** True when the two options are within 2% of each other — no real answer. */
	tossUp: boolean;
	figures: DecisionFigure[];
	sides: [OptionSide, OptionSide];
	/** Month labels for `series`, index-aligned. Empty when there is no series. */
	seriesLabels: string[];
	series: SpendSeries[];
	/** First month where the favourite overtakes the other option, or null. */
	crossoverMonth: number | null;
	premises: Premise[];
	/** Ledger caption: what the two columns actually cover. */
	horizonLabel: string;
}

/* ── formatting ────────────────────────────────────────────────────────────── */

const usd = (value: number, decimals = 0) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(Number.isFinite(value) ? value : 0);

const money = (value: number) => usd(value, Math.abs(value) < 100 ? 2 : 0);
const int = (value: number) =>
	new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
		Number.isFinite(value) ? value : 0
	);
const months = (value: number) => `${int(value)} mo`;

/** Sum a breakdown. Every total in this file comes through here. */
const totalOf = (rows: LedgerRow[]) => rows.reduce((sum, row) => sum + row.amount, 0);

/**
 * Volume-tiered subscription for a managed auth platform.
 * Tiers are the published Clerk-style shape: free to 10k MAU, then per-MAU overage.
 */
export function saasMonthlySubscription(mau: number): number {
	if (mau <= 10_000) return 0;
	if (mau <= 50_000) return 25 + (mau - 10_000) * 0.02;
	if (mau <= 100_000) return 825 + (mau - 50_000) * 0.015;
	return 1_575 + (mau - 100_000) * 0.01;
}

/** Compliance certification carried by the org that owns the code. */
export function defaultComplianceCost(level: DecisionIntelligenceInputs['complianceLevel']): number {
	if (level === 'soc2') return 75_000;
	if (level === 'hipaa') return 150_000;
	return 0;
}

/**
 * Cumulative spend for both sides, month by month.
 *
 * Returns the index of the first month where `left` becomes cheaper than `right` — that is the
 * real crossover, and the number the old "break-even" panel was reaching for. `null` means the
 * lines never meet inside the horizon, which is a result, not a failure: it says the decision is
 * not a timing question at all.
 */
function crossoverIndex(left: number[], right: number[]): number | null {
	for (let i = 0; i < left.length; i += 1) {
		if (i === 0) continue;
		const before = left[i - 1] - right[i - 1];
		const after = left[i] - right[i];
		if (before > 0 && after <= 0) return i;
	}
	return null;
}

const tossUpBand = 0.02;

/* ── enterprise ───────────────────────────────────────────────────────────── */

function enterprise(inputs: DecisionIntelligenceInputs): DecisionResult {
	const hoursPerMonth = 160;
	const buildMonths = Math.max(1, inputs.buildMonths);

	// Build labour is team-months at a loaded rate. `buildTeam` used to be a bare 1.5.
	const buildLabour = buildMonths * hoursPerMonth * inputs.buildTeam * inputs.devRate;
	const maintMonthly = (inputs.maintFtePct / 100) * hoursPerMonth * inputs.devRate;
	const maintenance3Yr = maintMonthly * 36;
	const compliance3Yr = inputs.complianceCostAnnual * 3;
	const opportunity = inputs.opportunityCost3Yr;

	const buildRows: LedgerRow[] = [
		{ label: 'Build labour', amount: buildLabour, note: `${buildMonths} mo × ${inputs.buildTeam} eng` },
		{ label: 'Maintenance', amount: maintenance3Yr, hidden: true, note: `${inputs.maintFtePct}% of one engineer` },
		{
			label: 'Compliance certification',
			amount: compliance3Yr,
			hidden: inputs.complianceLevel !== 'none',
			note: inputs.complianceLevel === 'none' ? 'Not in scope' : `${usd(inputs.complianceCostAnnual)}/yr`
		},
		{ label: 'Roadmap opportunity', amount: opportunity, hidden: true, note: 'Capacity spent maintaining' }
	];

	const saasMonthly = saasMonthlySubscription(inputs.mau);
	const integration = inputs.integrationHours * inputs.devRate;
	const subscription3Yr = saasMonthly * 36;

	const buyRows: LedgerRow[] = [
		{ label: 'Integration labour', amount: integration, note: `${inputs.integrationHours} h at ${usd(inputs.devRate)}/h` },
		{ label: 'Subscription', amount: subscription3Yr, note: `${usd(saasMonthly)}/mo, tiered` },
		{ label: 'Compliance certification', amount: 0, note: 'Carried by the vendor' },
		{ label: 'Roadmap opportunity', amount: 0, note: 'No in-house surface to maintain' }
	];

	const buildTotal = totalOf(buildRows);
	const buyTotal = totalOf(buyRows);
	const delta = buildTotal - buyTotal;
	const cheaperToBuy = delta > 0;
	const tossUp = Math.abs(delta) <= buildTotal * tossUpBand;

	// Month-by-month cumulative spend. Build labour, compliance and opportunity land across the
	// build window; maintenance runs from month one. The buy side is a step then a slope.
	const seriesLabels: string[] = [];
	const buildPoints: number[] = [];
	const buyPoints: number[] = [];
	for (let m = 0; m <= 36; m += 1) {
		seriesLabels.push(m === 0 ? 'now' : m % 6 === 0 ? `m${m}` : '');
		const buildShare = Math.min(m / buildMonths, 1);
		buildPoints.push(
			buildLabour * buildShare +
				maintenance3Yr * (m / 36) +
				compliance3Yr * (m / 36) +
				opportunity * (m / 36)
		);
		buyPoints.push(m === 0 ? 0 : integration + saasMonthly * m);
	}

	const crossoverMonth = crossoverIndex(buildPoints, buyPoints);
	const perMau = (value: number) => usd(value / Math.max(inputs.mau, 1) / 36, 4);

	const figures: DecisionFigure[] = [
		{
			label: '36-month difference',
			value: usd(Math.abs(delta)),
			note: cheaperToBuy ? 'Buying is cheaper' : 'Building is cheaper'
		},
		{ label: 'Cost per MAU / month', value: `${perMau(buyTotal)} vs ${perMau(buildTotal)}`, note: 'Buy vs build' },
		{
			label: 'Off-ledger drag',
			value: usd(maintenance3Yr + compliance3Yr + opportunity),
			note: 'Maintenance, compliance, opportunity'
		},
		{
			label: 'Hidden share of build',
			value: `${int(((maintenance3Yr + compliance3Yr + opportunity) / buildTotal) * 100)}%`,
			note: 'Not on the build invoice'
		}
	];

	const premises: Premise[] = [
		{
			label: 'Sunk-cost pull',
			statement: 'We have already spent real hours on the current auth code, so it feels wrong to walk away.',
			checked: inputs.hasSunkCostFallacy
		},
		{
			label: 'Single-maintainer risk',
			statement: 'One senior engineer holds the OAuth flow and token validation.',
			checked: inputs.hasKeyPersonRisk
		},
		{
			label: 'Brittle integration',
			statement: 'Sessions depend on stitched-together external tables and automation.',
			checked: inputs.hasTinkeringTax
		}
	];

	const verdict = tossUp ? 'TOSS-UP' : cheaperToBuy ? 'BUY' : 'BUILD';
	const verdictLabel = tossUp
		? 'The two are within 2%. Argue it on maintenance risk.'
		: cheaperToBuy
			? 'Buy the platform and cancel the build'
			: 'Build it in-house';

	const headline = tossUp
		? `Both routes land within ${usd(buildTotal * tossUpBand)} of each other over 36 months (${usd(buildTotal)} build, ${usd(buyTotal)} buy).`
		: cheaperToBuy
			? `Buying is ${usd(delta)} cheaper over 36 months: ${usd(buyTotal)} against ${usd(buildTotal)} to own it.`
			: `Building is ${usd(-delta)} cheaper over 36 months: ${usd(buildTotal)} against ${usd(buyTotal)} to subscribe.`;

	return {
		mode: 'enterprise_ciam',
		verdict,
		verdictLabel,
		headline,
		tossUp,
		figures,
		sides: [
			{ key: 'build', eyebrow: 'Option A', label: 'In-house build', total: buildTotal, rows: buildRows },
			{ key: 'buy', eyebrow: 'Option B', label: 'Managed platform', total: buyTotal, rows: buyRows }
		],
		seriesLabels,
		series: [
			{ key: 'build', label: 'In-house build', points: buildPoints },
			{ key: 'buy', label: 'Managed platform', points: buyPoints }
		],
		crossoverMonth,
		premises,
		horizonLabel: '36 months, fully loaded'
	};
}

/* ── per-use asset ────────────────────────────────────────────────────────── */

function costPerUse(inputs: DecisionIntelligenceInputs): DecisionResult {
	const weeklyUses = Math.max(0, inputs.cpuWeeklyUses);
	const lifespan = Math.max(1, inputs.cpuLifespanYears);
	const monthsTotal = lifespan * 12;
	const totalUses = weeklyUses * 52 * lifespan;

	const residual = inputs.cpuStickerPrice * (inputs.cpuResidualPct / 100);
	const upkeep = inputs.cpuStickerPrice * 0.05 * lifespan; // 5% of sticker per year, reserve
	const operating = totalUses * inputs.cpuSecondaryCost;

	const ownRows: LedgerRow[] = [
		{ label: 'Sticker price', amount: inputs.cpuStickerPrice },
		{ label: 'Resale recovered', amount: -residual, note: `${inputs.cpuResidualPct}% at exit` },
		{ label: 'Operating cost', amount: operating, hidden: true, note: `${usd(inputs.cpuSecondaryCost)} per use` },
		{ label: 'Upkeep reserve', amount: upkeep, hidden: true, note: '5% of sticker per year' }
	];
	const ownTotal = totalOf(ownRows);

	const outsourcePerUse = inputs.cpuOutsourceCost;
	const outsourceTotal = totalUses * outsourcePerUse;
	const outsourceRows: LedgerRow[] = [
		{
			label: 'Per-use spend',
			amount: outsourceTotal,
			note: `${usd(outsourcePerUse)} × ${int(totalUses)} uses`
		},
		{ label: 'Asset at the end', amount: 0, note: 'Nothing to resell' }
	];

	const ownPerUse = totalUses > 0 ? ownTotal / totalUses : 0;
	const cheaperToOwn = ownPerUse < outsourcePerUse;
	const tossUp = Math.abs(ownPerUse - outsourcePerUse) <= outsourcePerUse * tossUpBand;

	const fixedCost = inputs.cpuStickerPrice - residual + upkeep;
	const perUseGap = outsourcePerUse - inputs.cpuSecondaryCost;
	const breakEvenUses = perUseGap > 0 ? fixedCost / perUseGap : Infinity;
	const usesPerMonth = (weeklyUses * 52) / 12;
	const breakEvenMonth = usesPerMonth > 0 ? breakEvenUses / usesPerMonth : Infinity;

	const seriesLabels: string[] = [];
	const ownPoints: number[] = [];
	const outsourcePoints: number[] = [];
	for (let m = 0; m <= monthsTotal; m += 1) {
		seriesLabels.push(m === 0 ? 'now' : `m${m}`);
		const uses = (weeklyUses * 52 * m) / 12;
		ownPoints.push(inputs.cpuStickerPrice - residual + uses * inputs.cpuSecondaryCost + upkeep * (m / monthsTotal));
		outsourcePoints.push(uses * outsourcePerUse);
	}

	const figures: DecisionFigure[] = [
		{ label: 'Own, per use', value: usd(ownPerUse, 2), note: `${int(totalUses)} uses over ${lifespan} yr` },
		{ label: 'Outsource, per use', value: usd(outsourcePerUse, 2), note: 'Per use, no asset' },
		{
			label: 'Break-even',
			value: Number.isFinite(breakEvenMonth) && breakEvenMonth > 0 ? months(Math.ceil(breakEvenMonth)) : 'Never',
			note: Number.isFinite(breakEvenUses) && breakEvenUses > 0 ? `${int(Math.ceil(breakEvenUses))} uses` : 'No gap to close'
		},
		{
			label: `${lifespan}-year difference`,
			value: usd(Math.abs(outsourceTotal - ownTotal)),
			note: cheaperToOwn ? 'Ownership wins' : 'Outsourcing wins'
		}
	];

	const verdict = tossUp ? 'TOSS-UP' : cheaperToOwn ? 'BUY' : 'SKIP';
	return {
		mode: 'personal_cpu',
		verdict,
		verdictLabel: tossUp
			? 'Within 2% per use. Buy it for the ownership, not the maths.'
			: cheaperToOwn
				? 'Own it'
				: 'Keep paying per use',
		headline: tossUp
			? `Ownership and the per-use rate land within ${usd(outsourcePerUse * tossUpBand, 2)} of each other per use (${usd(ownPerUse, 2)} against ${usd(outsourcePerUse, 2)}).`
			: cheaperToOwn
				? `Owning costs ${usd(ownPerUse, 2)} per use against ${usd(outsourcePerUse, 2)} to outsource — ${usd(outsourceTotal - ownTotal)} saved across ${int(totalUses)} uses.`
				: `Outsourcing costs ${usd(outsourcePerUse, 2)} per use against ${usd(ownPerUse, 2)} to own — the asset does not earn back its sticker at ${weeklyUses} uses a week.`,
		tossUp,
		figures,
		sides: [
			{ key: 'own', eyebrow: 'Option A', label: 'Own the asset', total: ownTotal, rows: ownRows },
			{ key: 'outsource', eyebrow: 'Option B', label: 'Pay per use', total: outsourceTotal, rows: outsourceRows }
		],
		seriesLabels,
		series: [
			{ key: 'own', label: 'Own the asset', points: ownPoints },
			{ key: 'outsource', label: 'Pay per use', points: outsourcePoints }
		],
		crossoverMonth: crossoverIndex(ownPoints, outsourcePoints),
		premises: [
			{
				label: 'Aspirational frequency',
				statement: `I will keep using this ${weeklyUses} times a week for ${lifespan} years, through the cleaning and the setup.`,
				checked: inputs.cpuAspirationalCheck
			}
		],
		horizonLabel: `${lifespan} years of owned use`
	};
}

/* ── repair or replace ────────────────────────────────────────────────────── */

function repairOrReplace(inputs: DecisionIntelligenceInputs): DecisionResult {
	const infra = inputs.repairAssetType === 'infrastructure';
	const threshold = infra ? 5_000 : 1_500;
	const index = inputs.repairAssetAge * inputs.repairCost;

	const extraLife = Math.max(1, inputs.repairExtraLifeYears);
	const replacementLife = Math.max(1, inputs.repairReplacementLifeYears);

	// Amortise both routes across the life each one actually buys. This is the only defensible
	// comparison — a repair buys a few more years, a replacement buys a decade — and it also
	// keeps the ledger totals honest: showing a $1,700 repair next to a $6,120 replacement made
	// the cheaper-per-year route look three times dearer than the verdict said it was.
	const repairPerYear = inputs.repairCost / extraLife;
	const replacePerYear = inputs.repairReplacementCost / replacementLife;
	const tradeIn = inputs.repairReplacementCost * 0.1;

	const repairRows: LedgerRow[] = [
		{
			label: 'Repair quote',
			amount: repairPerYear,
			note: `${usd(inputs.repairCost)} once, ÷ ${extraLife} yr`
		}
	];

	const replaceRows: LedgerRow[] = [
		{
			label: 'Replacement price',
			amount: replacePerYear,
			note: `${usd(inputs.repairReplacementCost)} once, ÷ ${replacementLife} yr`
		},
		{
			label: 'Trade-in on the old unit',
			amount: -tradeIn / replacementLife,
			note: `10% of the price, recovered once`
		}
	];

	const repairAnnual = totalOf(repairRows);
	const replaceAnnual = totalOf(replaceRows);

	const moneyFavoursRepair = repairAnnual <= replaceAnnual;
	const indexBreached = index >= threshold;
	const tossUp = Math.abs(repairAnnual - replaceAnnual) <= Math.max(repairAnnual, replaceAnnual) * tossUpBand;

	// Two signals, and they are allowed to disagree. The index is the advertised metric, so a
	// breach carries the verdict — but the copy says so out loud rather than pretending the
	// money agreed.
	const replace = !tossUp && (indexBreached || !moneyFavoursRepair);

	const figures: DecisionFigure[] = [
		{ label: 'Repair, per year', value: usd(repairAnnual), note: `${usd(inputs.repairCost)} buys ${extraLife} yr` },
		{ label: 'Replace, per year', value: usd(replaceAnnual), note: `${usd(inputs.repairReplacementCost)} buys ${replacementLife} yr` },
		{ label: 'Tech-debt index', value: int(index), note: `Threshold ${int(threshold)}` },
		{
			label: 'Index position',
			value: `${int((index / threshold) * 100)}% of threshold`,
			note: indexBreached ? 'Breached' : 'Inside the safe band'
		}
	];

	const headline = tossUp
		? `Repair and replacement both run about ${usd(repairAnnual)} a year over the life each buys.`
		: replace && !moneyFavoursRepair
			? `Replacement runs ${usd(replaceAnnual)} a year against ${usd(repairAnnual)} to keep repairing, and the ${int(index)} index is over the ${int(threshold)} threshold.`
			: replace
				? `Repair is cheaper at ${usd(repairAnnual)} a year against ${usd(replaceAnnual)}, but the ${int(index)} index is past the ${int(threshold)} threshold: ${extraLife} more years of a failing unit.`
				: `Repairing costs ${usd(repairAnnual)} a year against ${usd(replaceAnnual)} to replace, and the ${int(index)} index sits under the ${int(threshold)} threshold.`;

	return {
		mode: 'personal_repair',
		verdict: tossUp ? 'TOSS-UP' : replace ? 'REPLACE' : 'REPAIR',
		verdictLabel: tossUp
			? 'The two routes cost the same per year. Replace on age, not money.'
			: replace && moneyFavoursRepair
				? 'Replace on the failure record, not the price'
				: replace
					? 'Replace it'
					: 'Repair and keep it',
		headline,
		tossUp,
		figures,
		sides: [
			{
				key: 'repair',
				eyebrow: 'Option A',
				label: 'Repair and keep',
				total: repairAnnual,
				totalLabel: '/yr',
				rows: repairRows
			},
			{
				key: 'replace',
				eyebrow: 'Option B',
				label: 'Replace',
				total: replaceAnnual,
				totalLabel: '/yr',
				rows: replaceRows
			}
		],
		seriesLabels: [],
		series: [],
		crossoverMonth: null,
		premises: [
			{
				label: 'Repeated failure',
				statement: 'This unit has already failed more than once in the last 12 months, and the repair history is not unusual.',
				checked: false
			}
		],
		horizonLabel: 'Per year of life bought'
	};
}

/* ── tinkering tax ────────────────────────────────────────────────────────── */

function tinkeringTax(inputs: DecisionIntelligenceInputs): DecisionResult {
	const monthlyTime = inputs.tinkerTroubleshootHours * inputs.tinkerTimeValue;
	const time3Yr = monthlyTime * 36;
	const sub3Yr = inputs.tinkerSubscriptionCost * 36;

	const keepRows: LedgerRow[] = [
		{ label: 'Troubleshooting time', amount: time3Yr, hidden: true, note: `${inputs.tinkerTroubleshootHours} h/mo at ${usd(inputs.tinkerTimeValue)}/h` },
		{ label: 'Software spend', amount: 0, note: 'Free stack' }
	];
	const payRows: LedgerRow[] = [
		{ label: 'Subscription', amount: sub3Yr, note: `${usd(inputs.tinkerSubscriptionCost)}/mo` },
		{ label: 'Troubleshooting time', amount: 0, note: 'Removed by the paid tool' }
	];

	const keepTotal = time3Yr;
	const payTotal = sub3Yr;
	const saving = keepTotal - payTotal;

	const seriesLabels: string[] = [];
	const keepPoints: number[] = [];
	const payPoints: number[] = [];
	for (let m = 0; m <= 36; m += 1) {
		seriesLabels.push(m === 0 ? 'now' : m % 6 === 0 ? `m${m}` : '');
		keepPoints.push(monthlyTime * m);
		payPoints.push(inputs.tinkerSubscriptionCost * m);
	}

	const tossUp = Math.abs(saving) <= Math.max(keepTotal, payTotal) * tossUpBand;
	const bringInApp = !tossUp && saving > 0;

	const figures: DecisionFigure[] = [
		{ label: 'Time cost', value: `${usd(monthlyTime)}/mo`, note: `${inputs.tinkerTroubleshootHours} h at ${usd(inputs.tinkerTimeValue)}/h` },
		{ label: 'Subscription', value: `${usd(inputs.tinkerSubscriptionCost)}/mo`, note: `${usd(sub3Yr)} over 3 years` },
		{ label: '3-year difference', value: usd(Math.abs(saving)), note: bringInApp ? 'Paid app wins' : 'Workaround wins' },
		{ label: 'Hours reclaimed', value: `${int(inputs.tinkerTroubleshootHours * 36)} h`, note: 'Over 36 months' }
	];

	return {
		mode: 'personal_tinkering',
		verdict: tossUp ? 'TOSS-UP' : bringInApp ? 'BUY' : 'WAIT',
		verdictLabel: tossUp
			? 'Time and money cancel out. Decide on maintenance appetite.'
			: bringInApp
				? 'Pay for the app'
				: 'Keep the workaround',
		headline: tossUp
			? `The paid app costs about what the tinkering costs — ${usd(monthlyTime)} a month of your time against ${usd(inputs.tinkerSubscriptionCost)} of subscription.`
			: bringInApp
				? `The paid app is ${usd(saving)} cheaper over 3 years and returns ${int(inputs.tinkerTroubleshootHours * 36)} hours of maintenance.`
				: `Your time costs ${usd(monthlyTime)}/mo against a ${usd(inputs.tinkerSubscriptionCost)}/mo subscription, so the workaround is the cheaper route.`,
		tossUp,
		figures,
		sides: [
			{ key: 'keep', eyebrow: 'Option A', label: 'Keep the workaround', total: keepTotal, rows: keepRows },
			{ key: 'pay', eyebrow: 'Option B', label: 'Pay for the app', total: payTotal, rows: payRows }
		],
		seriesLabels,
		series: [
			{ key: 'keep', label: 'Keep the workaround', points: keepPoints },
			{ key: 'pay', label: 'Pay for the app', points: payPoints }
		],
		crossoverMonth: crossoverIndex(keepPoints, payPoints),
		premises: [
			{
				label: 'It is a hobby',
				statement: 'I actually enjoy the debugging, so the hours are leisure rather than a chore.',
				checked: inputs.tinkerHobbyOffset
			}
		],
		horizonLabel: '36 months'
	};
}

export const DecisionIntelligenceEngine = {
	calculate(inputs: DecisionIntelligenceInputs): DecisionResult {
		switch (inputs.activeMode) {
			case 'personal_cpu':
				return costPerUse(inputs);
			case 'personal_repair':
				return repairOrReplace(inputs);
			case 'personal_tinkering':
				return tinkeringTax(inputs);
			case 'enterprise_ciam':
			default:
				return enterprise(inputs);
		}
	}
};
