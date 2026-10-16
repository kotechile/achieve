#!/usr/bin/env node
/**
 * WCAG contrast audit for the built site — real browser, real computed styles.
 *
 * WHY THIS EXISTS
 * `npm run check` and `npm run build` prove the site COMPILES. Neither of them can see the
 * class of bug this catches: text that compiles fine and is unreadable on screen. It is not a
 * theoretical risk — the August 2026 pass found 662 of 1094 text elements below AA, including
 * the article standfirst at 1.29:1 and five app names on the homepage at 1.32:1, all invisible
 * and all invisible to `astro check`.
 *
 * The cause is structural and will recur: `aichieve.css` imports giniloh's light-paper
 * `global.css` whole, and that sheet pins ink with bare-element `!important` selectors
 * (`p`, `.text-lg`, `.text-base`). Unlayered, those outrank every console class and every
 * Tailwind `text-*` utility. Any new page can reintroduce a collision, so the contract is
 * checked here instead of by eye.
 *
 *     node scripts/audit-contrast.mjs                     # one page per template
 *     node scripts/audit-contrast.mjs --all               # every built page
 *     node scripts/audit-contrast.mjs /tools/gpu-compute/ /about/
 *     npm run audit:contrast
 *
 * Exit code 0 = every measured text element clears WCAG 2.1 AA at its own size and weight.
 * Non-zero = at least one does not, and each is listed with its colour pair and ratio.
 *
 * Chrome is required. Set CHROME_PATH if it is not in the usual place. This is deliberately
 * NOT wired into `scripts/verify.mjs`: that one runs inside the deploy image, which has
 * nothing but nginx, and has no browser to drive.
 */
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.DIST_DIR || join(ROOT, 'dist');

const CHROME_CANDIDATES = [
	process.env.CHROME_PATH,
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
	'/snap/bin/chromium'
].filter(Boolean);

/** Injected into the page as its last <script>. Reports base64(JSON) in a hidden textarea. */
const AUDITOR = `(function () {
  var cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  var ctx = cvs.getContext('2d', { willReadFrequently: true });
  // Colours are resolved through a canvas rather than a regex on the computed string.
  // Chrome serialises computed colours in whatever space the declaration used, and Tailwind
  // v4's palette is oklch() — a /rgba?\\(/ match silently skipped every oklch element and
  // mis-resolved oklch backgrounds to the ancestor underneath, which reads as a pass.
  function parseColor(c) {
    if (!c || !ctx) return null;
    if (!CSS.supports('color', c)) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    var d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  }
  function over(fg, bg) {
    var a = fg.a;
    return {
      r: Math.round(fg.r * a + bg.r * (1 - a)),
      g: Math.round(fg.g * a + bg.g * (1 - a)),
      b: Math.round(fg.b * a + bg.b * (1 - a)),
      a: 1
    };
  }
  function chan(v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function lum(c) { return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b); }
  function ratio(a, b) {
    var la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function hex(c) {
    return '#' + [c.r, c.g, c.b].map(function (v) {
      return ('0' + Math.round(v).toString(16)).slice(-2);
    }).join('');
  }
  // Walk ancestors for the first surface that actually paints. Translucent layers are
  // composited in order; a gradient is flagged because it cannot be reduced to one value.
  function effectiveBg(el) {
    var stack = [];
    var textured = false;
    var node = el;
    while (node && node.nodeType === 1) {
      var cs = getComputedStyle(node);
      var bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0) {
        if (bg.a === 1) {
          var base = bg;
          for (var i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
          return { color: base, textured: textured };
        }
        stack.push(bg);
      }
      if (cs.backgroundImage && cs.backgroundImage !== 'none') textured = true;
      node = node.parentElement;
    }
    var base2 = { r: 255, g: 255, b: 255, a: 1 };
    for (var j = stack.length - 1; j >= 0; j--) base2 = over(stack[j], base2);
    return { color: base2, textured: textured };
  }
  function pathOf(el) {
    var parts = [];
    var n = el;
    for (var i = 0; i < 4 && n && n.nodeType === 1; i++) {
      var s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      var cls = (n.getAttribute('class') || '').trim().split(/\\s+/).filter(Boolean);
      if (cls.length) s += '.' + cls.slice(0, 4).join('.');
      parts.unshift(s);
      n = n.parentElement;
    }
    return parts.join(' > ');
  }
  function hasOwnText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var c = el.childNodes[i];
      if (c.nodeType === 3 && c.textContent.trim().length > 1) return true;
    }
    return false;
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, SVG: 1, PATH: 1, TEMPLATE: 1 };
  var out = [];
  var all = document.body.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (SKIP[el.tagName]) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.classList.contains('sr-only')) continue;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (!hasOwnText(el)) continue;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.1) continue;
    // SVG text renders with the fill property, not color. Measuring color there reported the
    // inherited body ink against the figure's own dark plate — a number that describes
    // nothing on screen. The computed fill resolves both the presentation attribute and
    // any CSS rule, and the ancestor walk below still finds the figure's background.
    var inkStr = cs.color;
    var inSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
    if (inSvg && (el.tagName === 'text' || el.tagName === 'tspan')) {
      if (!cs.fill || cs.fill === 'none' || !CSS.supports('color', cs.fill)) continue;
      inkStr = cs.fill;
    }
    var fg = parseColor(inkStr);
    if (!fg) continue;
    var bgr = effectiveBg(el);
    var bg = bgr.color;
    if (fg.a < 1) fg = over(fg, bg);
    var px = parseFloat(cs.fontSize);
    var weight = parseInt(cs.fontWeight, 10) || 400;
    var large = px >= 24 || (px >= 18.66 && weight >= 700);
    var need = large ? 3.0 : 4.5;
    var cr = ratio(fg, bg);
    out.push({
      sel: pathOf(el),
      text: el.textContent.trim().slice(0, 60),
      color: hex(fg),
      bg: hex(bg),
      textured: bgr.textured,
      px: Math.round(px * 10) / 10,
      weight: weight,
      need: need,
      ratio: Math.round(cr * 100) / 100,
      pass: cr >= need
    });
  }
  var payload = {
    url: location.pathname,
    total: out.length,
    fails: out.filter(function (o) { return !o.pass; })
  };
  var ta = document.createElement('textarea');
  ta.id = '__audit';
  ta.style.display = 'none';
  ta.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  document.body.appendChild(ta);
})();`;

