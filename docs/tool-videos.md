# Tool briefs — generated video per calculator

Every calculator page carries a 19–22s narrated brief. It is generated, not hand-authored: one
template, one config entry per tool, and the page embeds it automatically.

## Run it

```bash
npm run video:build              # every tool in scripts/video/tools.mjs
npm run video:build -- gpu-compute   # one tool; the others are carried forward, not dropped
npm run video:check              # the embed contract (see below)
```

Outputs, all committed except the frames:

```
content/tool-videos/<slug>/composition.html   provenance: the exact HTML that rendered
content/tool-videos/<slug>/narration.txt      the spoken script
public/media/tool-videos/<slug>.mp4           1280x720, 24fps, H.264 + AAC 48k stereo
public/media/tool-videos/<slug>-poster.jpg    settled frame at 62% of the timeline
public/media/tool-videos/<slug>.vtt           captions, derived from the narration
src/data/launch-videos.ts                     GENERATED embed map
```

## How it works

1. **Compose** — `compose.mjs` writes one self-contained HTML composition. Every scene is a pure
   function of `t`: `window.__seek(ms)` sets opacity, offset and bar width directly, with no CSS
   animation and no clock, so the same millisecond always yields the same pixels.
2. **Narrate** — the script lives in `tools.mjs`, 35–55 words, first person. A gate rejects anything
   outside that window.
3. **Voice** — macOS `say` at 168 wpm, converted to 48k mono. This is the only host dependency in the
   chain. Set `TTS_CMD` to any command that reads `$TTS_TEXT` and writes `$TTS_OUT` to swap in Kokoro
   or ElevenLabs without touching anything downstream.
4. **Length** — the take sets the clock: `duration = take + 1.6s`, clamped to 15–25s, and the scene
   windows are fractions of it. A longer script makes a longer video instead of getting cut.
5. **Render** — `render.mjs` drives headless Chrome over CDP using Node's built-in `fetch` and
   `WebSocket`. No Puppeteer, no HyperFrames, no new dependency: it is the same Chrome + ffmpeg the
   repo's audit scripts already require.
6. **Mix** — `loudnorm` to −14 LUFS / −1.5 TP, AAC 192k, `+faststart`, and deliberately **no**
   `-shortest`: that flag is what silently cuts narration mid-word when a take runs long.

## The gate

`npm run video:check` fails the build if any tool is missing an mp4, poster or captions; if the
streams are anything other than H.264 + AAC 48k stereo; if the duration falls outside 15–25s; if the
mix measures below −40 dB (a silent stream still satisfies a codec check); or if the embed map does
not mention the tool.

## Adding a tool

Add an entry to `scripts/video/tools.mjs`, run `npm run video:build -- <slug>`, then pass the slug to
`CalculatorShell` (`<CalculatorShell slug="my-tool" …>`). A tool with no entry renders nothing — the
page never advertises a video that does not exist.

## Figures on screen

Every number in a video must be reproducible from the product it describes. `gpu-compute` shows the
analyzer's own default output ($32,797 owned vs $7,358 rented over 36 months). `decision-intelligence`
deliberately shows **no** comparison bars: its result is entirely a function of the reader's inputs, so
the template falls back to cost buckets rather than inventing a ratio.
