import { filterOwnedPosts, belongsToSite, SIBLING_SITE } from './site-content';
import { resolveInternalLink, INTERNAL_HOSTS } from './link-map';
import { getAppsBase } from './apps';

interface WordPressRenderedField {
	rendered?: string;
}

interface WordPressMedia {
	source_url?: string;
	alt_text?: string;
}

interface WordPressTerm {
	id?: number;
	name?: string;
	slug?: string;
	/** `category`, `post_tag`, `vertical`, … — the embed flattens all of them into one list. */
	taxonomy?: string;
}

interface WordPressPostResponse {
	id: number;
	link?: string;
	date?: string;
	modified?: string;
	title?: WordPressRenderedField;
	excerpt?: WordPressRenderedField;
	content?: WordPressRenderedField;
	slug?: string;
	_embedded?: {
		'wp:featuredmedia'?: WordPressMedia[];
		'wp:term'?: WordPressTerm[][];
	};
}

interface WordPressCategoryResponse {
	id: number;
	count?: number;
	description?: string;
	name?: string;
	slug?: string;
	parent?: number;
}

/**
 * The editorial fleet a post belongs to, carried by the CMS `post_tag` terms.
 *
 * Closed in code on purpose: WordPress `post_tag` is an open vocabulary, so the front end reads
 * only these three slugs and ignores every other tag. See `docs/content-kinds-plan.md`.
 */
export type PostKind = 'news' | 'evergreen' | 'review';

export const POST_KINDS: readonly PostKind[] = ['news', 'evergreen', 'review'];

export const POST_KIND_LABELS: Record<PostKind, string> = {
	news: 'News',
	evergreen: 'Evergreen',
	review: 'Review'
};

export interface WordPressPost {
	id: number;
	title: string;
	excerpt: string;
	content: string;
	slug: string;
	link: string;
	date: string | null;
	modified: string | null;
	featuredImage: string | null;
	featuredImageAlt: string;
	categoryLabel: string | null;
	categorySlug: string | null;
	/**
	 * WordPress' own image derivatives, smallest first, from the featured media's media_details.
	 *
	 * Empty when the payload carries no sizes, in which case callers fall back to the single
	 * source URL — never to a URL this code invented.
	 */
	featuredImageSizes: { url: string; width: number; height: number }[];
	/** Intrinsic dimensions of the original, for width/height attributes. Null when unknown. */
	featuredImageWidth: number | null;
	featuredImageHeight: number | null;
	/**
	 * Editorial fleet of this post, from its `post_tag` terms: `news`, `evergreen` or `review`.
	 *
	 * Empty when the post carries none — the caller decides where unfiled posts belong (see
	 * `docs/content-kinds-plan.md`); this module never invents a kind.
	 */
	kinds: PostKind[];
}

export interface WordPressCategory {
	id: number;
	name: string;
	slug: string;
	description: string;
	parent: number | null;
	count: number;
}

const HTML_ENTITY_MAP: Record<string, string> = {
	'&amp;': '&',
	'&quot;': '"',
	'&lt;': '<',
	'&gt;': '>',
	'&apos;': "'",
	'&#039;': "'",
	'&#8216;': "'",
	'&#8217;': "'",
	'&lsquo;': "'",
	'&rsquo;': "'",
	'&#8211;': '–',
	'&ndash;': '–',
	'&#8212;': '—',
	'&mdash;': '—',
	'&#8220;': '"',
	'&#8221;': '"',
	'&ldquo;': '"',
	'&rdquo;': '"',
	'&#8230;': '…',
	'&hellip;': '…',
	'&nbsp;': ' '
};

function getWordPressApiBase() {
	const baseUrl =
		import.meta.env.PUBLIC_WORDPRESS_API_BASE ?? import.meta.env.WORDPRESS_API_BASE ?? 'https://cms.giniloh.com';
	return baseUrl.replace(/\/$/, '');
}

function decodeHtmlEntities(value: string) {
	if (!value) return '';
	return value.replace(/&[#a-zA-Z0-9]+;/g, (entity) => {
		if (entity in HTML_ENTITY_MAP) {
			return HTML_ENTITY_MAP[entity];
		}
		if (entity.startsWith('&#x') || entity.startsWith('&#X')) {
			const num = parseInt(entity.slice(3, -1), 16);
			return !isNaN(num) ? String.fromCharCode(num) : entity;
		}
		if (entity.startsWith('&#')) {
			const num = parseInt(entity.slice(2, -1), 10);
			return !isNaN(num) ? String.fromCharCode(num) : entity;
		}
		return entity;
	});
}

