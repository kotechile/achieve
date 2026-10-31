#!/usr/bin/env node
/**
 * Routing: two modes, two files.
 *
 * THE PROBLEM THIS SOLVES
 * Content ownership used to be a committed slug list. That meant a CMS publish triggered a redeploy
 * which re-fetched the post and then FILTERED IT OUT, because the committed list did not mention it.
 * Nothing new went live until someone ran a sync and pushed — which happened (see the "route the
 * six 2026-10-15 articles" commits, and the hand-edited inline lists).
 *
 * THE SPLIT
 * Ownership has two inputs with very different rates of change:
 *
 *   WHICH VERTICALS ARE MINE   (7 for giniloh, 19 for aichieve)  -- changes when you add a vertical
 *   WHICH POSTS ARE IN THEM    (derived from the CMS)            -- changes every publish
 *
 * So only the first is committed. The second is re-derived from live WordPress on every build.
 * A publish -> webhook -> redeploy now picks the article up with no manual step.
 *
 *   node scripts/routing.mjs --sync    # ask Supabase which verticals are ours -> src/data/verticals.mjs
 *                                      # (run when a vertical is added or moved)
 *
 *   node scripts/routing.mjs           # read verticals.mjs + live WordPress -> src/data/ownership.generated.mjs
 *                                      # (runs automatically as part of `npm run build`)
 *
 *   node scripts/routing.mjs --check   # assert the derived answer against the hand-written manifest;
 *                                      # exit 1 if a currently-published post would silently LEAVE
 *                                      # this site
 *
 * WHY SUPABASE IS ONLY IN --sync
 * Builds must not depend on Supabase being reachable. Reading the tiny committed vertical list keeps
 * the build's only network dependency the WordPress CMS it already cannot work without.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SITE_DOMAIN = process.env.SITE_DOMAIN || 'aichieve.net';
const WP_BASE = (process.env.PUBLIC_WORDPRESS_API_BASE || 'https://cms.giniloh.com').replace(/\/$/, '');

const VERTICALS_FILE = path.join(ROOT, 'src/data/verticals.mjs');
const OUT = path.join(ROOT, 'src/data/ownership.generated.mjs');

/**
 * Posts where the derived answer and the manifest disagree ON PURPOSE, pending a human decision.
 * Reported, but does not fail --check. Empty is the goal.
 */
const KNOWN_EXCEPTIONS = new Set(['one-approval-two-payments']);

// ---- helpers ------------------------------------------------------------------------------------
function loadEnv() {
	const out = {};
	const candidates = [path.join(ROOT, '.env'), path.join(ROOT, '..', '.env')];
	const p = candidates.find((c) => fs.existsSync(c));
	if (!p) return out;
	for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
		if (!line.includes('=') || line.trim().startsWith('#')) continue;
		const i = line.indexOf('=');
		out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
	}
	return out;
}

async function getJson(url, headers = {}, { allowInvalidPage = false } = {}) {
	const res = await fetch(url, { headers: { 'User-Agent': 'routing', ...headers } });
	if (!res.ok) {
		// WordPress answers `400 rest_post_invalid_page_number` once the requested page is past the
		// last one. That is the end of the list, not a build failure: at exactly per_page x N posts
		// the loop asks for page N+1 and this throw turned every deploy into a red build (2026-10-28,
		// the 200th post on cms.giniloh.com).
		if (allowInvalidPage && res.status === 400) return [];
		throw new Error(`GET ${url} -> HTTP ${res.status}`);
	}
	return res.json();
}

/** Every published post, with its vertical term ids. */
async function fetchPosts() {
	const posts = [];
	for (let page = 1; page <= 20; page++) {
		const batch = await getJson(
			`${WP_BASE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=slug,vertical`,
			{},
			{ allowInvalidPage: true }
		);
		posts.push(...batch);
		if (batch.length < 100) break;
	}
	return posts;
}

/** term id -> slug */
async function fetchTermMap() {
	const terms = await getJson(`${WP_BASE}/wp-json/wp/v2/vertical?per_page=100`);
	return new Map(terms.map((t) => [t.id, t.slug]));
}

/** The committed per-site vertical list, written by --sync. */
async function loadVerticals() {
	if (!fs.existsSync(VERTICALS_FILE)) {
		throw new Error(
			`${path.relative(ROOT, VERTICALS_FILE)} is missing. Run: node scripts/routing.mjs --sync`
		);
	}
	const mod = await import(VERTICALS_FILE);
	return {
		slugs: new Set(mod.OWNED_VERTICAL_SLUGS ?? []),
		origins: new Map(Object.entries(mod.ORIGIN_BY_VERTICAL ?? {}))
	};
}

