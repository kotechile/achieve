#!/usr/bin/env node
/**
 * Layout audit: horizontal overflow + tap-target size, from a real browser at a real viewport.
 * Same technique as contrast-audit.mjs: inject as last <script>, report base64(JSON) in a textarea,
 * read it back out of `chrome --dump-dom`. No CDP, no dependencies.
 *
 *   node layout-audit.mjs 390 /calculators/relocation-cost/ /
 *   DIST_DIR=build node layout-audit.mjs 768 /tools/
 */
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';

const exec = promisify(execFile);
const DIST = process.env.DIST_DIR || 'dist';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const AUDITOR = `(function () {
  function cls(el) {
    var c = (el.getAttribute && el.getAttribute('class')) || '';
    return c.length > 160 ? c.slice(0, 160) + '…' : c;
  }
  function path(el) {
    var out = [], n = el, depth = 0;
    while (n && n.tagName && depth < 4) {
      var s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      var c = (n.getAttribute && n.getAttribute('class')) || '';
      var first = c.split(/\\s+/).filter(Boolean).slice(0, 3).join('.');
      if (first) s += '.' + first;
      out.unshift(s);
      n = n.parentElement; depth++;
    }
    return out.join(' > ');
  }
  function visible(el) {
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  var vw = document.documentElement.clientWidth;
  var res = {
    viewport: vw,
    scrollWidth: document.documentElement.scrollWidth,
    overflowX: Math.max(0, document.documentElement.scrollWidth - vw),
    offenders: [],
    smallTargets: []
  };
  function report() {
  // Every element whose box escapes the viewport on the right or left.
  var all = document.querySelectorAll('body *');
  for (var i = 0; i < all.length; i++) {
    var el = all[i], r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      // Only report the element itself, not every ancestor that merely contains it.
      var parentOverflow = el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1;
      res.offenders.push({
        tag: el.tagName.toLowerCase(),
        classes: cls(el),
        path: path(el),
        rect: [Math.round(r.left), Math.round(r.right), Math.round(r.width)],
        inherited: parentOverflow,
        text: (el.textContent || '').trim().slice(0, 70)
      });
    }
  }
  // Interactive targets smaller than 44x44 CSS px (WCAG 2.5.5 / iOS HIG).
  var inter = document.querySelectorAll('a[href], button, summary, input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex="-1"])');
  for (var j = 0; j < inter.length; j++) {
    var t = inter[j], tr = t.getBoundingClientRect();
    if (tr.width === 0 && tr.height === 0) continue;
    if (tr.width < 44 || tr.height < 44) {
      res.smallTargets.push({
        tag: t.tagName.toLowerCase(),
        label: (t.getAttribute('aria-label') || t.textContent || '').trim().slice(0, 48),
        size: [Math.round(tr.width), Math.round(tr.height)],
        path: path(t)
      });
    }
  }
  var ta = document.createElement('textarea');
  ta.id = '__layout_audit__';
  ta.style.display = 'none';
  // textContent, not .value: --dump-dom serialises the DOM, and a textarea's .value property is
  // not reflected into the serialised HTML. This is the single trap that makes the harness silently
  // report "auditor did not run".
  ta.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(res))));
  document.body.appendChild(ta);
  }
  // MEASURE AFTER HYDRATION. Astro islands render their initial state into the SSR HTML, so a
  // synchronous measurement at parse time reports the pre-hydration layout — which for a
  // fit-to-width canvas is off by a factor of two and produces a fake "overflow" finding.
  // Wait for every astro-island to drop its ssr attribute (React has taken over), with a floor.
  function ready() {
    var stuck = document.querySelectorAll('astro-island[ssr]').length;
    if (stuck === 0) report();
    else if (waited > 9000) report();
    else { waited += 200; setTimeout(ready, 200); }
  }
  var waited = 0;
  setTimeout(ready, 400);
})();`;

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml' };

