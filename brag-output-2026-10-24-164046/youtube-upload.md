# YouTube upload kit — GPU TCO Analyzer launch film

**Live:** https://youtu.be/tKbJ4W91Xfw (id `tKbJ4W91Xfw`, channel GiniLoh)
**Embedded on:** `/tools/gpu-compute/` via `src/components/YouTubeEmbed.astro` (nocookie, click-to-load)

> Uploaded title carries literal backslashes — it reads `A \$16,000 GPU costs \$32,797` in the
> oEmbed payload, i.e. markdown escaping pasted into the title field. Fix in YouTube Studio →
> Details → Title; the embed does not care, but search results and shares will show them.

Video: `brag.mp4` (1920x1080, 22.2s, AAC 192k, -16.9 LUFS)
Thumbnail: `brag.jpg` (1920x1080, 145 KB — already the video's frame 0, so the
channel thumbnail matches the first frame exactly)

## Title (67 chars)

A $16,000 GPU costs $32,797 over three years — GPU TCO Analyzer

## Description

One RTX PRO 6000 Blackwell at street price, run 6 hours a day for 36 months:
$32,797 owned against $7,358 rented on Hyperstack. $13,500 of the owned side is
the NVIDIA AI Enterprise licence — 79% of the hardware, and the line almost
nobody puts in the comparison.

Model your own scenario — hours, tariff, resale, AI Enterprise seats, fleet size,
and the break-even utilisation where owning stops paying:

https://aichieve.net/tools/gpu-compute/

Deterministic, runs in your browser, nothing leaves the page.

Scenario shown: 1x RTX PRO 6000 Blackwell (96GB ECC) at $16,000 street vs list
$8,565; 108 hrs/month; $0.12/kWh; 5% cost of capital; 20% three-year resale;
NVAIE at $4,500/GPU/yr; Hyperstack 1x at $1.80/hr plus $0.10/GB/mo storage.
Change any input and the verdict changes with it.

## Tags

gpu tco, total cost of ownership, buy vs rent gpu, nvidia ai enterprise, rtx pro
6000 blackwell, cloud gpu pricing, hyperstack, gpu cost calculator, ai
infrastructure cost, mlops budget, self-hosted ai

## Settings

- Category: Science & Technology
- Audience: not made for kids
- Language: English
- Visibility: public (or unlisted while the embed is tested)
- License: Standard YouTube licence
- Comment/embedding: allow embedding (required for the site embed)
- End screen: none needed (the film ends on the URL chip); add a "Subscribe" or
  link card only if the channel is being used for more of these

## After the upload — what I need

Either form works, they carry the same id:

- `https://www.youtube.com/watch?v=XXXXXXXXXXX`
- `https://youtu.be/XXXXXXXXXXX`
- just `XXXXXXXXXXX` (11 characters)

Then I will:

1. Swap the aside card on `src/pages/tools/gpu-compute.astro` (currently the
   hardcoded walkthrough iframe, `gYBJjWkID_I`) to the new id, using the site's
   existing `ToolVideo.astro` click-to-load facade — poster first, YouTube
   `nocookie` iframe only after the click, so the page stays as fast as it is now.
2. Update the card's label from "Walkthrough" to the film's own pitch and keep the
   22s / 1920x1080 / captioned meta line honest.
3. Run `npm run check` + `npm run build`, then push.

Optional alternative: keep the existing 1280x720 captioned tool brief and add the
film as a second card. I do not recommend it — two videos of the same tool on one
page splits attention and doubles the payload.
