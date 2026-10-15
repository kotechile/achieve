/**
 * WordPress category structure for aichieve.net.
 *
 * Reads the live taxonomy and keeps only the domains this property owns (see
 * `site-content.ts`). The shared install also carries giniloh.com's consumer categories, so
 * the allow-list is what stops a personal-finance category appearing in the enterprise
 * navigation.
 *
 * Unlike giniloh's original version there is no CSV fallback: the CSV was a pre-REST stopgap,
 * and silently serving a stale file when the API is down is worse than serving a clearly
 * labelled empty state.
 */
import { fetchAllCategories } from './wordpress';
import { OWNED_CATEGORY_SLUGS } from './site-content';

export interface CategoryRecord {
	id: string;
	name: string;
	slug: string;
	description: string;
	level: number;
	parentCategoryId: string | null;
	wordpressCategoryId: number | null;
	postCount: number;
	children: CategoryRecord[];
}

const OWNED = new Set<string>(OWNED_CATEGORY_SLUGS);

export const CATEGORIES_UNAVAILABLE: CategoryRecord[] = [
	{
		id: 'categories-unavailable',
		name: 'Categories unavailable',
		slug: 'categories-unavailable',
		description:
			'The WordPress REST API did not answer. Set PUBLIC_WORDPRESS_API_BASE and confirm the CMS is reachable to load live taxonomy.',
		level: 1,
		parentCategoryId: null,
		wordpressCategoryId: null,
		postCount: 0,
		children: []
	}
];

let cache: Promise<CategoryRecord[]> | undefined;

async function loadCategories(): Promise<CategoryRecord[]> {
	const live = await fetchAllCategories(100);

	if (!live.length) {
		return CATEGORIES_UNAVAILABLE;
	}

	const kept = live.filter((category) => OWNED.has(category.slug));
	const byId = new Map<string, CategoryRecord>();

	for (const category of kept) {
		byId.set(String(category.id), {
			id: String(category.id),
			name: category.name,
			slug: category.slug,
			description: category.description,
			level: category.parent ? 2 : 1,
			parentCategoryId: category.parent ? String(category.parent) : null,
			wordpressCategoryId: category.id,
			postCount: category.count,
			children: []
		});
	}

	for (const record of byId.values()) {
		if (record.parentCategoryId && byId.has(record.parentCategoryId)) {
			byId.get(record.parentCategoryId)!.children.push(record);
		}
	}

	// A parent's own count excludes posts filed to its children, which understates the domain.
	// Roll the children up so the board reports the real volume.
	for (const record of byId.values()) {
		if (record.children.length) {
			record.postCount += record.children.reduce((sum, child) => sum + child.postCount, 0);
		}
	}

	return Array.from(byId.values());
}

export async function getAllCategories() {
	cache ??= loadCategories();
	return cache;
}

export async function getTopLevelCategories() {
	const categories = await getAllCategories();
	return categories
		.filter((category) => !category.parentCategoryId)
		.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getCategoryBySlug(slug: string) {
	const categories = await getAllCategories();
	return categories.find((category) => category.slug === slug) ?? null;
}

/**
 * Every category id a domain page must read, including its children. Shared posts filed to a
 * child still belong on the parent domain page.
 */
export function categoryIdsFor(category: CategoryRecord): number[] {
	return [category.wordpressCategoryId, ...category.children.map((c) => c.wordpressCategoryId)].filter(
		(id): id is number => typeof id === 'number'
	);
}
