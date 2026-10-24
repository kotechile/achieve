#!/usr/bin/env node
/**
 * Tool-video build — compose → narrate → TTS → measure → render → mix → poster → embed data.
 *
 *   node scripts/video/build.mjs                 # every tool in scripts/video/tools.mjs
 *   node scripts/video/build.mjs gpu-compute     # one tool
 *
 * GATES (each one fails the build, none is advisory):
 *   1. narration length 35–55 words            — a 14s slot holds a sentence, not a paragraph
 *   2. measured audio ≤ video − 0.5s           — otherwise the mix cuts speech mid-word
 *   3. output probes as H.264 + AAC 48k stereo — the embed cannot fix a mono/44k stream
 *   4. poster is a settled frame               — frame 0 is blank by design
 *
 * TTS is macOS `say` (offline, no key). Swap it for Kokoro or ElevenLabs by setting TTS_CMD to a
 * command that reads text on stdin and writes the path in $TTS_OUT; nothing downstream assumes `say`.
 */
import { execFile } from 'node:child_process';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { TOOLS } from './tools.mjs';
import { composeHtml } from './compose.mjs';
import { renderFrames } from './render.mjs';

const exec = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../..');
const WORK = join(ROOT, 'content/tool-videos');
const MEDIA = join(ROOT, 'public/media/tool-videos');
const FPS = 24;
const MIN_MS = 15000;
const MAX_MS = 25000;
const TAIL_MS = 1600;

const log = (...a) => console.log(...a);

