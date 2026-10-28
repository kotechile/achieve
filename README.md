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
npm run verify    # assert the DEPLOY contract against a running origin
npm run brand     # regenerate favicon / share card (needs Pillow)
```

Deployment is the nginx image built from `./Dockerfile` (Coolify → `kotechile/achieve:main`).

### `npm run verify`

`check` and `build` prove the site **compiles**. They say nothing about whether it is *deployed*
correctly — and every launch failure in 2026 was a deploy-level one. `scripts/verify.mjs` asserts
the actual contract and exits non-zero on violation, so "green" means something:

```bash
npm run verify -- https://aichieve.net   # production
npm run verify                            # local container on :8899
```

It checks that core routes and assets return 200, that moved paths 301 to the right target
**without leaking an internal port or downgrading to http**, that this property's posts resolve
while the sibling's 404, that the canonical host is correct, and that the crawl artifacts are
served (see below). The boundary check imports the generated ownership manifest, so it cannot
drift out of sync with the code.

### Crawl artifacts

`@astrojs/sitemap` writes `sitemap-index.xml` + `sitemap-0.xml`, neither of which is the name a
crawler probes, and it writes no `robots.txt` at all. Two things close that gap:

- `src/pages/robots.txt.ts` generates `/robots.txt` from `site` in `astro.config.mjs`, so the
  origin cannot disagree with the canonical tags.
- The `sitemapAlias` integration copies `sitemap-index.xml` to `/sitemap.xml` at
  `astro:build:done`. The URL list lives only in the generated chunk — there is no second
  hand-written sitemap to drift, and a missing index fails the build instead of shipping a 404.

`npm run verify` asserts both, plus that every chunk the index points at is 200 with a non-zero
URL count. Search Console and Bing probe `/sitemap.xml` verbatim; a 404 there reads as "this site
has no sitemap" no matter what `sitemap-index.xml` holds.

**Submitting to Google Search Console:** add a *Domain* property for `aichieve.net` (DNS TXT
record — covers `www` and every subdomain without a build), then Sitemaps → add
`https://aichieve.net/sitemap.xml`. No verification tag is needed for the DNS route; the
`PUBLIC_GOOGLE_SITE_VERIFICATION` build arg exists only for the URL-prefix method.

## Environment

Build-time values. Astro inlines `PUBLIC_*` into the bundle, so they must be present **during
`npm run build`** — passing them only at container runtime ships the fallback values instead.
See `.env.example`; the Dockerfile declares matching `ARG`s with production defaults.

| Variable | Purpose | Default |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | Canonical origin | `https://aichieve.net` |
| `PUBLIC_WORDPRESS_API_BASE` | Shared CMS | `https://cms.giniloh.com` |
| `PUBLIC_APPS_BASE` | PRO app host | `https://apps.aichieve.net` |
| `PUBLIC_ANALYTICS_*` | Umami analytics | — |
| `PUBLIC_GOOGLE_/BING_SITE_VERIFICATION` | Search Console | — |

### The app host

`PUBLIC_APPS_BASE` points at `apps.aichieve.net`, where the PRO apps were cut over to and where
deep links resolve (`/spendproof`, `/ledgerlink`, …). The old `apps.giniloh.com` host answers
503 for every path, so nothing here may reference it. The default is the **live** host on purpose
so no link is dead, and `PUBLIC_APPS_BASE` remains the single place the host is written down —
overridable in Coolify with no code change.

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
| `/tools/` | The deterministic engines |
| `/tools/gpu-compute/` | GPU TCO Analyzer — local build vs. cloud lease |
| `/tools/master-asset-tco/` | Master Asset & Software TCO Calculator — build vs. buy |
| `/tools/agentic-workflow-breakeven/` | Agentic Workflow Breakeven Calculator — the verification cliff |
| `/tools/warehouse-slotting-payback/` | Slotting and automation payback on the buyer's baseline |
| `/tools/inventory-record-accuracy/` | Dead cash in buffer stock the records force you to hold |
| `/tools/total-delivered-cost/` | Price to contribution through duty, freight and returns |
| `/tools/parcel-dim-weight/` | Billable weight, the divisor and the recoverable surcharge |
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
