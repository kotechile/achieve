/**
 * Analytics configuration for aichieve.net — committed, not just environment.
 *
 * The Dockerfile already declared `PUBLIC_ANALYTICS_*` as build args, but every default was empty and
 * the layout gated the tag on a non-empty id, so this property shipped with no analytics at all. From
 * the outside that is indistinguishable from "no traffic", and it made every later fix unverifiable.
 *
 * The website id is a public identifier — it appears in the served HTML — so it is versioned here.
 * Environment variables still win, for a staging build or a re-hosted Umami instance.
 *
 * Self-hosted Umami: the tracker and its collector both live on umami.aichieve.net, which is the
 * origin the script posts to by default.
 */
export const ANALYTICS = {
	/** Umami tracker. Self-hosted — not cloud.umami.is. */
	src: 'https://umami.aichieve.net/script.js',
	/** Umami → Websites → aichieve.net → Tracking code. One id PER PROPERTY: a shared id scoped to a
	 *  sibling's host drops this property's events without raising an error. */
	websiteId: '44370ac1-9456-4dcb-94bc-1b4cdd444058',
	/** Umami refuses to record a pageview from a host not in this list. */
	domains: 'aichieve.net,www.aichieve.net'
};
