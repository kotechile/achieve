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
// Ownership is DERIVED, not hand-written: each WordPress post carries a `vertical` term and
// Supabase `vertical_sites` maps vertical -> site_domain. scripts/routing-sync.mjs resolves that
// and writes src/data/ownership.generated.mjs, which is what this module reads.
//
// Adding a property, or moving a post, is now a DATA change -- insert a vertical_sites row and
// re-run `npm run routing:sync`. No edits to any front-end repo.
//
// src/data/ownership.mjs keeps the hand-written lists purely as the assertion baseline:
// `npm run routing:check` fails if the derived answer would make a currently-published post
// silently LEAVE this site.
import {
	OWNED_POST_SLUGS_GENERATED,
	FOREIGN_POST_SLUGS_GENERATED
} from '../data/ownership.generated.mjs';

export const OWNED_POST_SLUGS: ReadonlySet<string> = new Set<string>(OWNED_POST_SLUGS_GENERATED);

/** Posts that belong to the other property and must never render here. */
export const FOREIGN_POST_SLUGS: ReadonlySet<string> = new Set<string>(FOREIGN_POST_SLUGS_GENERATED);

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
