/**
 * Engine state, reflected into the address bar.
 *
 * WHY A URL INSTEAD OF localStorage
 * The buyer's real workflow is "send this to my CFO": a link that reopens the same scenario is the
 * whole point of the tool. localStorage helps one person on one browser; a URL survives Slack, email
 * and an approval memo.
 *
 * THE THREE RULES THIS HOOK ENFORCES
 * 1. `replaceState`, never `pushState` — the back button must leave the page, not walk backwards
 *    through slider positions.
 * 2. Hydration-safe — the first render always uses the defaults, so the server markup and the first
 *    client render agree. The URL is applied in an effect, one frame later.
 * 3. Every key is validated on the way in: unknown keys are dropped, out-of-range values are clamped,
 *    non-numeric values fall back to the default. A pasted or hand-edited link cannot put the engine
 *    into a state its inputs cannot produce.
 *
 * Key names are a public contract once links are shared. Renaming one is a migration, not a refactor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UrlFieldSpec {
	/** Query-string key. Short, stable, lowercase. */
	key: string;
	min?: number;
	max?: number;
	/** Decimal places to round to on a round trip. */
	decimals?: number;
	/**
	 * Allowed values for a string field (an incoterm, a service level name). A value not in this list
	 * is dropped on read, so a hand-edited link cannot put an engine into a state its selector cannot
	 * produce.
	 */
	values?: readonly string[];
}

export type UrlSpec<T> = Partial<Record<Extract<keyof T, string>, UrlFieldSpec>>;

const coerce = (raw: string | null, spec: UrlFieldSpec, fallback: number): number => {
	if (raw === null) return fallback;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return fallback;
	const clamped = Math.min(Math.max(parsed, spec.min ?? Number.NEGATIVE_INFINITY), spec.max ?? Number.POSITIVE_INFINITY);
	const rounded = spec.decimals === undefined ? clamped : Number(clamped.toFixed(spec.decimals));
	return Number.isFinite(rounded) ? rounded : fallback;
};

export function readEngineState<T extends object>(
	search: string,
	defaults: T,
	spec: UrlSpec<T>
): T {
	const params = new URLSearchParams(search);
	const next = { ...defaults } as Record<string, unknown>;
	for (const [name, field] of Object.entries(spec) as [Extract<keyof T, string>, UrlFieldSpec][]) {
		const fallback = (defaults as Record<string, unknown>)[name];
		if (typeof fallback === 'number') {
			next[name] = coerce(params.get(field.key), field, fallback);
			continue;
		}
		if (typeof fallback === 'string') {
			const raw = params.get(field.key);
			next[name] = raw !== null && (!field.values || field.values.includes(raw)) ? raw : fallback;
		}
	}
	return next as T;
}

export function serialiseEngineState<T extends object>(
	state: T,
	defaults: T,
	spec: UrlSpec<T>
): string {
	const params = new URLSearchParams();
	for (const [name, field] of Object.entries(spec) as [Extract<keyof T, string>, UrlFieldSpec][]) {
		const value = (state as Record<string, unknown>)[name];
		if (typeof value === 'string') {
			params.set(field.key, value);
			continue;
		}
		if (typeof value !== 'number' || !Number.isFinite(value)) continue;
		const rounded = field.decimals === undefined ? value : Number(value.toFixed(field.decimals));
		params.set(field.key, String(rounded));
	}
	void defaults;
	const query = params.toString();
	return query ? `?${query}` : '';
}

export function useUrlState<T extends object>(
	defaults: T,
	spec: UrlSpec<T>
): {
	state: T;
	setField: <K extends keyof T>(field: K, value: T[K]) => void;
	reset: () => void;
	/** True once the URL has been read, so a page can hold a skeleton for one frame if it wants. */
	hydrated: boolean;
} {
	const specKey = useMemo(() => JSON.stringify(spec), [spec]);
	const [state, setState] = useState<T>(defaults);
	const [hydrated, setHydrated] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Read once on mount. Runs after hydration, so server and client markup are identical.
	useEffect(() => {
		const parsed = readEngineState(window.location.search, defaults, spec);
		setState(parsed);
		setHydrated(true);
		// `defaults` and `spec` are frozen module constants at every call site; `specKey` catches the
		// case where one is rebuilt, without re-reading the URL on every keystroke.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [specKey]);

	// Write back, debounced: dragging a slider must not queue a hundred history entries.
	useEffect(() => {
		if (!hydrated) return;
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			const query = serialiseEngineState(state, defaults, spec);
			const next = `${window.location.pathname}${query}${window.location.hash}`;
			const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
			if (next !== current) window.history.replaceState(null, '', next);
		}, 300);
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state, hydrated, specKey]);

	const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
		setState((previous) => ({ ...previous, [field]: value }) as T);
	}, []);

	const reset = useCallback(() => {
		setState(defaults);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [specKey]);

	return { state, setField, reset, hydrated };
}
