#!/usr/bin/env node
/**
 * Derive this property's post list from WordPress verticals, instead of maintaining it by hand.
 *
 * WHAT CHANGED AND WHY
 * ownership.mjs used to carry a hand-written slug list per property. That does not scale: adding a
 * third property means editing the manifests in BOTH existing repos to remove the slugs that moved,
 * and a forgotten slug silently publishes nowhere. Now each WordPress post carries a `vertical`
 * term, and Supabase `vertical_sites` maps vertical -> site_domain. So the slug list is DERIVED:
 *
 *     post.vertical  ->  vertical_sites.site_domain  ->  "is this mine?"
 *
 * ADDING A PROPERTY OR MOVING CONTENT IS NOW A DATA CHANGE:
 *   - new vertical for an existing site  -> insert a vertical_sites row, re-run this script
 *   - new site                           -> new repo + vertical_sites rows; NO edits to the others
 *
 * WHY IT WRITES A FILE INSTEAD OF THE BUILD CALLING SUPABASE
 * Builds must be deterministic and must not break when Supabase is unreachable. So this script (a
 * deliberate, manual step) hits the network and commits the result; the build reads the committed
 * file. Re-run it whenever content moves.
 *
 *   node scripts/routing-sync.mjs            # write src/data/ownership.generated.mjs
 *   node scripts/routing-sync.mjs --check    # verify only; exit 1 on unexpected disagreement
 *
 * The `--check` mode is the migration gate: it compares the derived list against the hand-written
 * manifest and reports any post whose two answers differ. Known, deliberately-undecided posts are
 * listed in KNOWN_EXCEPTIONS below; anything else is a real problem and fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- configuration ------------------------------------------------------------------------------
// Which property this repo is. Overridable so the same script serves every repo.
const SITE_DOMAIN = process.env.SITE_DOMAIN || 'aichieve.net';
const WP_BASE = (process.env.PUBLIC_WORDPRESS_API_BASE || 'https://cms.giniloh.com').replace(/\/$/, '');

/**
 * Posts where the derived answer and the manifest disagree ON PURPOSE, pending a human decision.
 * Anything here is reported but does not fail --check. Empty is the goal.
 */
const KNOWN_EXCEPTIONS = new Set([
	// Derived aichieve.net, manifest giniloh.com. The "1" in the mixed
	// autonomous-agentic-workflows category. Decision still pending.
	'one-approval-two-payments',
	// moss-landing-burns-again-homeowners-become-the-grid was here too, but it has since been
	// removed from the shared CMS entirely and wellroost.com serves it from its own install —
	// so it is no longer a disagreement, just a stale manifest entry.
]);