async function tts(text, voice, outMp3) {
	const aiff = outMp3.replace(/\.mp3$/, '.aiff');
	if (process.env.TTS_CMD) {
		await exec('bash', ['-lc', process.env.TTS_CMD], { env: { ...process.env, TTS_TEXT: text, TTS_OUT: outMp3 } });
	} else {
		await exec('say', ['-v', voice, '-r', '168', '-o', aiff, text]);
		await exec('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '48000', '-ac', '1', '-b:a', '192k', outMp3]);
		await rm(aiff, { force: true });
	}
	const { stdout } = await exec('ffprobe', [
		'-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', outMp3
	]);
	return Number(stdout.trim());
}

async function mux(framesDir, audio, outMp4) {
	// Video is the timeline; audio is normalised and never trimmed. `-shortest` is deliberately absent:
	// it is what silently cuts narration when the take runs long.
	await exec('ffmpeg', [
		'-y', '-loglevel', 'error',
		'-framerate', String(FPS), '-i', join(framesDir, 'frame-%04d.jpg'),
		'-i', audio,
		'-filter_complex', '[1:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]',
		'-map', '0:v:0', '-map', '[a]',
		'-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
		'-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
		'-movflags', '+faststart',
		outMp4
	]);
}

async function probe(mp4) {
	const { stdout } = await exec('ffprobe', [
		'-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4
	]);
	const j = JSON.parse(stdout);
	const v = j.streams.find((s) => s.codec_type === 'video');
	const a = j.streams.find((s) => s.codec_type === 'audio');
	return {
		width: v.width,
		height: v.height,
		fps: v.r_frame_rate,
		videoCodec: v.codec_name,
		audioCodec: a ? a.codec_name : null,
		audioRate: a ? Number(a.sample_rate) : null,
		audioChannels: a ? a.channels : null,
		durationSec: Number(j.format.duration),
		bytes: Number(j.format.size)
	};
}

function stamp(sec) {
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = (sec % 60).toFixed(2).padStart(5, '0');
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s}`;
}

async function buildOne(slug) {
	const tool = TOOLS[slug];
	if (!tool) throw new Error('unknown tool: ' + slug);
	const dir = join(WORK, slug);
	await mkdir(dir, { recursive: true });
	await mkdir(MEDIA, { recursive: true });

	// 1. composition + narration, both deterministic from config
	const compPath = join(dir, 'composition.html');
	const words = tool.narration.trim().split(/\s+/).filter(Boolean).length;
	await writeFile(join(dir, 'narration.txt'), tool.narration.trim() + '\n', 'utf8');
	if (words < 35 || words > 55) {
		throw new Error(`${slug}: narration is ${words} words (gate: 35–55)`);
	}
	log(`  compose   ${slug} — ${words} words narration`);

	// 2. voice, measured
	const audio = join(dir, 'take.mp3');
	const audioSec = await tts(tool.narration, tool.voice, audio);
	// Length follows the take: the voice sets the clock, not a hard-coded 14s.
	const durationMs = Math.min(
		MAX_MS,
		Math.max(MIN_MS, Math.round(((audioSec * 1000 + TAIL_MS) / 500)) * 500)
	);
	if (audioSec > durationMs / 1000 - 0.5) {
		throw new Error(`${slug}: narration ${audioSec.toFixed(2)}s exceeds the ${(durationMs / 1000 - 0.5).toFixed(1)}s budget`);
	}
	await writeFile(compPath, composeHtml(tool, durationMs), 'utf8');
	log(`  narrate   ${audioSec.toFixed(2)}s → ${(durationMs / 1000).toFixed(1)}s video`);

	// 3. frames
	const framesDir = join(dir, 'frames');
	const r = await renderFrames({ composition: compPath, outDir: framesDir, fps: FPS, durationMs });
	log(`  render    ${r.frames} frames @${FPS}fps ${r.width}x${r.height}`);

	// 4. mix + poster
	const mp4 = join(MEDIA, `${slug}.mp4`);
	await mux(framesDir, audio, mp4);
	const poster = join(MEDIA, `${slug}-poster.jpg`);
	await exec('ffmpeg', [
		'-y', '-loglevel', 'error', '-ss', String(((durationMs * 0.62) / 1000).toFixed(2)), '-i', mp4,
		'-frames:v', '1', '-q:v', '3', poster
	]);
	await rm(framesDir, { recursive: true, force: true });

	// Captions: the narration, proportioned across its measured duration (no forced aligner needed —
	// the voice IS the audio track, so cue order and total length are known exactly).
	const sentences = tool.narration.split(/(?<=[.?])\s+/).filter(Boolean);
	const wordTotal = sentences.reduce((n, x) => n + x.trim().split(/\s+/).length, 0);
	let cursor = 0.25;
	const cues = sentences.map((text, i) => {
		const share = (text.trim().split(/\s+/).length / wordTotal) * audioSec;
		const start = cursor;
		const end = i === sentences.length - 1 ? audioSec : cursor + share;
		cursor = end;
		return `${i + 1}\n${stamp(start)} --> ${stamp(end)}\n${text.trim()}\n`;
	});
	await writeFile(
		join(MEDIA, `${slug}.vtt`),
		'WEBVTT\n\n' + cues.join('\n'),
		'utf8'
	);

	const meta = await probe(mp4);
	if (meta.videoCodec !== 'h264') throw new Error(`${slug}: video is ${meta.videoCodec}, expected h264`);
	if (meta.audioCodec !== 'aac' || meta.audioRate !== 48000 || meta.audioChannels !== 2) {
		throw new Error(`${slug}: audio is ${meta.audioCodec}/${meta.audioRate}/${meta.audioChannels}, expected aac/48000/2`);
	}
	log(`  mix       ${meta.durationSec.toFixed(2)}s ${meta.width}x${meta.height} ${(meta.bytes / 1e6).toFixed(1)} MB`);

	return { slug, ...meta, audioSec, poster, mp4, words };
}

async function writeEmbedData(built) {
	const rows = built
		.sort((a, b) => a.slug.localeCompare(b.slug))
		.map(
			(v) => `	'${v.slug}': {
		src: '/media/tool-videos/${v.slug}.mp4',
		poster: '/media/tool-videos/${v.slug}-poster.jpg',
		width: ${v.width},
		height: ${v.height},
		durationSec: ${v.durationSec.toFixed(2)},
		captions: '/media/tool-videos/${v.slug}.vtt'
	}`
		)
		.join(',\n');

	const ts = `/**
 * Tool videos — GENERATED by scripts/video/build.mjs. Do not edit by hand.
 *
 * Keyed by calculator slug. A tool with no entry renders no video; the page must not invent one.
 * Regenerate with \`npm run video:build\` (or \`npm run video:build -- <slug>\`).
 */
export interface ToolVideoEntry {
	src: string;
	poster: string;
	width: number;
	height: number;
	durationSec: number;
	captions?: string;
}

export const TOOL_VIDEOS: Record<string, ToolVideoEntry> = {
${rows}
};

export function getToolVideo(slug: string): ToolVideoEntry | null {
	return TOOL_VIDEOS[slug] ?? null;
}
`;
	await writeFile(join(ROOT, 'src/data/launch-videos.ts'), ts, 'utf8');
}

const only = process.argv.slice(2);
const slugs = only.length ? only : Object.keys(TOOLS);
const built = [];
for (const slug of slugs) {
	log(`▸ ${slug}`);
	built.push(await buildOne(slug));
}

// A partial run must not drop the other tools from the embed map: probe any existing render and
// carry it forward, so `-- <slug>` is a safe incremental rebuild rather than a destructive one.
for (const slug of Object.keys(TOOLS)) {
	if (built.some((b) => b.slug === slug)) continue;
	const mp4 = join(MEDIA, `${slug}.mp4`);
	if (!existsSync(mp4)) continue;
	const meta = await probe(mp4);
	built.push({ slug, ...meta, audioSec: 0, poster: join(MEDIA, `${slug}-poster.jpg`), mp4, words: 0 });
	log(`  carry     ${slug} (${meta.durationSec.toFixed(2)}s, already rendered)`);
}

await writeEmbedData(built);
log(`\nwrote src/data/launch-videos.ts (${built.length} video${built.length === 1 ? '' : 's'})`);
for (const b of built) {
	log(`  ${b.slug}: ${b.durationSec.toFixed(2)}s, ${(b.bytes / 1e6).toFixed(1)} MB, poster ${b.poster.split('/').pop()}`);
}
