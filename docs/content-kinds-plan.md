# Content kinds: news vs evergreen vs review

Status: **implemented on aichieve.net** (the giniloh.com half is identical in structure).

## The problem

Both properties run a daily publishing fleet. Between 2026-06-05 and 2026-10-30 the shared
CMS accumulated 222 posts, and **198 of them landed in October alone**. A growing share of
those are dated, short-lived pieces written for a 30-day window. The durable long-form
articles — 21 posts over 2,000 words, up to 4,594 — sit at the same URL depth and decay at the
same rate in a single reverse-chronological list, because the list only knows one axis: date.

One archive cannot serve two content lifecycles. A reader looking for the standing analysis of
GPU build-vs-lease has no way to ask for it, and every new dispatch pushes it one row further
from the top.

## The data model: the CMS tag is the classifier

`post_kind` is not a new taxonomy. WordPress `post_tag` already carries a closed three-value
vocabulary, created in the CMS:

| tag | term id | meaning |
|---|---|---|
| `news` | 43 | the 30-day-freshness fleet |
| `evergreen` | 44 | the durable fleet |
| `review` | 45 | the product-review / comparison desk |

Front ends read **only these three slugs**. Any other tag is ignored, so an unrelated tag can
never reclassify a post — the vocabulary is closed in code even though the taxonomy is open.

### Why slugs are resolved to ids at build time

The WP REST `tags` query parameter accepts **term ids only**. `?tags=news` returns an empty
result set; `?tags=43` returns 96 posts. Term ids are also per-install state, not a contract, so
hardcoding `43` would break silently if the term were ever recreated.

`resolveKindTermIds()` reads `GET /wp-json/wp/v2/tags?slug=news,evergreen,review` once per
build and caches the slug → id map. If the CMS is unreachable the map is empty, the callers
return no kind-filtered posts, and the build logs it — it does not guess.

## Untagged posts are reported, not swallowed

187 of 222 posts were tagged at split time. The 35 untagged ones are overwhelmingly the
June/July 2,600–4,600-word guides that predate the tagging pass. A post with no kind tag would
appear in **neither** list and quietly vanish from navigation, which is the exact failure mode
`vertical-taxonomy.php` was written to prevent.

Rules:

1. `node scripts/routing.mjs` (part of `npm run build`) logs every untagged post and how many
   there are, and writes the counts into `src/data/kinds.generated.mjs`.
2. Untagged posts are **filed with evergreen** in `/articles/`, because that list is the
   durable library and an unfiled post is safer next to standing analysis than in a daily feed.
3. The build output names them, so the gap is visible on every deploy until it is closed.

## Routes

| route | fleet | ordering | shape |
|---|---|---|---|
| `/news/` | `news` | newest first, date is the primary key | compact date-first rows, no thumbnails |
| `/articles/` | `evergreen` + untagged | newest first, topic-filterable in place | image rows, as today |
| `/reviews/` | `review` | newest first | ships when the desk has posts |

`/reviews/` is **not** built while the term has zero posts: an empty hub that says "no reviews
yet" is worse than no hub. The nav item appears automatically once `KIND_COUNTS.review > 0`,
because the nav reads the generated counts rather than a hand-written list.

The homepage's "Latest Articles" rail becomes "Latest News" and filters to `news`, so the
newest dispatch is never behind an evergreen that happens to be newer.

## What does not change

- `/articles/<topic>/` still shows every post in that topic, news and evergreen together. A
  topic page is a record of the topic, not a fleet.
- Individual posts keep their URL shape (`/<slug>/`) and their canonical metadata.
- Ownership is unchanged: the `vertical` taxonomy still decides which property renders a post.

## Verification

- `node scripts/routing.mjs` prints the untagged list and the per-kind counts per property.
- `npm run check` and `npm run build` must pass in both repos.
- `npm run verify` probes `/news/` after the build.
- `npm run audit:layout` must stay at zero horizontal overflow at 500px on `/news/`.