function stripHtml(value: string | undefined) {
	if (!value) {
		return '';
	}

	return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function normalizePost(post: WordPressPostResponse): WordPressPost {
	const terms = post._embedded?.['wp:term']?.flat() ?? [];

	// `wp:term` flattens EVERY taxonomy into one list — categories, post_tags and verticals.
	// Picking the first term that had a slug used to be safe only because categories are
	// registered first and no post carried a tag. Now that `news`/`evergreen`/`review` are real
	// tags, that luck is gone: a post with no category would have been labelled with its fleet
	// tag instead. Match on the taxonomy, and only fall back to a loose match for payloads that
	// omit it.
	const categoryTerm = terms.find((term) => term?.taxonomy === 'category' && term?.slug);
	const category = categoryTerm ?? terms.find((term) => !term?.taxonomy && term?.slug && term?.name);
	const kinds = POST_KINDS.filter((kind) => terms.some((term) => term?.slug === kind));
	const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0] as unknown as
		| {
				source_url?: string;
				alt_text?: string;
				media_details?: {
					width?: number;
					height?: number;
					sizes?: Record<string, { source_url?: string; width?: number; height?: number }>;
				};
		  }
		| undefined;
	
	let featuredImage = featuredMedia?.source_url ?? null;
	const apiBase = getWordPressApiBase();

	// Ensure featured image URL is absolute if it starts with /
	if (featuredImage && featuredImage.startsWith('/') && apiBase) {
		featuredImage = `${apiBase}${featuredImage}`;
	}

	// Responsive sources straight from WordPress' own derivatives. Measured before adding: the
	// featured originals are 1344x768 and 1376x768, and every card for every device was fetching
	// that original to fill a slot at most 208 CSS pixels wide. Astro's remote-image optimisation
	// was not an option here — it needs network access for every image on every build, and this
	// build has to survive a restricted environment (AGENTS.md) — so this uses the data the
	// response already carries and degrades to the plain src when it is absent.
	const mediaDetails = featuredMedia?.media_details;
	const absolute = (url: string) => (url.startsWith('/') && apiBase ? `${apiBase}${url}` : url);
	const featuredImageSizes = Object.values(mediaDetails?.sizes ?? {})
		.filter((size) => Boolean(size?.source_url && size?.width && size?.height))
		.map((size) => ({
			url: absolute(size.source_url as string),
			width: size.width as number,
			height: size.height as number
		}))
		.sort((a, b) => a.width - b.width);
	const featuredImageWidth = typeof mediaDetails?.width === 'number' ? mediaDetails.width : null;
	const featuredImageHeight = typeof mediaDetails?.height === 'number' ? mediaDetails.height : null;

	let htmlContent = post.content?.rendered || '';
	
	// Remove redundant "Short Answer" section and the "article-context" block inserted by WordPress
	htmlContent = htmlContent
		.replace(/<div class="article-context"[^>]*>[\s\S]*?<\/div>\s*<\/div>/ig, '')
		.replace(/<h2[^>]*>\s*Short Answer\s*<\/h2>\s*<p[^>]*>[\s\S]*?<\/p>/ig, '')
		.replace(/(<h[2-4][^>]*>)\s*Key Takeaways\s*(<\/h[2-4]>)/gi, '$1The Strategy Brief$2');

	// Clean up wpautop formatting inside LaTeX blocks so KaTeX doesn't choke on <br> tags
	// Matches $$...$$ or \[...\]
	htmlContent = htmlContent.replace(/(\$\$|\\\[)([\s\S]*?)(\$\$|\\\])/g, (_match, open, content, close) => {
		// Strip all HTML tags inside the math block and decode HTML entities that might break LaTeX
		let cleanContent = content
			.replace(/<[^>]+>/g, '') 
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>');
		return `${open}${cleanContent}${close}`;
	});

	// Clean up wpautop formatting inside and around SVG blocks.
	// WordPress wpautop injects <p>, </p>, and <br> tags inside raw SVGs on newlines,
	// which breaks the SVG DOM tree in browsers and forces the <svg> to close prematurely.
	htmlContent = htmlContent.replace(/<svg([\s\S]*?)<\/svg>/gi, (_match, inner) => {
		const cleanInner = inner
			.replace(/<\/?p[^>]*>/gi, '')
			.replace(/<br\s*\/?>/gi, '');
		return `<svg${cleanInner}</svg>`;
	});
	htmlContent = htmlContent.replace(/<p>\s*(<svg[\s\S]*?<\/svg>)\s*<\/p>/gi, '$1');
	htmlContent = htmlContent.replace(/<p>\s*<\/p>/gi, '');

	// Rewrite internal links so each one points at the property that actually OWNS its target.
	//
	// This used to rewrite every internal link to a site-relative path, which was correct while
	// there was one site. After the 2026 split it silently produced broken links: a giniloh
	// article linking to an aichieve article became `/that-slug/`, which does not exist here.
	// Measured at split time: 5 broken links here, 30 on aichieve.net, across 18 articles.
	// The ownership rules live in lib/link-map.ts.
	{
		const hostPattern = INTERNAL_HOSTS.map((host) => host.replace(/\./g, '\\.')).join('|');
		const internalHref = new RegExp(
			`href="(?:https?:\\/\\/(?:${hostPattern}))?(\\/(?!\\/)[^"]*)"`,
			'gi'
		);
		htmlContent = htmlContent.replace(internalHref, (match, rawPath) => {
			// Uploads and other CMS-owned assets must stay absolute so they keep loading straight
			// from the CMS. They are files, not pages, and must not be rewritten to a front-end path.
			if (/^\/(?:wp-content|wp-includes|wp-admin|wp-json)/i.test(rawPath)) {
				return match;
			}
			return `href="${resolveInternalLink(rawPath)}"`;
		});
	}

	htmlContent = normaliseLegacyAppHost(htmlContent);
	htmlContent = formatArticleHook(htmlContent);

	return {
		id: post.id,
		title: normaliseLegacyAppHost(stripHtml(post.title?.rendered)) || 'Untitled post',
		excerpt: normaliseLegacyAppHost(stripHtml(post.excerpt?.rendered)),
		content: htmlContent,
		slug: post.slug || '',
		link: post.slug ? `/${post.slug}/` : (post.link ?? '#'),
		date: post.date ?? null,
		modified: post.modified ?? post.date ?? null,
		featuredImage,
		featuredImageAlt: featuredMedia?.alt_text || '',
		featuredImageSizes,
		featuredImageWidth,
		featuredImageHeight,
		categoryLabel: category?.name ? stripHtml(category.name).replace(/:\s*$/, '').trim() : null,
		categorySlug: category?.slug ?? null,
		kinds
	};
}

