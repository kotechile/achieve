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
	/** WordPress' own derivatives, smallest first. Empty when the payload carries no sizes. */
	featuredImageSizes: { url: string; width: number; height: number }[];
	/** Intrinsic dimensions of the original, for width/height attributes. Null when unknown. */
	featuredImageWidth: number | null;
	featuredImageHeight: number | null;
	featuredImageAlt: string;
	categoryLabel: string | null;
	categorySlug: string | null;
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
	const category = terms.find((term) => term?.slug && term?.name);
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

	// Responsive sources from WordPress' own derivatives, already present in the payload. Before
	// this, every card and hero on the site fetched the full-size original (typically 1344-1376px
	// wide) to fill slots a fraction of that. Astro's remote-image optimisation was not an option:
	// it needs network access per image per build, and this build must survive a restricted
	// environment. When the payload carries no sizes the srcset is simply absent.
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
	// there was one site. After the 2026 split it silently produced broken links: an aichieve
	// article linking to a giniloh article became `/that-slug/`, which does not exist here.
	// Measured at split time: 30 live 404s on aichieve.net, 5 on giniloh.com, across 18 articles.
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
		featuredImageSizes,
		featuredImageWidth,
		featuredImageHeight,
		featuredImageAlt: featuredMedia?.alt_text || '',
		categoryLabel: category?.name ? stripHtml(category.name).replace(/:\s*$/, '').trim() : null,
		categorySlug: category?.slug ?? null
	};
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

async function fetchWordPress(endpoint: string, query: Record<string, string | number | undefined>) {
	const baseUrl = getWordPressApiBase();
	if (!baseUrl) {
		return [];
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
			return [];
		}

		const data = (await response.json()) as WordPressPostResponse[];
		return data;
	} catch (error) {
		console.error(`Failed to fetch WordPress data from ${url.toString()}`, error);
		return [];
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
	const maxPages = 4;

	for (let page = 1; page <= maxPages && owned.length < limit; page++) {
		const batch = await fetchWordPress('posts', { _embed: 1, per_page: perPage, page, ...query });
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
	const posts = await fetchWordPress('posts', {
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
	const categories = (await fetchWordPress('categories', {
		per_page: limit,
		hide_empty: 0
	})) as WordPressCategoryResponse[];

	return categories.map(normalizeCategory);
}
