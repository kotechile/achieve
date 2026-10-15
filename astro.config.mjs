// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

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
    sitemap()
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client']
    }
  }
});