const MIME = {
	'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
	'.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
	'.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json',
	'.xml': 'application/xml', '.txt': 'text/plain', '.pdf': 'application/pdf', '.mp4': 'video/mp4'
};

const dim = (s) => `\u001b[2m${s}\u001b[0m`;
const red = (s) => `\u001b[31m${s}\u001b[0m`;
const green = (s) => `\u001b[32m${s}\u001b[0m`;

function findChrome() {
	for (const c of CHROME_CANDIDATES) if (existsSync(c)) return c;
	return null;
}

/** One page per template, discovered from the build so it survives content churn. */
async function defaultPages() {
	const pages = ['/', '/articles/', '/categories/', '/tools/', '/tools/gpu-compute/',
		'/tools/master-asset-tco/', '/about/', '/apps/', '/author/gini-loh/'];

	const cats = await readdir(join(DIST, 'categories'), { withFileTypes: true }).catch(() => []);
	const cat = cats.find((d) => d.isDirectory());
	if (cat) pages.push(`/categories/${cat.name}/`);

	// The article template is the one carrying the standfirst, so find it by that marker
	// rather than by a slug that WordPress will eventually rename.
	const TOP_LEVEL_SKIP = new Set(['_astro', 'articles', 'categories', 'tools', 'apps', 'about', 'author']);
	const dirs = await readdir(DIST, { withFileTypes: true });
	for (const d of dirs) {
		if (!d.isDirectory() || TOP_LEVEL_SKIP.has(d.name)) continue;
		const html = await readFile(join(DIST, d.name, 'index.html'), 'utf8').catch(() => '');
		if (html.includes('ai-quote')) { pages.push(`/${d.name}/`); break; }
	}
	return pages;
}

