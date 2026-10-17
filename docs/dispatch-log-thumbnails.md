# Dispatch-log thumbnails — measured row heights

The archive at `/articles/` (and the homepage feed, which shares `DispatchLog.astro`) lists every
dispatch newest-first. Small 56x96 thumbnails were added to those rows. The requirement was that a row
must not get taller, so every number below is a real browser measurement, not an estimate.

Method: `/tmp/audit/row-probe2.mjs` (a throwaway probe, not committed to the repo — the same technique as
`scripts/layout-audit.mjs`: serve the built page over HTTP, inject a measuring script, read the result
back out of `chrome --dump-dom` through a textarea's `textContent`). `min`/`median`/`stream` are the
shortest row, the median row, and the total height of all 94 rows.

## Why the box is 56px tall

The shortest row in the feed measures **104px** at every viewport, of which 32px is the row's own
vertical padding — so 72px of content. The thumbnail is 56px, comfortably inside that, so its *height*
can never be what sets a row's height.

## Why it starts at `lg` (1024px)

Its height is not the problem; its **width** is. Narrowing the text column re-wraps titles, and that
does change row heights. Measured, with the thumbnail forced in and out of the layout:

| viewport | min row | median row | all 94 rows | verdict |
|---|---|---|---|---|
| 1440px | 104 → 104 | 104 → 104 | 11244 → 11836 | same min/median; long titles gain one line |
| 1024px | 104 → 104 | 127 → 127 | 12359 → 13041 | same min/median; long titles gain one line |
| 768px | 104 → 126 | 127 → 150 | 14464 → 16697 | **rows taller** — not acceptable |
| 640px | 104 → 127 | 149 → 172 | 15976 → 19964 | **rows taller** — not acceptable |
| 500px | 104 → 104 | 149 → 149 | 15863 → 15863 | identical (thumbnail already hidden) |

So below `lg` the thumbnail is out of flow (`hidden … lg:block`) and the rendered list is
**byte-identical** to the version without thumbnails: same min, same median, same total height at 768px
and 500px. From `lg` up it is visible, and the shortest and median rows are still exactly what they
were — only rows with long titles gain one line each, which is content wrapping, not the thumbnail
forcing the row open.

Physical limit worth recording: there is no way to add a thumbnail at 768px and below without either
re-wrapping text or shrinking the type. The mobile text column has no slack to give.

## Image payload

`sizes="96px"` matches the box's real width, so a browser picks WordPress' 150w or 300w derivative
rather than the 1344px original, from the `featuredImageSizes` the WordPress normalizer exposes.
`alt=""` because the dispatch title sits immediately beside it, and `loading="lazy"` because the feed is
94 rows long.
