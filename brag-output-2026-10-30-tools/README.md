# Tool films — the five standard engines

Built with the `/brag` skill: one composition, five renders. Every figure is the engine's default
scenario, so a film cannot claim something the page does not produce.

Render at **3840×2160, 10 Mbps** (`brag-4k.mp4`). The first pass shipped 1080p at 703 kbps, which
YouTube re-encoded on top of an already-soft master; hairline monospace type smeared. The composition
still authors at 1920×1080 — the stage carries `transform: scale(2)` and the root canvas is 4K, so a
design change is still a design change at one scale.

| Film | Length | Voice (Kokoro) | Music | Files |
| --- | --- | --- | --- | --- |
| [agentic-workflow-breakeven](agentic-workflow-breakeven/) | 24.9s | `am_michael` | happy-beats-business-moves-vol-1 | `brag-4k.mp4` · `brag.jpg` · `composition/index.html` · `share-copy.txt` |
| [warehouse-slotting-payback](warehouse-slotting-payback/) | 23.7s | `bf_emma` | happy-beats-business-moves-vol-9 | `brag-4k.mp4` · `brag.jpg` · `composition/index.html` · `share-copy.txt` |
| [inventory-record-accuracy](inventory-record-accuracy/) | 24.1s | `af_nova` | happy-beats-business-moves-vol-11 | `brag-4k.mp4` · `brag.jpg` · `composition/index.html` · `share-copy.txt` |
| [total-delivered-cost](total-delivered-cost/) | 22.7s | `am_adam` | happy-beats-business-moves-vol-12 | `brag-4k.mp4` · `brag.jpg` · `composition/index.html` · `share-copy.txt` |
| [parcel-dim-weight](parcel-dim-weight/) | 23.5s | `bf_isabella` | happy-beats-business-moves-vol-10 | `brag-4k.mp4` · `brag.jpg` · `composition/index.html` · `share-copy.txt` |

Every film holds its final frame for three seconds of music after the last word.

**Embedding.** Upload each `brag-4k.mp4` to YouTube, then add `YouTubeEmbed` to the tool's page with the
video id; the poster is already at `public/media/tool-videos/<slug>-brag-poster.jpg`. Nothing on the
pages changes until the ids exist.

**Rebuilding.** `python3 build-videos.py [--only <slug>]` re-synthesises the narration, re-lays the
timeline from the real audio and rewrites the composition. Then `npx hyperframes check` and
`npx hyperframes render -o ../brag.mp4 --quality delivery` inside `<slug>/composition`.
