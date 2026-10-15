import { filterOwnedPosts, belongsToSite, SIBLING_SITE } from './site-content';

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
	const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
	
	let featuredImage = featuredMedia?.source_url ?? null;
	const apiBase = getWordPressApiBase();

	// Ensure featured image URL is absolute if it starts with /
	if (featuredImage && featuredImage.startsWith('/') && apiBase) {
		featuredImage = `${apiBase}${featuredImage}`;
	}

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

	// Rewrite internal WordPress links to frontend relative links (preserving uploads / assets)
	if (apiBase) {
		const escapedApiBase = apiBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// Category links: https://cms.giniloh.com/category/xyz/ -> /categories/xyz/
		htmlContent = htmlContent.replace(
			new RegExp(`href=["']${escapedApiBase}/category/([^"'/]+)/?["']`, 'gi'),
			'href="/categories/$1/"'
		);
		// Post links: https://cms.giniloh.com/post-slug/ -> /post-slug/ (excluding wp-content, wp-includes, wp-admin, wp-json)
		htmlContent = htmlContent.replace(
			new RegExp(`href=["']${escapedApiBase}/(?!wp-content|wp-includes|wp-admin|wp-json)([^"']+)["']`, 'gi'),
			(_match, path) => {
				const cleanPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
				return `href="/${cleanPath}/"`;
			}
		);
	}

	return {
		id: post.id,
		title: stripHtml(post.title?.rendered) || 'Untitled post',
		excerpt: stripHtml(post.excerpt?.rendered),
		content: htmlContent,
		slug: post.slug || '',
		link: post.slug ? `/${post.slug}/` : (post.link ?? '#'),
		date: post.date ?? null,
		modified: post.modified ?? post.date ?? null,
		featuredImage,
		featuredImageAlt: featuredMedia?.alt_text || '',
		categoryLabel: category?.name ? stripHtml(category.name).replace(/:\s*$/, '').trim() : null,
		categorySlug: category?.slug ?? null
	};
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
