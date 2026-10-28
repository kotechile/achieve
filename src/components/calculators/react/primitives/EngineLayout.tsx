/**
 * The engine frame: a 35/65 split with the controls on the left rail.
 *
 * The rail is the input surface and the readout is the answer, so the split is not decorative — it is
 * the order the reader works in. On a phone the rail stacks above the readout, because a reader who has
 * to scroll past a chart to find the inputs will not use them.
 *
 * Everything inside one engine shares this root, which is what scopes the `.engine` token layer in
 * aichieve.css §8. An engine component that renders outside it gets no colour at all — deliberately,
 * so a missing frame is loud rather than subtly wrong.
 */
import React from 'react';

export function EngineLayout({ rail, children }: { rail: React.ReactNode; children: React.ReactNode }) {
	return (
		<div className="engine">
			<div className="en__grid">
				<div className="en__rail">{rail}</div>
				<div className="en__readout">{children}</div>
			</div>
		</div>
	);
}