async function allPages() {
	const pages = ['/'];
	async function walk(dir, prefix) {
		for (const d of await readdir(dir, { withFileTypes: true })) {
			if (!d.isDirectory()) continue;
			const next = `${prefix}/${d.name}`;
			// Asset directories and WordPress-era paths are not pages.
			if (d.name.startsWith('_') || d.name.startsWith('.')) continue;
			pages.push(`${next}/`);
			await walk(join(dir, d.name), next);
		}
	}
	await walk(DIST, '');
	return pages;
}

async function main() {
	const args = process.argv.slice(2);
	const chrome = findChrome();
	if (!chrome) {
		console.error(red('No Chrome/Chromium found.'));
		console.error('Set CHROME_PATH to a Chromium binary and re-run.');
		process.exit(2);
	}
	if (!existsSync(DIST)) {
		console.error(red(`No build at ${DIST} — run \`npm run build\` first.`));
		process.exit(2);
	}

	const explicit = args.filter((a) => !a.startsWith('--'));
	const pages = explicit.length
		? explicit.map((p) => (p.startsWith('/') ? p : `/${p}/`))
		: args.includes('--all')
			? await allPages()
			: await defaultPages();

	// Serve a copy of the build so the auditor can be injected without touching dist/.
	const sandbox = await mkdtemp(join(tmpdir(), 'contrast-audit-'));
	await cp(DIST, sandbox, { recursive: true, force: true });

	const targets = [];
	for (const page of pages) {
		const rel = page.replace(/^\/+|\/+$/g, '');
		const file = join(sandbox, rel, 'index.html');
		if (!existsSync(file)) continue;
		const html = await readFile(file, 'utf8');
		await writeFile(file, html.replace('</body>', `<script>${AUDITOR}</script></body>`));
		targets.push({ page, urlPath: rel ? `/${rel}/` : '/' });
	}
	if (!targets.length) {
		console.error(red('No matching pages in the build.'));
		await rm(sandbox, { recursive: true, force: true });
		process.exit(2);
	}

	const server = createServer(async (req, res) => {
		const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
		let file = join(sandbox, urlPath);
		if (urlPath.endsWith('/')) file = join(file, 'index.html');
		try {
			const data = await readFile(file);
			res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end();
		}
	});
	await new Promise((r) => server.listen(0, '127.0.0.1', r));
	const port = server.address().port;

	let failed = 0;
	let measured = 0;
	const perPage = [];

	for (const { page, urlPath } of targets) {
		let data;
		try {
			const { stdout } = await exec(chrome, [
				'--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
				'--virtual-time-budget=8000', '--dump-dom', `http://127.0.0.1:${port}${urlPath}`
			], { maxBuffer: 96 * 1024 * 1024 });
			const m = stdout.match(/<textarea id="__audit"[^>]*>([A-Za-z0-9+/=]*)<\/textarea>/);
			if (!m) throw new Error('auditor did not run');
			data = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
		} catch (err) {
			console.error(`  ${red('ERROR')} ${page}  ${err.message}`);
			failed += 1;
			continue;
		}

		measured += data.total;
		failed += data.fails.length;
		perPage.push([page, data.fails.length, data.total]);

		const seen = new Set();
		for (const f of data.fails) {
			const key = `${f.color}|${f.bg}|${f.px}|${f.need}`;
			if (seen.has(key)) continue;
			seen.add(key);
			console.log(`\n  ${red('FAIL')} ${page}  ${f.ratio}:1 (needs ${f.need})  ${f.px}px/${f.weight}`);
			console.log(`       ink ${f.color} on ${f.bg}${f.textured ? ' (textured surface)' : ''}`);
			console.log(`       "${f.text.replace(/\s+/g, ' ')}"`);
			console.log(`       ${dim(f.sel)}`);
		}
	}

	server.close();
	await rm(sandbox, { recursive: true, force: true });

	console.log('');
	for (const [page, bad, total] of perPage) {
		const label = bad ? red(`${bad} failing`) : green('pass');
		console.log(`  ${label.padEnd(20)} ${String(page).padEnd(42)} ${dim(`${total} text elements`)}`);
	}
	const verdict = failed
		? red(`${failed} of ${measured} text elements fall below WCAG AA`)
		: green(`all ${measured} text elements clear WCAG AA`);
	console.log(`\n${verdict}  ${dim(`across ${perPage.length} page(s)`)}`);
	process.exit(failed ? 1 : 0);
}

main();
