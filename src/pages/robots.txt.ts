import type { APIRoute } from 'astro';

/**
 * `/robots.txt`
 *
 * Nothing on this property is private: every route is either a published page or a redirect. So
 * the only job here is to tell crawlers where the sitemap lives. The sitemap integration writes
 * the XML but never the pointer, and without a robots.txt a crawler has to guess the path — which
 * is why a site can ship a valid sitemap and still be treated as having none.
 *
 * The origin comes from `site` in astro.config.mjs, so it cannot disagree with the canonical tags.
 */
export const GET: APIRoute = ({ site }) => {
	if (!site) {
		// No silent fallback to a hardcoded host: a robots.txt pointing at the wrong origin is
		// worse than no robots.txt, because it looks correct in every manual check.
		throw new Error('robots.txt needs `site` set in astro.config.mjs');
	}

	const body = [
		'User-agent: *',
		'Allow: /',
		'',
		`Sitemap: ${site.origin}/sitemap.xml`,
		''
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
};
