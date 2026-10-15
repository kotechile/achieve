/**
 * Ownership-aware resolution of internal links found inside WordPress article bodies.
 *
 * WHY THIS EXISTS
 * Article HTML is authored in the shared CMS and contains plain internal links like
 * `href="https://cms.giniloh.com/best-ai-proof-jobs-in-a-changing-market/"`. `wordpress.ts`
 * rewrites those to front-end paths, and it used to rewrite EVERY one to a site-relative path.
 * That was correct while there was one site. After the 2026 split it silently produced broken
 * links: an aichieve article linking to a giniloh article was rewritten to `/that-slug/`, which
 * does not exist on aichieve.net and returned a 404. Measured at the time of the split:
 * 30 live 404s on aichieve.net and 5 on giniloh.com, across 18 articles.
 *
 * The rule now:
 *   · target owned by THIS property   -> site-relative path   ("/some-slug/")
 *   · target owned by the SIBLING     -> absolute sibling URL ("https://giniloh.com/some-slug/")
 *   · target unknown to both          -> left site-relative; it is a genuinely dead link in the
 *                                        content and guessing a destination would be worse than
 *                                        leaving it visible
 *
 * This is the single choke point, so it also covers links written tomorrow — no per-article
 * fixing, no drift.
 */
import { calculators } from './calculators/metadata';
import { OWNED_POST_SLUGS, FOREIGN_POST_SLUGS, OWNED_CATEGORY_SLUGS, SIBLING_SITE } from './site-content';

const OWNED_CATEGORIES = new Set<string>(OWNED_CATEGORY_SLUGS);
const OWN_TOOL_PATHS = new Set<string>(calculators.map((tool) => tool.href));

/**
 * Legacy giniloh paths that resolve to something this property serves. The moved tools are the
 * important entry: articles in the archive link to `/calculators/<slug>/` because that is where
 * those pages lived before the split.
 */
const LEGACY_LOCAL_PATHS: Record<string, string> = {
	'/calculators/gpu-compute/': '/tools/gpu-compute/',
	'/calculators/decision-intelligence/': '/tools/master-asset-tco/',
	'/calculators/': '/tools/',
	'/showcase/': '/apps/',
	'/pro-apps/': '/apps/'
};

/** Hosts that can appear in authored content and should be treated as internal. */
export const INTERNAL_HOSTS = ['cms.giniloh.com', 'giniloh.com', 'www.giniloh.com', 'aichieve.net', 'www.aichieve.net'];

/** Strip query/hash, the CMS dated-permalink prefix, and force a trailing slash. */
export function normalisePath(raw: string): string {
	let path = raw.split(/[?#]/)[0].trim();
	if (!path.startsWith('/')) path = `/${path}`;
	path = path.replace(/\/{2,}/g, '/');
	// The CMS serves /2026/06/12/slug/; the front end serves /slug/.
	path = path.replace(/^\/\d{4}\/\d{2}\/\d{2}\//, '/');
	if (path.length > 1 && !path.endsWith('/')) path += '/';
	return path;
}

/** Resolve one internal path to its correct destination for THIS property. */
export function resolveInternalLink(rawPath: string): string {
	const path = normalisePath(rawPath);
	const segment = path.replace(/^\//, '').replace(/\/$/, '');
	if (!segment) return '/';

	// Tools and app directory — matched exactly, before the generic rules, because
	// `/calculators/gpu-compute/` is also a plausible "slug" shape.
	if (OWN_TOOL_PATHS.has(path)) return path;
	if (LEGACY_LOCAL_PATHS[path]) return LEGACY_LOCAL_PATHS[path];

	// Categories. The taxonomy is fully partitioned between the two properties, so anything not
	// owned here belongs to the sibling.
	const category = path.match(/^\/(?:categories|category)\/([^/]+)\/$/);
	if (category) {
		const slug = category[1];
		return OWNED_CATEGORIES.has(slug)
			? `/categories/${slug}/`
			: `${SIBLING_SITE.origin}/categories/${slug}/`;
	}

	// Posts.
	const post = path.match(/^\/([^/]+)\/$/);
	if (post) {
		const slug = post[1];
		if (OWNED_POST_SLUGS.has(slug)) return `/${slug}/`;
		if (FOREIGN_POST_SLUGS.has(slug)) return `${SIBLING_SITE.origin}/${slug}/`;
		// Not published on either property — a dead link in the content. Leave it visible rather
		// than inventing a destination.
		return `/${slug}/`;
	}

	return path;
}