// ---- helpers ------------------------------------------------------------------------------------
function loadEnv() {
	const out = {};
	// this repo may not carry its own .env; the monorepo parent holds the credentials
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

async function getJson(url, headers = {}) {
	const res = await fetch(url, { headers: { 'User-Agent': 'routing-sync', ...headers } });
	if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
	return res.json();
}

// ---- fetch --------------------------------------------------------------------------------------
const env = loadEnv();
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) {
	console.error('routing-sync: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}

console.log(`site_domain = ${SITE_DOMAIN}`);
console.log(`wordpress   = ${WP_BASE}`);

// which verticals are mine
const sites = await getJson(
	`${SB_URL}/rest/v1/vertical_sites?select=vertical_id,site_domain,frontend_url`,
	{ apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
);
const MY_VERTICALS = new Set(sites.filter((r) => r.site_domain === SITE_DOMAIN).map((r) => r.vertical_id));
const ORIGIN_BY_VERTICAL = new Map(sites.map((r) => [r.vertical_id, (r.frontend_url || '').replace(/\/$/, '')]));
if (MY_VERTICALS.size === 0) {
	console.error(`routing-sync: no vertical_sites rows for site_domain="${SITE_DOMAIN}" -- refusing to derive an empty site.`);
	process.exit(1);
}

// term id -> slug, and every post
const terms = await getJson(`${WP_BASE}/wp-json/wp/v2/vertical?per_page=100`);
const idToSlug = new Map(terms.map((t) => [t.id, t.slug]));

const posts = [];
for (let page = 1; page <= 20; page++) {
	const batch = await getJson(`${WP_BASE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=slug,vertical`);
	posts.push(...batch);
	if (batch.length < 100) break;
}

// ---- derive -------------------------------------------------------------------------------------
const derived = [];
const untagged = [];
const ambiguous = [];
for (const p of posts) {
	const mine = (p.vertical || []).map((id) => idToSlug.get(id)).filter(Boolean);
	if (mine.length === 0) { untagged.push(p.slug); continue; }
	if (mine.length > 1) { ambiguous.push(p.slug); continue; }
	if (MY_VERTICALS.has(mine[0])) derived.push(p.slug);
}
derived.sort();

console.log(`posts=${posts.length}  verticals(mine)=${MY_VERTICALS.size}  derived=${derived.length}  untagged=${untagged.length}  ambiguous=${ambiguous.length}`);
if (untagged.length) console.warn(`  WARNING untagged (publishes to NO site): ${untagged.join(', ')}`);
if (ambiguous.length) console.warn(`  WARNING multiple verticals: ${ambiguous.join(', ')}`);

// ---- compare against the hand-written manifest --------------------------------------------------
// The two directions are NOT symmetric and must not be treated as one bucket:
//
//   manifest - derived  = a post this site currently publishes that the verticals now send
//                         ELSEWHERE. That is the dangerous direction: it disappears from the site.
//                         Only a real, unexpected one fails --check.
//   derived - manifest  = a post the verticals assign here that the hand-written list never knew
//                         about (typically newly published content). That is the system working --
//                         it is exactly the silent gap this migration exists to close.
const manifestPath = path.join(ROOT, 'src/data/ownership.mjs');
let manifest = [];
if (fs.existsSync(manifestPath)) {
	const mod = await import(manifestPath);
	// Pick the list that matches THIS property. A blind `GINILOH_POST_SLUGS ?? AICHIEVE_POST_SLUGS`
	// silently compares against the wrong baseline in the aichieve repo, where the first name is
	// its FOREIGN list -- every comparison then comes out inverted.
	const key = SITE_DOMAIN.includes('aichieve') ? 'AICHIEVE_POST_SLUGS' : 'GINILOH_POST_SLUGS';
	manifest = mod[key] ?? [];
}
const derivedSet = new Set(derived);
const manifestSet = new Set(manifest);
const cmsSlugs = new Set(posts.map((p) => p.slug));
const verticalBySlug = new Map(posts.map((p) => [p.slug, (p.vertical || []).map((i) => idToSlug.get(i)).filter(Boolean).join(',')]));

// A: in the manifest, still in the CMS, but the verticals send it to another property.
const movedAway = manifest.filter((s) => cmsSlugs.has(s) && !derivedSet.has(s));
// B: in the manifest but the post no longer exists in the CMS at all (checked out, moved to a
//    different install). Harmless — there is nothing here to render.
const staleInManifest = manifest.filter((s) => !cmsSlugs.has(s));
// C: assigned here by a vertical, absent from the manifest. New content, usually.
const newlyRouted = derived.filter((s) => !manifestSet.has(s));

const unexpectedAway = movedAway.filter((s) => !KNOWN_EXCEPTIONS.has(s));
const knownAway = movedAway.filter((s) => KNOWN_EXCEPTIONS.has(s));

console.log(`\nvs manifest (${manifest.length} entries):  derived=${derived.length}`);
console.log(`  newly routed here (new content, expected) : ${newlyRouted.length}${newlyRouted.length ? ' -> ' + newlyRouted.join(', ') : ''}`);
console.log(`  would move away from this site            : ${movedAway.length}`);
for (const s of movedAway) {
	console.log(`      ${KNOWN_EXCEPTIONS.has(s) ? '[known]    ' : '[UNEXPECTED]'} ${s}  -> vertical=${verticalBySlug.get(s)}`);
}
console.log(`  stale manifest entries (post gone from CMS): ${staleInManifest.length}${staleInManifest.length ? ' -> ' + staleInManifest.join(', ') : ''}`);

// ---- write / check ------------------------------------------------------------------------------
const OUT = path.join(ROOT, 'src/data/ownership.generated.mjs');

if (process.argv.includes('--check')) {
	if (unexpectedAway.length) {
		console.error(`\nrouting-sync --check FAILED: ${unexpectedAway.length} post(s) would silently LEAVE this site.`);
		console.error('Resolve each by setting its WordPress vertical, or add it to KNOWN_EXCEPTIONS with a reason.');
		process.exit(1);
	}
	console.log('\nrouting-sync --check OK');
	process.exit(0);
}

const foreign = posts
	.map((p) => p.slug)
	.filter((s) => !derivedSet.has(s))
	.sort();

// slug -> the origin that should serve it. Drives the 301 map, so a redirect always points at the
// property that actually owns the post rather than at a hardcoded sibling.
const foreignTargets = {};
for (const p of posts) {
	if (derivedSet.has(p.slug)) continue;
	const vs = (p.vertical || []).map((i) => idToSlug.get(i)).filter(Boolean);
	const origin = vs.length ? ORIGIN_BY_VERTICAL.get(vs[0]) : '';
	if (origin) foreignTargets[p.slug] = origin;
}

const body = `/**
 * GENERATED FILE -- do not edit by hand.
 * Run: node scripts/routing-sync.mjs
 *
 * Derived from WordPress \`vertical\` terms x Supabase \`vertical_sites\`, for site_domain ${SITE_DOMAIN}.
 * Regenerate whenever content moves or a vertical is added.
 *
 * This replaces the hand-written lists in ownership.mjs as the source of truth for ownership.
 * ownership.mjs keeps the things that are genuinely configuration (origins, moved tool paths) and
 * its slug lists remain as the assertion baseline that \`routing-sync --check\` compares against.
 */
export const OWNED_POST_SLUGS_GENERATED = ${JSON.stringify(derived, null, '\t')};
export const FOREIGN_POST_SLUGS_GENERATED = ${JSON.stringify(foreign, null, '\t')};
export const FOREIGN_TARGETS = ${JSON.stringify(foreignTargets, null, '\t')};
export const GENERATED_FOR = ${JSON.stringify(SITE_DOMAIN)};
export const GENERATED_AT = ${JSON.stringify(new Date().toISOString())};
`;
fs.writeFileSync(OUT, body);
console.log(`\nwrote ${path.relative(ROOT, OUT)} (owned=${derived.length} foreign=${foreign.length})`);
if (unexpectedAway.length) {
	console.log(`note: ${unexpectedAway.length} post(s) would leave this site -- review before deploying.`);
}
