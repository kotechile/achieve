/**
 * The three readouts at the top of every engine, plus the verdict under the canvas.
 *
 * The strip is deliberately three and not four: a fourth KPI on a 22rem rail's readout column wraps on
 * a laptop and pushes the canvas below the fold, and a readout nobody scrolls to is decoration. Each
 * engine picks the three figures that answer its question, and every one of them is a value the engine
 * returned — nothing here is computed in JSX.
 */
import React from 'react';
import type { EngineTone, EngineVerdict, ExcludedItem } from '../../../../lib/calculators/engineTypes';

export interface Kpi {
	label: string;
	value: string;
	note?: string;
	tone?: EngineTone;
}

export function KpiStrip({ items }: { items: Kpi[] }) {
	return (
		<div className="en-kpis">
			{items.map((item) => (
				<div className="en-kpi" key={item.label}>
					<span className="en-kpi__label">{item.label}</span>
					<span className={item.tone ? `en-kpi__value en-tone--${item.tone}` : 'en-kpi__value'}>
						{item.value}
					</span>
					{item.note ? <span className="en-kpi__note">{item.note}</span> : null}
				</div>
			))}
		</div>
	);
}

/** The engine's own conclusion. Tone comes from the engine, never from the component. */
export function Verdict({ verdict }: { verdict: EngineVerdict }) {
	return (
		<div className="en-verdict" data-tone={verdict.tone}>
			<p className="en-verdict__call">{verdict.call}</p>
			<p className="en-verdict__headline">{verdict.headline}</p>
			{verdict.body ? <p className="en-verdict__body">{verdict.body}</p> : null}
		</div>
	);
}

/**
 * The caveats the engine insists on. Rendered as a list rather than prose so a reader scanning for
 * "what is this number not" finds them without reading a paragraph.
 */
export function Refusals({ lines }: { lines: string[] }) {
	if (!lines.length) return null;
	return (
		<ul className="en-note">
			{lines.map((line) => (
				<li key={line}>{line}</li>
			))}
		</ul>
	);
}

/**
 * What the model does not answer, and which system holds the answer.
 *
 * Deliberately not folded into `Refusals`: a refusal is a caveat about the arithmetic ("payback is
 * undiscounted"), an exclusion is a question the page is not answering at all ("we did not read your
 * ledger"). A reader who skims one paragraph for caveats should not find the two mixed.
 */
export function Excluded({ items, heading }: { items: ExcludedItem[]; heading: string }) {
	if (!items.length) return null;
	return (
		<section className="en-excluded" aria-labelledby="en-excluded-heading">
			<p className="en-excluded__label" id="en-excluded-heading">
				{heading}
			</p>
			<dl className="en-excluded__list">
				{items.map((item) => (
					<div className="en-excluded__item" key={item.label}>
						<dt className="en-excluded__term">{item.label}</dt>
						<dd className="en-excluded__why">{item.why}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}

export interface BridgeProps {
	label: string;
	body: string;
	appName: string;
	href: string;
}

/** The paid tool that runs the same question on the reader's own file. */
export function ProBridge({ label, body, appName, href }: BridgeProps) {
	return (
		<div className="en-bridge">
			<p className="en-bridge__label">{label}</p>
			<p className="en-bridge__body">{body}</p>
			<a className="en-bridge__link" href={href} rel="noopener">
				Open {appName} ↗
			</a>
		</div>
	);
}

export function ResetButton({ onClick }: { onClick: () => void }) {
	return (
		<button type="button" className="en-reset" onClick={onClick}>
			Reset to the published defaults
		</button>
	);
}