// =================================================================================================
// MODE: --sync  (ask Supabase which verticals belong to this site)
// =================================================================================================
if (process.argv.includes('--sync')) {
	const env = loadEnv();
	const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
	const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!SB_URL || !SB_KEY) {
		console.error('routing --sync: need NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
		process.exit(1);
	}

	const rows = await getJson(`${SB_URL}/rest/v1/vertical_sites?select=vertical_id,site_domain,frontend_url`, {
		apikey: SB_KEY,
		Authorization: `Bearer ${SB_KEY}`
	});

	const mine = rows.filter((r) => r.site_domain === SITE_DOMAIN);
	if (!mine.length) {
		console.error(`routing --sync: no vertical_sites rows for site_domain="${SITE_DOMAIN}" — refusing to write an empty site.`);
		process.exit(1);
	}

	// ALL verticals, not just ours. Resolving a FOREIGN post's 301 destination needs the other
	// properties' origins too — restricting this to `mine` silently produced zero redirect targets.
	const originByVertical = Object.fromEntries(
		rows.map((r) => [r.vertical_id, (r.frontend_url || '').replace(/\/$/, '')]).filter(([, o]) => o)
	);

	fs.writeFileSync(
		VERTICALS_FILE,
		`/**
 * GENERATED by: node scripts/routing.mjs --sync
 *
 * Which verticals belong to ${SITE_DOMAIN}, and where each one's posts live.
 * This is the STABLE half of routing — it changes when a vertical is added or moved, not when a
 * post is published. The post list is derived at build time from live WordPress.
 */
export const SITE_DOMAIN = ${JSON.stringify(SITE_DOMAIN)};

export const OWNED_VERTICAL_SLUGS = ${JSON.stringify([...mine.map((r) => r.vertical_id)].sort(), null, '\t')};

export const ORIGIN_BY_VERTICAL = ${JSON.stringify(originByVertical, null, '\t')};
`
	);
	console.log(`routing --sync: wrote ${path.relative(ROOT, VERTICALS_FILE)} (${mine.length} verticals for ${SITE_DOMAIN})`);
	process.exit(0);
}

// =================================================================================================
// MODE: --check  (assert against the hand-written manifest; the migration gate)
// =================================================================================================
// =================================================================================================
// MODE: default  (derive the post list from live WordPress; runs as part of the build)
// =================================================================================================
const { slugs: MY_VERTICALS, origins: ORIGIN_BY_VERTICAL } = await loadVerticals();
const [posts, idToSlug] = await Promise.all([fetchPosts(), fetchTermMap()]);

const derived = [];
const untagged = [];
const crossSite = [];
const multiVertical = [];
const verticalsOf = new Map();

for (const p of posts) {
	const mine = (p.vertical || []).map((i) => idToSlug.get(i)).filter(Boolean);
	verticalsOf.set(p.slug, mine);
	if (!mine.length) { untagged.push(p.slug); continue; }

	// OWNERSHIP IS PER SITE, NOT PER TERM.
	// A post tagged with two verticals that both live on this site belongs here. The old rule
	// ("more than one vertical -> ambiguous -> drop it") sent such a post to NO site at all, and
	// because it then fell through to `foreign` it was 301'd from the sibling to a 404. That is
	// how `the-agentic-rag-trap` (agentic_ai + multi_agent_enterprise_fabric, both aichieve.net)
	// published into a hole. Only a tag spanning two DIFFERENT sites is a real conflict.
	const sites = new Set(mine.map((v) => ORIGIN_BY_VERTICAL.get(v)).filter(Boolean));
	if (sites.size > 1) { crossSite.push(`${p.slug} (${[...sites].sort().join(' + ')})`); continue; }
	if (!mine.some((v) => MY_VERTICALS.has(v))) continue;
	derived.push(p.slug);
	if (mine.length > 1) multiVertical.push(p.slug);
}
derived.sort();

const derivedSet = new Set(derived);
const foreign = posts.map((p) => p.slug).filter((s) => !derivedSet.has(s)).sort();

// slug -> origin, so a 301 always points at the property that actually owns the post rather than
// at a hardcoded sibling.
const foreignTargets = {};
for (const s of foreign) {
	const v = verticalsOf.get(s) ?? [];
	const origin = v.map((x) => ORIGIN_BY_VERTICAL.get(x)).find(Boolean) || '';
	if (origin) foreignTargets[s] = origin;
}

