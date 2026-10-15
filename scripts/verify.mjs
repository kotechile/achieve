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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ORIGIN = (process.argv[2] || process.env.VERIFY_ORIGIN || 'http://localhost:8899').replace(/\/$/, '');
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const TIMEOUT_MS = 20000;

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

/**
 * Reads the ownership manifest so the boundary check cannot drift out of sync with the code.
 * A stale hardcoded list here would be worse than no check at all.
 */
function readSlugSet(constantName) {
	const file = join(ROOT, 'src', 'lib', 'site-content.ts');
	let src;
	try {
		src = readFileSync(file, 'utf8');
	} catch {
		throw new Error(`cannot read ${file} — run this from the project root`);
	}
	const block = src.match(new RegExp(`${constantName}\\s*=\\s*new Set<string>\\(\\[([\\s\\S]*?)\\]\\)`));
	if (!block) throw new Error(`could not parse ${constantName} out of site-content.ts`);
	return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const OWNED = readSlugSet('OWNED_POST_SLUGS');
const FOREIGN = readSlugSet('FOREIGN_POST_SLUGS');

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

/** The canonical host baked into every page must be this property's origin. */
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
		// In a local container the built canonical is the production host — that is correct and
		// expected, so only flag a genuine mismatch (a different site entirely).
		const acceptable = canonicalHost === expectedHost || (!expectedHost.includes('localhost') && canonicalHost.endsWith('aichieve.net'));
		if (acceptable) ok(`canonical = ${canonical}`);
		else fail('canonical host', 'this property\u2019s origin', canonical);
	} catch {
		fail('canonical is a valid URL', 'https://…', canonical);
	}
}

async function main() {
	console.log(`\nVerifying deploy contract at ${ORIGIN}`);
	try {
		await checkCoreRoutes();
		await checkAssets();
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
