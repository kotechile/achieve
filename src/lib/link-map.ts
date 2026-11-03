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
 * fixing, no drift. `stripSiblingLinks` below is the second half of the same policy: keep the
 * URL resolvable, then remove it from the rendered body.
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

/**
 * Host of the sibling property, e.g. `giniloh.com`. Taken from SIBLING_SITE so the strip and the
 * 301 map can never disagree about which domain is the other property.
 */
const SIBLING_HOST = new URL(SIBLING_SITE.origin).host;

function isSiblingHref(href: string): boolean {
	try {
		const { host } = new URL(href, 'https://placeholder.invalid');
		return host === SIBLING_HOST || host === `www.${SIBLING_HOST}`;
	} catch {
		return false;
	}
}

/** True when the fragment contains an anchor pointing at the sibling property. */
function containsSiblingLink(fragment: string): boolean {
	return [...fragment.matchAll(/href="([^"]*)"/gi)].some(([, href]) => isSiblingHref(href));
}

/**
 * Remove the stale "— more on <category>" suffix from a "Related reading" list item.
 *
 * The CMS writes that label from whichever category the ORIGINAL post was filed under, and it is
 * wrong on every dispatch that was re-filed by the 2026 split: an AI-governance article still
 * says "more on Mental Models & Strategy" because that was the category on giniloh.com. Leaving
 * the wrong topic label attached to a correct link is worse than a bare title.
 */
function dropStaleCategorySuffix(item: string): string {
	return item.replace(/\s*[—–-]\s*more on\s+[^<]*?(<\/li>)$/i, '$1');
}

/**
 * Remove every link to the sibling property from an article body.
 *
 * WHY, GIVEN resolveInternalLink KEEPS SIBLING LINKS ALIVE
 * Keeping the URL absolute stops a 404, which was the measured bug at split time. It does not
 * stop the content from being wrong for this audience: a supply-chain dispatch ending in
 * "Related reading" links to an espresso-machine cost-per-use post is promoting the other
 * property's subject matter on the enterprise site — 31 of 186 dispatches did exactly that, and
 * every one of them handed a reader to giniloh.com from inside an AIChieve article.
 *
 * The single intended cross-link lives in the footer, not in the archive. Applied after
 * `resolveInternalLink`, so it also catches links that only became absolute during the rewrite.
 */
export function stripSiblingLinks(html: string): string {
	if (!html.includes(SIBLING_HOST)) return html;

	// "Related reading" lists: drop the items that point at the sibling, and drop the whole
	// heading + list when nothing owned remains. Two of three items were routinely foreign, so
	// leaving empty headings behind would be the common case, not the edge case.
	let out = html.replace(
		/(<h2[^>]*>\s*Related reading\s*<\/h2>\s*<ul>)([\s\S]*?)(<\/ul>)/gi,
		(_match, open: string, listBody: string, close: string) => {
			const items = listBody.match(/<li\b[\s\S]*?<\/li>/gi) ?? [];
			const kept = items
				.filter((item) => !containsSiblingLink(item))
				.map((item) => dropStaleCategorySuffix(item));
			if (kept.length === 0) return '';
			return `${open}${kept.join('')}${close}`;
		}
	);

	// Everything else: unwrap the anchor and keep its text. An inline reference in prose still
	// reads as a reference; it just no longer sends the reader to the other property.
	out = out.replace(
		/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
		(match, href: string, text: string) => (isSiblingHref(href) ? text : match)
	);

	return out;
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