/**
 * Wraps the opening hook paragraph(s) of an article in a dedicated `.article-hook` container.
 *
 * In the editorial architecture, each article opens with a narrative hook paragraph that delivers
 * the core premise or key finding before the first structural heading (e.g. "The big picture:").
 * This wraps that opening hook so it can be presented with a distinguished light-gray background,
 * smaller font size, and italic styling ("cursiva").
 */
function formatArticleHook(html: string): string {
	if (!html || html.includes('article-hook')) {
		return html;
	}

	let prefix = '';
	let rest = html;

	// Preserve any leading injected section (e.g., key takeaways block)
	const sectionMatch = rest.match(/^(\s*<section[\s\S]*?<\/section>\s*)/i);
	if (sectionMatch) {
		prefix = sectionMatch[1];
		rest = rest.slice(prefix.length);
	}

	// Locate the first section heading (e.g. <h2>, <h3>, or bold paragraph heading like <p><strong>The big picture)
	let headingPos = rest.length;
	const hMatch = rest.match(/<h[1-6][^>]*>/i);
	if (hMatch && hMatch.index !== undefined) {
		headingPos = hMatch.index;
	}
	const strongHeadingMatch = rest.match(/<p[^>]*>\s*<strong>\s*The big picture/i);
	if (strongHeadingMatch && strongHeadingMatch.index !== undefined && strongHeadingMatch.index < headingPos) {
		headingPos = strongHeadingMatch.index;
	}

	const beforeHeading = rest.slice(0, headingPos);
	const afterHeading = rest.slice(headingPos);

	// Extract all <p>...</p> tags before the first heading
	const paragraphMatches = [...beforeHeading.matchAll(/<p[^>]*>[\s\S]*?<\/p>/gi)];
	if (paragraphMatches.length === 0) {
		return html;
	}

	// If there are 1 or 2 paragraphs before the heading, wrap them as the hook.
	// If there are 3 or more (or no heading), wrap only the leading paragraph.
	if (paragraphMatches.length <= 2) {
		const hookContent = beforeHeading.trim();
		return `${prefix}<div class="article-hook">${hookContent}</div>\n${afterHeading}`;
	} else {
		const firstPara = paragraphMatches[0];
		const hookEnd = (firstPara.index ?? 0) + firstPara[0].length;
		const hookContent = beforeHeading.slice(0, hookEnd).trim();
		const remainingBefore = beforeHeading.slice(hookEnd);
		return `${prefix}<div class="article-hook">${hookContent}</div>\n${remainingBefore}${afterHeading}`;
	}
}