async function main() {
  const width = parseInt(process.argv[2] || '390', 10);
  const paths = process.argv.slice(3);
  if (!paths.length) { console.error('usage: node layout-audit.mjs <width> <path...>'); process.exit(2); }
  if (!existsSync(DIST)) { console.error(`no build at ${DIST}`); process.exit(2); }

  // Chrome on macOS clamps the window to ~500px wide, so a 390px request silently lays out at
  // 500px (a "390px" screenshot then shows content clipped at the right edge — a harness artifact,
  // not a site bug). `--force-device-scale-factor` does NOT divide the layout viewport: the CSS
  // viewport equals the window width regardless, so DSF=2 and a 780px window measured 780px, not
  // 390. Keep DSF at 1 and treat ~500px as the narrowest honest viewport; always keep the measured
  // `viewport` in the output so a wrong width cannot pass unnoticed.
  const DSF = Number(process.env.DSF || 1);
  const winWidth = width * DSF;

  const tmp = await mkdtemp(join(tmpdir(), 'layout-audit-'));
  // Same conflict-copy rule as audit-contrast.mjs: iCloud duplicates as `<stem> 2.<ext>`, and a copy
  // inside a page folder makes the sandbox copy fail before a single page is measured.
  const isSyncConflict = (name) => / \d+$/.test(name) || / \d+\.[^.]+$/.test(name) || name.endsWith('.nosync');
  await cp(DIST, tmp, { recursive: true, filter: (src) => !isSyncConflict(basename(src)) });

  for (const p of paths) {
    const file = p.endsWith('/') ? join(tmp, p, 'index.html') : join(tmp, p.endsWith('.html') ? p : join(p, 'index.html'));
    if (!existsSync(file)) { console.log(`SKIP ${p} (no index.html)`); continue; }
    const html = await readFile(file, 'utf8');
    await writeFile(file, html.replace('</body>', `<script>${AUDITOR}</script></body>`));
  }

  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = join(tmp, urlPath);
    if (urlPath.endsWith('/')) file = join(file, 'index.html');
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end('nf'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  let worst = 0;
  for (const p of paths) {
    const url = `http://127.0.0.1:${port}${p}${p.endsWith('/') ? '' : '/'}`;
    let dom = '';
    try {
      const { stdout } = await exec(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        `--force-device-scale-factor=${DSF}`,
        '--virtual-time-budget=9000', `--window-size=${winWidth},1200`, '--dump-dom', url
      ], { maxBuffer: 1024 * 1024 * 200 });
      dom = stdout;
    } catch (e) { console.log(`ERR ${p}: ${e.message.slice(0, 120)}`); continue; }

    const m = dom.match(/<textarea[^>]*id="__layout_audit__"[^>]*>([A-Za-z0-9+/=]+)<\/textarea>/);
    if (!m) { console.log(`NO-DATA ${p} (auditor did not run)`); continue; }
    const data = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
    worst = Math.max(worst, data.overflowX);
    console.log(`\n=== ${p}  @${width}px  scrollWidth=${data.scrollWidth} viewport=${data.viewport} OVERFLOW=${data.overflowX}px`);
    const own = data.offenders.filter((o) => !o.inherited);
    console.log(`  overflowing elements: ${data.offenders.length} (${own.length} not inheriting)`);
    for (const o of own.slice(0, 12)) {
      console.log(`   [${o.rect[0]}..${o.rect[1]} w=${o.rect[2]}] <${o.tag} class="${o.classes}">`);
      if (o.text) console.log(`      text: ${o.text}`);
    }
    if (data.smallTargets.length) {
      console.log(`  tap targets < 44px: ${data.smallTargets.length}`);
      for (const t of data.smallTargets.slice(0, 10)) console.log(`   ${t.size[0]}x${t.size[1]} <${t.tag}> "${t.label}"`);
    }
  }

  server.close();
  await rm(tmp, { recursive: true, force: true });
  console.log(`\nworst horizontal overflow across pages: ${worst}px`);
}

main();
