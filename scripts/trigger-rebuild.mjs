#!/usr/bin/env node
/**
 * rebuild:cms — push a real commit so the deploy actually re-fetches WordPress.
 *
 * WHY THIS EXISTS
 * Article bodies are not in this repo. They are read from the CMS during `npm run build`
 * (`fetchAllPosts`), so editing a post in WordPress changes nothing on the site until an image
 * is rebuilt. That much is expected.
 *
 * The trap is Docker's layer cache. `COPY . .` followed by `RUN npm run build` is only invalidated
 * when the copied tree changes — so an EMPTY commit (`git commit --allow-empty`) produces a new
 * image tag pointing at the SAME cached layers, and the site keeps serving the old body while the
 * deploy log reads "success". There are five such commits in the history for 2026-11-03; the image
 * built from them still carried the 19:51 CMS snapshot at 20:05. Measured, not theorised.
 *
 * Stamping `build-trigger.json` changes a file in the build context, which invalidates everything
 * after the COPY and forces the fetch. The stamp is a timestamp, so two rebuilds in the same
 * minute still differ by the message.
 *
 * Usage:
 *   npm run rebuild:cms -- "your-dedupe-cut-f1-by-74 (plain-language pass)"
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REASON = process.argv.slice(2).join(' ').trim();
if (!REASON) {
	console.error('usage: npm run rebuild:cms -- "<what changed, and where>"');
	process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const trigger = path.join(root, 'build-trigger.json');

const data = JSON.parse(readFileSync(trigger, 'utf8'));
data.stamp = new Date().toISOString();
writeFileSync(trigger, `${JSON.stringify(data, null, 2)}\n`);

const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'inherit' });
git('add', 'build-trigger.json');
git('commit', '-m', `ci: rebuild after CMS change — ${REASON}`);
git('push', 'origin', 'HEAD:main');

console.log(`\nstamped ${data.stamp} and pushed — the deploy will re-fetch the CMS.`);
console.log('verify with: curl -s https://aichieve.net/<slug>/ | grep -c "<new text>"');
