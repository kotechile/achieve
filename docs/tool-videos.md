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
3. **Casting** — voice and bed are drawn per build by `cast.mjs`, not pinned in config: shuffled
   pools (8 English Kokoro voices, 4 beds), no repeat within a build until a pool wraps, and gender
   alternates across tools so a two-video catalogue is not read twice by the same kind of voice.
   Every build re-rolls; `npm run video:build -- --keep` replays the frozen draw instead, and
   `CAST_SEED=<n>` reproduces one exactly. The draw lands in `content/tool-videos/<slug>/casting.json`
   (committed) so any committed mp4 can be traced back to the voice and bed that made it.
   Pin a tool by adding `pinnedVoice` / `pinnedBed` to its entry in `tools.mjs` — the exception, not
   the rule.
4. **Voice** — Kokoro-82M through `hyperframes tts`, the same voice set `/brag` uses, at 0.95x (re-cut
   at 1.08x if a slower voice would push the video past the 25s ceiling). Needs the HyperFrames CLI on
   PATH plus a Python env for it:
   `HYPERFRAMES_PYTHON=~/.venvs/kokoro/bin/python` with `PYTHONPATH` **unset** — an active venv on
   `PYTHONPATH` shadows kokoro's own packages and the synth dies. Set `TTS_CMD` to any command that
   reads `$TTS_TEXT` and writes `$TTS_OUT` to bypass it entirely.
   The music beds are `/brag`'s bundled "Happy Beats / Business Moves" tracks, vendored under
   `assets/audio/music/` so a clean clone can rebuild without the skill installed.
5. **Length** — the take sets the clock: `duration = take + 1.6s`, clamped to 15–25s, and the scene
   windows are fractions of it. A longer script makes a longer video instead of getting cut.
6. **Render** — `render.mjs` drives headless Chrome over CDP using Node's built-in `fetch` and
   `WebSocket`. No browser-automation package, no new dependency: it is the same Chrome + ffmpeg the
   repo's audit scripts already require.
7. **Mix** — narration and bed are summed, not concatenated: voice normalised to −16 LUFS, bed at
   0.34 with 0.4s in / 1.2s out fades, sidechain-ducked 3:1 under the voice (threshold 0.05, attack
   20ms, release 350ms), the sum normalised to −14 LUFS / −1.5 TP, AAC 192k 48k stereo, `+faststart`,
   and deliberately **no** `-shortest`: that flag is what silently cuts narration mid-word.

   Two gotchas worth keeping in the graph. The voice is `apad`-ed to the full length, because
   `sidechaincompress` stops consuming the bed the moment its key signal ends and silently truncates
   the music tail. And the voice is `asplit` before the sidechain, because an ffmpeg filter output can
   only be consumed once.

## The gate

`npm run video:check` fails the build if any tool is missing an mp4, poster or captions; if the
streams are anything other than H.264 + AAC 48k stereo; if the duration falls outside 15–25s; if the
mix is silent or sits outside −22…−10 dB; if the **music** is missing from the window after the voice
stops (a narration-only mix passes every codec check); or if the embed map does not mention the tool.

## Adding a tool

Add an entry to `scripts/video/tools.mjs`, run `npm run video:build -- <slug>`, then pass the slug to
`CalculatorShell` (`<CalculatorShell slug="my-tool" …>`). A tool with no entry renders nothing — the
page never advertises a video that does not exist.

## Figures on screen

Every number in a video must be reproducible from the product it describes. `gpu-compute` shows the
analyzer's own default output ($32,797 owned vs $7,358 rented over 36 months). `decision-intelligence`
deliberately shows **no** comparison bars: its result is entirely a function of the reader's inputs, so
the template falls back to cost buckets rather than inventing a ratio.

## Publishing options: self-hosted mp4 vs YouTube

Two embed paths, one component. A tool with a `youtubeId` gets a `youtube-nocookie` iframe; without
one it keeps the self-hosted `<video>`. Nothing else in the pipeline changes.

### YouTube (manual, no OAuth)

1. Upload the rendered mp4 from `public/media/tool-videos/<slug>.mp4` to the channel.
2. Drop the id in `content/tool-videos/<slug>/youtube.json`:

   ```json
   { "id": "dQw4w9WgXcQ" }
   ```

3. `npm run video:build -- --embed-only` — re-derives `src/data/launch-videos.ts` without re-rendering.
4. `npm run build`.

The mp4 and poster stay on disk as the source of truth either way, so switching back is deleting the
json and re-running the same command.

### Which is actually leaner

At two tools the media is **1.8 MB of an 8.8 MB `dist/`**. Self-hosting one click-to-load mp4 costs a
range request to nginx; there is no third-party runtime, no cookie consent surface, no re-encode, and
the poster alone (≈50 KB) is what loads before a click. YouTube is leaner on *bytes served by the VPS*
and heavier on everything else: an iframe plus the YouTube player on click, Google-side cookies
isolated by the nocookie domain, and a 16:9 thumbnail the page no longer controls.

YouTube earns its place when the catalogue gets large, when traffic makes egress the top line, or when
you want the video discoverable on the channel — not to save 900 KB per tool.

### If you want it automated later

The Data API upload path needs OAuth (`youtube.upload` scope), costs **1,600 quota units per upload**
against a 10,000/day default, so about six uploads a day, and the endpoint is resumable with a
200/201 + `id` read-back as the only success signal. That is real machinery for a two-video catalogue;
the manual loop above is three commands and no stored credentials.
