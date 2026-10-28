/**
 * The shared result contract for every standard engine.
 *
 * WHY THIS FILE EXISTS
 * Five engines sit in five components, and the cheapest way for them to drift is for each one to
 * invent its own "verdict" and its own refusal handling. Then one page prints a confident number
 * where another prints nothing, and the difference is invisible in review.
 *
 * So every engine returns the same three things beside its figures:
 *   · `verdict` — one machine-readable tone and three strings. The tone drives a CSS modifier, not
 *     a hand-chosen colour, so an unviable result cannot be rendered in the "good" colour.
 *   · `refusals` — the lines the page MUST print under the canvas. These are the model's own
 *     caveats (an assumption that moves the answer by an order of magnitude, a figure that is a
 *     ceiling rather than a saving, a cost that is structural and not recoverable). Keeping them
 *     in the result means the caveat travels with the number instead of depending on whoever
 *     writes the page copy.
 *   · `assumptions` — the dated constants actually used, so a stale table is visible on screen.
 */

export type EngineTone = 'base' | 'friction' | 'erosion' | 'positive';

export interface EngineVerdict {
	/** Drives the verdict panel's border and wash. Never chosen by the component. */
	tone: EngineTone;
	/** The eyebrow: what kind of statement this is. Upper case in the UI. */
	call: string;
	/** One sentence carrying the number. */
	headline: string;
	/** Optional second line explaining the mechanism, never repeating the headline. */
	body?: string;
}

export interface EngineResultBase {
	verdict: EngineVerdict;
	/** Caveats the page must print. Empty is legitimate; silent is not the same as empty. */
	refusals: string[];
}

/** A constant the model used, with the date it was read and where it came from. */
export interface AssumptionLine {
	label: string;
	value: string;
	source: string;
	effectiveFrom: string;
}
