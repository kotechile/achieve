#!/usr/bin/env node
/**
 * Deploy-contract verification for aichieve.net.
 *
 * WHY THIS EXISTS
 * `npm run check` and `npm run build` prove the site COMPILES. They say nothing about whether it
 * is deployed correctly, and that is where every failure in the 2026 launch actually happened:
 * a 502 from a port mismatch, edge redirects leaking the internal port, and a content boundary
 * that could quietly leak giniloh.com's posts. Each of those was checked by hand, repeatedly,
 * with throwaway curl loops that died with the session.
 *
 * This encodes the contract so "green" is a real, repeatable state:
 *
 *     node scripts/verify.mjs                      # against http://localhost:8899
 *     node scripts/verify.mjs https://aichieve.net # against production
 *     npm run verify -- https://aichieve.net
 *
 * Exit code 0 = the deploy honours its contract. Non-zero = it does not, and every violation is
 * listed with the expected and actual value.
 *
 * No dependencies, deliberately: this has to run anywhere the image runs, including inside a
 * container that has nothing but nginx and curl.
 */
import { OWNED_POST_SLUGS_GENERATED, FOREIGN_POST_SLUGS_GENERATED, GENERATED_FOR } from '../src/data/ownership.generated.mjs';

const ORIGIN = (process.argv[2] || process.env.VERIFY_ORIGIN || 'http://localhost:8899').replace(/\/$/, '');
const TIMEOUT_MS = 20000;

/**
 * The ownership manifest, imported rather than scraped.
 *
 * This used to regex a hardcoded array out of `site-content.ts`. When the lists moved into the
 * generated manifest, the regex stopped matching and this script threw before its first check —
 * invisibly, because nothing runs it in CI. That is how `/robots.txt` and `/sitemap.xml` could
 * 404 for a release while the repo carried a "deploy verification" script: the gate was dead on
 * arrival and still printed nothing that looked like a failure. An import cannot drift — a rename
 * fails at startup, loudly.
 */
const OWNED = OWNED_POST_SLUGS_GENERATED;
const FOREIGN = FOREIGN_POST_SLUGS_GENERATED;

let passed = 0;
const failures = [];

function ok(label, detail = '') {
	passed++;
	console.log(`  \u001b[32mPASS\u001b[0m  ${label}${detail ? `  ${detail}` : ''}`);
}

function fail(label, expected, actual) {
	failures.push({ label, expected, actual });
	console.log(`  \u001b[31mFAIL\u001b[0m  ${label}`);
	console.log(`        expected: ${expected}`);
	console.log(`        actual:   ${actual}`);
}

