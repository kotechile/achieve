// @ts-check
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

/**
 * Publishes the sitemap at the path everyone actually looks for.
 *
 * `@astrojs/sitemap` emits `sitemap-index.xml` + `sitemap-0.xml`, and the index is the real entry
 * point — but nothing serves it at `/sitemap.xml`. Every crawler checker, Search Console field and
 * SEO audit probes `/sitemap.xml` first, so the site reported "no sitemap" while a perfectly good
 * one sat one URL away.
 *
 * The index is COPIED rather than re-generated with a second list of URLs: the URL list stays in
 * exactly one place (the generated chunk) and cannot drift from a hand-written copy.
 */
function sitemapAlias() {
  return {
    name: 'aichieve:sitemap-alias',
    hooks: {
      /** @param {{ dir: URL, logger: { info: (m: string) => void } }} ctx */
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        // Deliberately fatal. If the sitemap integration ever stops emitting the index, a build
        // that fails loudly is better than one that ships a 404 at /sitemap.xml for a month.
        await copyFile(`${out}/sitemap-index.xml`, `${out}/sitemap.xml`);
        logger.info('published /sitemap.xml (copy of sitemap-index.xml)');
      }
    }
  };
}

/**
 * aichieve.net — the enterprise command center half of the 2026 giniloh.com split.
 *
 * Readers arrive here from two places: directly, and via the 301s giniloh.com now serves for the
 * compute / agentic / supply-chain pages that used to live under its `/calculators/` prefix.
 * Both land on `/tools/<slug>/` here, which is why the old prefix is aliased below.
 */
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://aichieve.net',
  // One entry per path. Astro normalises the trailing slash itself, and listing both forms
  // registers the same static route twice (a build warning now, a hard error in a later
  // Astro release).
  redirects: {
    // The moved tool pages shipped as /calculators/<slug>/ on giniloh.com. Keep the path shape
    // working for anyone who bookmarked the sub-path rather than the whole URL.
    '/calculators': '/tools/',
    '/calculators/gpu-compute': '/tools/gpu-compute/',
    '/calculators/decision-intelligence': '/tools/master-asset-tco/',
    // Product host: the canonical app directory lives at /apps/ here. Old giniloh names for
    // the same destination collapse into it.
    '/showcase': '/apps/',
    '/pro-apps': '/apps/'
  },
  integrations: [
    react(),
    sitemap(),
    // Must come AFTER sitemap(): build:done hooks run in integration order, and this one reads
    // the file sitemap() writes.
    sitemapAlias()
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client']
    }
  }
});