/**
 * Point any reference to the old PRO app host at the live one.
 *
 * The apps moved from apps.giniloh.com to apps.aichieve.net in the 2026 cutover and the old host
 * now answers 503 for every path, so every reference to it is a dead end — a link that goes
 * nowhere, and worse, a host printed as anchor text that tells the reader to go there.
 *
 * Articles authored in the shared CMS still carry it (ParcelProof and CaseProof, plus the bare
 * URL published as link text in the LedgerLink piece), and so do the excerpts those articles
 * feed into the archive and category listings. Both shapes are fixed here, at the same choke
 * point as the ownership rules, so an article written tomorrow needs no CMS edit. The
 * replacement is derived from PUBLIC_APPS_BASE, so it cannot drift from the app links the
 * front end builds itself.
 *
 * An href to the bare origin goes to this property's app directory instead: that origin 307s
 * away to giniloh.com rather than serving the apps, so it is not a destination worth keeping.
 */
function normaliseLegacyAppHost(markup: string): string {
	const live = getAppsBase();
	const hostOnly = live.replace(/^https?:\/\//, '');
	return markup
		.replace(
			/href="https?:\/\/(?:www\.)?apps\.giniloh\.com(\/[^"]*)?"/gi,
			(_match, path: string | undefined) => (path ? `href="${live}${path}"` : 'href="/apps/"')
		)
		.replace(/(?:www\.)?apps\.giniloh\.com/gi, hostOnly);
}

async function fetchWordPress<T>(endpoint: string, query: Record<string, string | number | undefined>) {
	const baseUrl = getWordPressApiBase();
	if (!baseUrl) {
		return [] as T[];
	}

	const url = new URL(`${baseUrl}/wp-json/wp/v2/${endpoint}`);
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== '') {
			url.searchParams.set(key, String(value));
		}
	}

	// Add a cache-buster parameter to prevent CDN/Edge nodes from serving stale JSON
	url.searchParams.set('_t', Date.now().toString());

	try {
		const response = await fetch(url, {
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache'
			},
			cache: 'no-store',
			signal: AbortSignal.timeout(8000)
		});
		if (!response.ok) {
			return [] as T[];
		}

		const data = (await response.json()) as T[];
		return data;
	} catch (error) {
		console.error(`Failed to fetch WordPress data from ${url.toString()}`, error);
		return [] as T[];
	}
}

function normalizeCategory(category: WordPressCategoryResponse): WordPressCategory {
	const rawName = stripHtml(category.name) || 'Untitled category';
	const cleanName = rawName.replace(/:\s*$/, '').trim();

	return {
		id: category.id,
		name: cleanName,
		slug: category.slug?.trim() || `category-${category.id}`,
		description: stripHtml(category.description),
		parent: category.parent && category.parent > 0 ? category.parent : null,
		count: category.count ?? 0
	};
}

export function hasWordPressApiBase() {
	return Boolean(getWordPressApiBase());
}

export function getConfiguredWordPressApiBase() {
	return getWordPressApiBase();
}

/** True when the slug is published but owned by the sibling property (used for the 301 map). */
export function isForeignPostSlug(slug: string) {
	return !belongsToSite({ slug });
}

/** Where a post that moved to the sibling property now lives. */
export function siblingUrlFor(post: { slug?: string | null }) {
	const slug = post?.slug?.trim();
	return slug ? `${SIBLING_SITE.origin}/${slug}/` : SIBLING_SITE.origin;
}

/**
 * Read posts until `limit` posts that belong to THIS site have been collected.
 * Filtering after a single `per_page=limit` fetch would quietly shrink every grid,
 * because the shared install returns both properties' posts.
 */
async function fetchOwnedPosts(
	query: Record<string, string | number | undefined>,
	limit: number
): Promise<WordPressPost[]> {
	const owned: WordPressPost[] = [];
	const perPage = 100;

	// The shared install carries both properties, so raw pages must exceed the owned target by
	// roughly the ownership ratio. The old fixed 4-page ceiling capped every archive at ~200 owned
	// posts and would have started truncating the archive silently — `/articles/` claims to list
	// every article — within a month of daily publishing (198 posts landed in October alone).
	// Scale the ceiling with the request, keep a hard floor for small grids, and a ceiling so a
	// misbehaving CMS cannot page forever.
	const maxPages = Math.min(20, Math.max(4, Math.ceil(limit / perPage) * 4));

	for (let page = 1; page <= maxPages && owned.length < limit; page++) {
		const batch = await fetchWordPress<WordPressPostResponse>('posts', { _embed: 1, per_page: perPage, page, ...query });
		if (!batch.length) {
			break;
		}
		owned.push(...filterOwnedPosts(batch.map(normalizePost)));
		if (batch.length < perPage) {
			break;
		}
	}

	return owned.slice(0, limit);
}