console.log(
	`routing: ${SITE_DOMAIN} — posts=${posts.length} verticals=${MY_VERTICALS.size} owned=${derived.length} foreign=${foreign.length} untagged=${untagged.length} cross-site=${crossSite.length}`
);
if (untagged.length) console.warn(`  WARNING untagged (publishes to NO site): ${untagged.join(', ')}`);
if (crossSite.length) console.warn(`  WARNING tagged to more than one SITE (publishes to NO site until fixed): ${crossSite.join(', ')}`);
if (multiVertical.length) console.log(`  note: several verticals, all owned here (published): ${multiVertical.join(', ')}`);

// ---- --check: compare against the hand-written manifest ----------------------------------------
if (process.argv.includes('--check')) {
	const manifestPath = path.join(ROOT, 'src/data/ownership.mjs');
	const mod = fs.existsSync(manifestPath) ? await import(manifestPath) : {};
	// Pick the list that matches THIS property. A blind `GINILOH_POST_SLUGS ?? AICHIEVE_POST_SLUGS`
	// compares against the wrong baseline in the aichieve repo, where the first name is its FOREIGN list.
	const key = SITE_DOMAIN.includes('aichieve') ? 'AICHIEVE_POST_SLUGS' : 'GINILOH_POST_SLUGS';
	const manifest = mod[key] ?? [];
	const cmsSlugs = new Set(posts.map((p) => p.slug));
	const manifestSet = new Set(manifest);

	// Not symmetric:
	//   manifest - derived  -> a post this site publishes that verticals now send ELSEWHERE.
	//                          Dangerous: it disappears. Fails unless known.
	//   derived - manifest  -> content the hand-written list never knew about. That is the system
	//                          working — the silent gap this exists to close.
	const movedAway = manifest.filter((s) => cmsSlugs.has(s) && !derivedSet.has(s));
	const stale = manifest.filter((s) => !cmsSlugs.has(s));
	const newlyRouted = derived.filter((s) => !manifestSet.has(s));
	const unexpected = movedAway.filter((s) => !KNOWN_EXCEPTIONS.has(s));

	console.log(`\nvs manifest (${manifest.length}):`);
	console.log(`  newly routed here (new content, expected): ${newlyRouted.length}${newlyRouted.length ? ' -> ' + newlyRouted.join(', ') : ''}`);
	console.log(`  would move away from this site           : ${movedAway.length}`);
	for (const s of movedAway) console.log(`      ${KNOWN_EXCEPTIONS.has(s) ? '[known]   ' : '[UNEXPECTED]'} ${s}`);
	console.log(`  stale manifest entries (post gone from CMS): ${stale.length}${stale.length ? ' -> ' + stale.join(', ') : ''}`);

	if (unexpected.length) {
		console.error(`\nFAILED: ${unexpected.length} post(s) would silently LEAVE this site.`);
		process.exit(1);
	}
	console.log('\n--check OK');
	process.exit(0);
}

// ---- write the build input ---------------------------------------------------------------------
// Written only when the derivation actually changed.
//
// The file is committed, because `astro check` imports it and a fresh clone has not run a build yet. A
// timestamp inside it made every build dirty the tree with a one-line diff, which is noise a reviewer
// has to dismiss once per commit. So the timestamp is preserved when the content (everything else) is
// identical: a changed post set still updates it, an unchanged one leaves the file alone.
const buildOwnershipFile = (iso) =>
	`/**
 * GENERATED by: node scripts/routing.mjs   (runs as part of \`npm run build\`)
 *
 * The post list for ${SITE_DOMAIN}, derived from live WordPress at build time.
 * NOT committed as truth — regenerating on every build is the point: a publish triggers a redeploy,
 * the redeploy re-derives, and the new article appears without anyone running a sync by hand.
 *
 * Derived from: src/data/verticals.mjs (which verticals are ours) x WordPress post.vertical
 */
export const OWNED_POST_SLUGS_GENERATED = ${JSON.stringify(derived, null, '\t')};
export const FOREIGN_POST_SLUGS_GENERATED = ${JSON.stringify(foreign, null, '\t')};
export const FOREIGN_TARGETS = ${JSON.stringify(foreignTargets, null, '\t')};
export const GENERATED_FOR = ${JSON.stringify(SITE_DOMAIN)};
export const GENERATED_AT = ${JSON.stringify(iso)};
`;

const nextFile = buildOwnershipFile(new Date().toISOString());
const TIMESTAMP_LINE = /^export const GENERATED_AT = ".*";$/m;
const previous = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
const unchanged =
	previous !== null && previous.replace(TIMESTAMP_LINE, '') === nextFile.replace(TIMESTAMP_LINE, '');

if (unchanged) {
	console.log(`unchanged ${path.relative(ROOT, OUT)} (kept GENERATED_AT)`);
} else {
	fs.writeFileSync(OUT, nextFile);
	console.log(`wrote ${path.relative(ROOT, OUT)}`);
}
