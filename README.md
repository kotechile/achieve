# AIChieve — aichieve.net front end

Astro front end for **aichieve.net**, the enterprise half of the 2026 giniloh.com split.

- **giniloh.com** — the quantified professional. Personal and career decisions, spent from your own money.
- **aichieve.net** — the enterprise command center. Systemic risk, AI stack economics and operational cost, spent from a company's money.

Both properties read the **same WordPress install**. Nothing is duplicated between them:
`src/lib/site-content.ts` is the single place that decides which posts belong here.

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # static build to ./dist
npm run preview   # preview the build
npm run check     # astro type check
```

Deployment is the nginx image built from `./Dockerfile` (Coolify → `kotechile/achieve:main`).

## Environment

Build-time values. Astro inlines `PUBLIC_*` into the bundle, so they must be present **during
`npm run build`** — passing them only at container runtime ships the fallback values instead.
See `.env.example`; the Dockerfile declares matching `ARG`s with production defaults.

| Variable | Purpose | Default |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | Canonical origin | `https://aichieve.net` |
| `PUBLIC_WORDPRESS_API_BASE` | Shared CMS | `https://cms.giniloh.com` |
| `PUBLIC_APPS_BASE` | PRO app host | `https://apps.giniloh.com` |
| `PUBLIC_ANALYTICS_*` | Umami analytics | — |
| `PUBLIC_GOOGLE_/BING_SITE_VERIFICATION` | Search Console | — |

### Open item: the app host

`PUBLIC_APPS_BASE` currently points at `apps.giniloh.com`, because that is where the PRO apps
actually run today. It defaults to the **live** host on purpose so no link is dead. When the
apps are redeployed at `apps.aichieve.net`, set `PUBLIC_APPS_BASE` in Coolify — one variable,
no code change.

## Content ownership

The WordPress taxonomy was authored as one site's blog, so it mixes audiences: a
`major-purchases-assets` category holds both an espresso-machine cost-per-use post and a
KV-cache concurrency post. The split therefore **cannot** be expressed as "category X goes
here" — it is an explicit per-post slug list.

- `src/lib/site-content.ts` — `OWNED_POST_SLUGS` / `FOREIGN_POST_SLUGS`, plus `belongsToSite()`
  and `filterOwnedPosts()`.
- **Every** WordPress read funnels through `fetchOwnedPosts()` in `src/lib/wordpress.ts`. A new
  fetch path that skips it will silently cross-publish.

**Consequence to be aware of:** a post published to the CMS appears on *neither* site until its
slug is added to the relevant `site-content.ts`. Silence is the deliberate default — it is
safer than the same article appearing on two domains with two canonicals.

## Routes

| Route | Notes |
| --- | --- |
| `/` | Command deck: coverage board, domain grid, tool register, PRO apps, dispatch log |
| `/tools/` | The two deterministic engines |
| `/tools/gpu-compute/` | GPU TCO Analyzer — local build vs. cloud lease |
| `/tools/master-asset-tco/` | Master Asset & Software TCO Calculator — build vs. buy |
| `/apps/` | PRO app directory (paid, hosted on `PUBLIC_APPS_BASE`) |
| `/articles/` | Full archive (no pagination cut) |
| `/categories/`, `/categories/[slug]/` | Domains |
| `/[slug]/` | Article, recreated natively in Astro with a light reading column |
| `/about/`, `/author/gini-loh/`, `/404` | |

The moved tools shipped as `/calculators/<slug>/` on giniloh.com. Those paths 301 to `/tools/`
here — at the edge in `default.conf`, and statically via `redirects` in `astro.config.mjs`.

**`/apps/` is a real route and must never be redirected.** giniloh's nginx config redirects
`^/(apps|showcase|pro-apps)/?$` off-site; copying it verbatim would have 301'd this site's own
navigation to the other property. Only the legacy `/showcase` and `/pro-apps` aliases collapse
into `/apps/`.

## Design

Dark industrial console — graphite `#0E1116`, safety amber `#E8A33D`, hairline-only structure,
mono chrome. Deliberately differentiated from giniloh's white editorial system on all three
axes (paper band, display style, accent hue) so the two properties do not read as colour-swaps.

Two things are white **on purpose**: the long-form reading column (`.paper`) and the calculator
bays (`.instrument-surface`). The engines were authored against a light surface and carry their
own light-theme classes; mounting them as a bright readout in a dark rack means they render
exactly as verified instead of being force-inverted. The scoped flattening they depend on lives
in `src/styles/aichieve.css` under `.instrument-surface`, so it cannot leak into the chrome.

## Dependency pinning

`package.json` pins **exact** versions, mirroring giniloh's production set, plus an `overrides`
entry for `vite`. This is not fussiness: a fresh `^`-range install resolved `astro 6.4.8` →
Vite 8 + rolldown, which `@tailwindcss/vite@4.2.x` cannot drive — the build dies with
`Missing field tsconfigPaths on BindingViteResolvePluginConfig.resolveOptions`. Bump these in
both repos at once, deliberately.

## Brand assets

`public/favicon.svg|ico` and `public/default-share-image.png` are generated by
`scripts/generate-brand-assets.py` (`python3`, needs Pillow). Re-run it rather than hand-editing.
The share card also fills a gap that existed on both properties: `BaseLayout` referenced
`/default-share-image.png` but the file was never in `public/`, so every social embed pointed
at a 404.