/** Fetch and report the final status, redirect target and headers. */
async function probe(path, { follow = false } = {}) {
	const url = `${ORIGIN}${path}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, { redirect: follow ? 'follow' : 'manual', signal: controller.signal });
		return {
			status: res.status,
			location: res.headers.get('location'),
			contentType: res.headers.get('content-type') || '',
			body: follow || res.status === 200 ? await res.text() : ''
		};
	} catch (error) {
		return { status: 0, location: null, contentType: '', body: '', error: String(error) };
	} finally {
		clearTimeout(timer);
	}
}

// ── Checks ────────────────────────────────────────────────────────────────────────────────
async function checkCoreRoutes() {
	console.log('\nCore routes');
	const routes = [
		'/',
		'/apps/',
		'/tools/',
		'/tools/gpu-compute/',
		'/tools/master-asset-tco/',
		'/articles/',
		'/categories/',
		'/about/',
		'/author/gini-loh/'
	];
	for (const route of routes) {
		const r = await probe(route);
		if (r.status === 200) ok(route, `200`);
		else fail(route, '200', r.error ? `no response (${r.error})` : `${r.status}`);
	}
}

async function checkAssets() {
	console.log('\nAssets');
	for (const asset of ['/favicon.svg', '/default-share-image.png', '/sitemap-index.xml']) {
		const r = await probe(asset);
		if (r.status === 200) ok(asset, '200');
		else fail(asset, '200', `${r.status}`);
	}
}

/**
 * Crawl hints.
 *
 * `/robots.txt` and `/sitemap.xml` are not pages — nothing in the UI links to them, so a missing
 * one is invisible in every manual pass. Both 404'd in production while the sitemap itself was
 * healthy at `/sitemap-index.xml`, which is exactly the kind of gap this script exists to catch:
 * "renders fine" and "is crawlable" are different contracts.
 */
async function checkCrawlHints() {
	console.log('\nCrawl hints');

	const robots = await probe('/robots.txt');
	if (robots.status !== 200) {
		fail('/robots.txt', '200', `${robots.status}`);
	} else {
		ok('/robots.txt', '200');
		const declared = [...robots.body.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map((m) => m[1]);
		if (declared.length === 0) {
			fail('/robots.txt Sitemap line', 'at least one "Sitemap: <url>"', 'none found');
		}
		for (const url of declared) {
			// Resolve against the host under test, not the host the line declares: a local run
			// must still prove the path works.
			const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
			const r = await probe(path);
			if (r.status === 200) ok(`robots.txt declares ${path}`, '200');
			else fail(`robots.txt declares ${path}`, '200', `${r.status}`);
		}
	}

	// The conventional path. Search Console, Bing and every crawler checker probe /sitemap.xml
	// first; a 404 there reads as "this site has no sitemap" no matter what the index holds.
	const sitemapFile = await probe('/sitemap.xml');
	if (sitemapFile.status !== 200) {
		fail('/sitemap.xml', '200', `${sitemapFile.status}`);
		return;
	}
	const locs = [...sitemapFile.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	if (locs.length === 0) {
		fail('/sitemap.xml contents', 'a sitemapindex or urlset with <loc> entries', 'zero <loc>');
		return;
	}
	ok('/sitemap.xml', `${locs.length} entry/entries`);

	// An index that points at a dead chunk is worse than no index: crawlers cache the failure.
	const looksLikeIndex = /<sitemapindex/.test(sitemapFile.body);
	if (looksLikeIndex) {
		let total = 0;
		for (const loc of locs) {
			const path = loc.replace(/^https?:\/\/[^/]+/, '') || '/';
			const r = await probe(path);
			if (r.status !== 200) {
				fail(`sitemap chunk ${path}`, '200', `${r.status}`);
				continue;
			}
			total += (r.body.match(/<url>/g) || []).length;
			ok(`sitemap chunk ${path}`, '200');
		}
		if (total === 0) fail('sitemap chunk URLs', 'at least one <url>', 'zero across all chunks');
		else ok('sitemap URL total', `${total} urls`);
	}
}

/**
 * Every redirect must point at the canonical public origin. The 2026 launch served
 * `Location: http://aichieve.net:3000/tools/...` — internal port, downgraded to http — because
 * nginx built an absolute URL from its own listen port while Traefik terminated TLS.
 * That is the specific regression this check exists to catch.
 */
async function checkRedirects() {
	console.log('\nMoved paths redirect to the canonical origin');
	const redirects = [
		['/calculators/gpu-compute/', '/tools/gpu-compute/'],
		['/calculators/decision-intelligence/', '/tools/master-asset-tco/'],
		['/calculators/', '/tools/'],
		['/showcase', '/apps/'],
		['/pro-apps', '/apps/']
	];
	for (const [from, expectedTarget] of redirects) {
		const r = await probe(from);
		if (r.status !== 301) {
			fail(from, `301 -> ${expectedTarget}`, `${r.status}${r.error ? ` (${r.error})` : ''}`);
			continue;
		}
		const loc = r.location || '';
		// A relative Location is correct: the browser resolves it against the public https URL.
		// An absolute one is only acceptable if it is the canonical https origin with no port.
		const isRelative = loc.startsWith('/');
		const isCanonicalAbsolute = /^https:\/\/[^:/]+\//.test(loc) && !/:\d+/.test(loc.replace(/^https:\/\/[^/]+/, ''));
		if (!isRelative && !isCanonicalAbsolute) {
			fail(`${from} Location`, `relative "/path/" or absolute canonical https`, loc);
			continue;
		}
		const target = loc.replace(/^https?:\/\/[^/]+/, '');
		if (target !== expectedTarget) {
			fail(`${from} Location`, expectedTarget, target);
			continue;
		}
		ok(`${from} -> ${target}`, isRelative ? '(relative)' : '(absolute)');
	}

	// Redirects must actually resolve, not just look right.
	const followed = await probe('/calculators/gpu-compute/', { follow: true });
	if (followed.status === 200) ok('/calculators/gpu-compute/ resolves after redirect', '200');
	else fail('/calculators/gpu-compute/ after following redirect', '200', `${followed.status}`);
}

/**
 * The content boundary. Both properties read the same WordPress install, so the only thing
 * stopping giniloh.com's posts from being published here is `site-content.ts`. If a foreign
 * post ever returns 200 on this domain, the split has failed at the SEO level: two hosts, one
 * article, two canonical URLs.
 */
async function checkBoundary() {
	console.log(`\nContent boundary (${FOREIGN.length} foreign posts must not resolve)`);
	// The manifest is generated per property. If routing ever emitted the other site's list, every
	// assertion below would be testing the wrong boundary and still pass.
	if (GENERATED_FOR !== 'aichieve.net') fail('ownership manifest target', 'aichieve.net', GENERATED_FOR);
	else ok('ownership manifest target', GENERATED_FOR);
	// Sampling: a full sweep is thousands of requests. First, last and a couple of interior
	// entries catch a wholesale leak, which is the realistic failure.
	const sample = [FOREIGN[0], FOREIGN[1], FOREIGN[Math.floor(FOREIGN.length / 2)], FOREIGN[FOREIGN.length - 1]].filter(Boolean);
	for (const slug of sample) {
		const r = await probe(`/${slug}/`);
		if (r.status === 404) ok(`/${slug.slice(0, 46)}… 404`);
		else fail(`foreign post /${slug}/`, '404', `${r.status}`);
	}

	// And the reverse: this property's own posts must resolve.
	const owned = [OWNED[0], OWNED[Math.floor(OWNED.length / 2)], OWNED[OWNED.length - 1]].filter(Boolean);
	console.log(`Owned posts resolve (${OWNED.length} owned)`);
	for (const slug of owned) {
		const r = await probe(`/${slug}/`);
		if (r.status === 200) ok(`/${slug.slice(0, 46)}… 200`);
		else fail(`owned post /${slug}/`, '200', `${r.status}`);
	}
}

/**
 * The canonical host baked into every page must be this property's origin.
 *
 * The failure this exists to catch is a page on aichieve.net declaring a giniloh.com canonical:
 * two hosts, one article, and the search engine credits the wrong property. A local or staging
 * origin serving the production canonical is *correct* — the value is baked at build time — so it
 * is accepted; only a genuinely foreign host is a failure. The old check treated every localhost
 * run as RED, which taught the reader to ignore the output, and that is how a 404 sitemap shipped
 * with a green-looking repo.
 */
async function checkCanonicalHost() {
	console.log('\nCanonical host');
	const r = await probe('/');
	const match = r.body.match(/rel="canonical" href="([^"]+)"/);
	if (!match) {
		fail('canonical tag present on /', 'a rel="canonical" link', 'not found');
		return;
	}
	const canonical = match[1];
	let expectedHost;
	try {
		expectedHost = new URL(ORIGIN).host;
	} catch {
		expectedHost = ORIGIN.replace(/^https?:\/\//, '');
	}
	try {
		const got = new URL(canonical);
		const canonicalHost = got.host;
		const isThisProperty = canonicalHost === expectedHost || canonicalHost === 'aichieve.net' || canonicalHost === 'www.aichieve.net';
		if (isThisProperty) ok(`canonical = ${canonical}`);
		else fail('canonical host', 'aichieve.net, www.aichieve.net, or this origin', canonical);
	} catch {
		fail('canonical is a valid URL', 'https://…', canonical);
	}
}

async function main() {
	console.log(`\nVerifying deploy contract at ${ORIGIN}`);
	try {
		await checkCoreRoutes();
		await checkAssets();
		await checkCrawlHints();
		await checkRedirects();
		await checkBoundary();
		await checkCanonicalHost();
	} catch (error) {
		console.error(`\n\u001b[31mVerification aborted:\u001b[0m ${error.message}`);
		process.exit(2);
	}

	console.log(`\n${'-'.repeat(62)}`);
	if (failures.length === 0) {
		console.log(`\u001b[32mGREEN\u001b[0m — ${passed} checks passed against ${ORIGIN}`);
		process.exit(0);
	}
	console.log(`\u001b[31mRED\u001b[0m — ${passed} passed, ${failures.length} FAILED against ${ORIGIN}`);
	for (const f of failures) console.log(`  · ${f.label}: expected ${f.expected}, got ${f.actual}`);
	process.exit(1);
}

main();