export async function fetchLatestPosts(limit = 6) {
	return fetchOwnedPosts({}, limit);
}

/**
 * slug -> term id for the three kind tags, resolved once per build.
 *
 * WHY THIS EXISTS AT ALL: the REST `tags` query parameter accepts term IDS only. `?tags=news`
 * returns nothing; `?tags=43` returns the news fleet. Term ids are per-install state rather than
 * a contract, so they are looked up from the slugs the CMS actually uses instead of being
 * hardcoded here.
 *
 * A failure to resolve is reported and produces empty lists, never an unfiltered one: showing the
 * whole archive under a "News" heading would be a silent lie about what the reader is seeing.
 */
const KIND_TERM_IDS = new Map<PostKind, number>();
let kindTermRequest: Promise<void> | null = null;

async function loadKindTermIds() {
	if (kindTermRequest) return kindTermRequest;

	kindTermRequest = (async () => {
		const tags = await fetchWordPress<{ id?: number; slug?: string }>('tags', {
			slug: POST_KINDS.join(','),
			per_page: 100,
			_fields: 'id,slug'
		});

		for (const tag of tags) {
			const kind = POST_KINDS.find((candidate) => candidate === tag.slug);
			if (kind && typeof tag.id === 'number') {
				KIND_TERM_IDS.set(kind, tag.id);
			}
		}

		const missing = POST_KINDS.filter((kind) => !KIND_TERM_IDS.has(kind));
		if (missing.length) {
			console.warn(`[wordpress] kind tag(s) missing from the CMS: ${missing.join(', ')}`);
		}
	})();

	return kindTermRequest;
}

/** Every post in one editorial fleet, newest first. */
export async function fetchPostsByKind(kind: PostKind, limit = 24) {
	await loadKindTermIds();
	const termId = KIND_TERM_IDS.get(kind);

	if (!termId) {
		console.warn(`[wordpress] cannot list "${kind}" — no term id resolved, returning nothing.`);
		return [];
	}

	return fetchOwnedPosts({ tags: termId }, limit);
}

/**
 * True for the durable library: a post tagged `evergreen`, plus any post that carries no kind tag
 * at all.
 *
 * Unfiled posts land here deliberately. If they were dropped they would appear in no list and
 * disappear from navigation without an error, which is the exact failure `vertical-taxonomy.php`
 * guards against for ownership. `scripts/routing.mjs` names every one of them on every build, so
 * the gap is visible until someone tags it.
 */
export function isDurablePost(post: WordPressPost) {
	return post.kinds.includes('evergreen') || post.kinds.length === 0;
}

/** Newest first, by publish date. */
export function byNewest(a: WordPressPost, b: WordPressPost) {
	const ta = a.date ? new Date(a.date).getTime() : 0;
	const tb = b.date ? new Date(b.date).getTime() : 0;
	return tb - ta;
}

export async function fetchPostsByCategory(categoryId: number | number[] | string, limit = 12) {
	const categoryParam = Array.isArray(categoryId) ? categoryId.join(',') : String(categoryId);
	return fetchOwnedPosts({ categories: categoryParam }, limit);
}

export async function searchPosts(query: string, limit = 8) {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return [];
	}
	return fetchOwnedPosts({ search: trimmedQuery }, limit);
}

export async function fetchPostBySlug(slug: string) {
	const posts = await fetchWordPress<WordPressPostResponse>('posts', {
		_embed: 1,
		slug
	});

	if (posts.length === 0) {
		return null;
	}

	const post = normalizePost(posts[0]);

	// A slug that exists on the shared install but belongs to the sibling property is not ours
	// to render. Callers use `siblingUrlFor` to 301 instead.
	return belongsToSite(post) ? post : null;
}

/** Every post this site owns. Pages through the shared install rather than capping at 100. */
export async function fetchAllPosts(limit = 1000) {
	return fetchOwnedPosts({}, limit);
}

export async function fetchAllCategories(limit = 100) {
	const categories = await fetchWordPress<WordPressCategoryResponse>('categories', {
		per_page: limit,
		hide_empty: 0
	});

	return categories.map(normalizeCategory);
}
