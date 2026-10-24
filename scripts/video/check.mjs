#!/usr/bin/env node
/**
 * Tool-video gate — proves the embed contract, not just that a file exists.
 *
 * For every tool in `tools.mjs`: the mp4 is H.264 + AAC 48k stereo, 15–25s, has a poster and a VTT,
 * carries real audio, and is registered in `src/data/launch-videos.ts`. Exit 1 lists what is missing.
 *
 *   node scripts/video/check.mjs
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { TOOLS } from './tools.mjs';

const exec = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../..');
const MEDIA = join(ROOT, 'public/media/tool-videos');

const fails = [];
const rows = [];

for (const slug of Object.keys(TOOLS)) {
	const mp4 = join(MEDIA, `${slug}.mp4`);
	const poster = join(MEDIA, `${slug}-poster.jpg`);
	const vtt = join(MEDIA, `${slug}.vtt`);
	const comp = join(ROOT, 'content/tool-videos', slug, 'composition.html');

	if (!existsSync(mp4)) fails.push(`${slug}: no mp4 at public/media/tool-videos/${slug}.mp4`);
	if (!existsSync(poster)) fails.push(`${slug}: no poster`);
	if (!existsSync(vtt)) fails.push(`${slug}: no captions`);
	if (!existsSync(comp)) fails.push(`${slug}: no composition`);
	if (!existsSync(mp4)) continue;

	const { stdout } = await exec('ffprobe', [
		'-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4
	]);
	const j = JSON.parse(stdout);
	const v = j.streams.find((s) => s.codec_type === 'video');
	const a = j.streams.find((s) => s.codec_type === 'audio');
	const dur = Number(j.format.duration);

	if (!v || v.codec_name !== 'h264') fails.push(`${slug}: video is ${v ? v.codec_name : 'missing'}`);
	if (!a) fails.push(`${slug}: no audio stream`);
	else {
		if (a.codec_name !== 'aac') fails.push(`${slug}: audio is ${a.codec_name}`);
		if (Number(a.sample_rate) !== 48000) fails.push(`${slug}: audio rate ${a.sample_rate}`);
		if (a.channels !== 2) fails.push(`${slug}: audio channels ${a.channels}`);
	}
	if (dur < 15 || dur > 25) fails.push(`${slug}: ${dur.toFixed(2)}s outside the 15–25s window`);

	// Audio must actually be audible, not a silent stream that satisfies the codec check.
	const { stderr } = await exec('ffmpeg', [
		'-hide_banner', '-ss', '1', '-t', String(Math.max(2, dur - 2)), '-i', mp4,
		'-af', 'volumedetect', '-f', 'null', '-'
	]).catch((e) => ({ stderr: e.stderr || '' }));
	const mean = /mean_volume:\s*(-?\d+(?:\.\d+)?) dB/.exec(stderr);
	if (!mean || Number(mean[1]) < -40) {
		fails.push(`${slug}: narration looks silent (mean ${mean ? mean[1] + ' dB' : 'unmeasured'})`);
	}

	rows.push(
		`${slug.padEnd(24)} ${dur.toFixed(2)}s  ${v.width}x${v.height}  ${(Number(j.format.size) / 1e6).toFixed(1)} MB  mean ${mean ? mean[1] : '?'} dB`
	);
}

// The embed map must cover every tool the config knows about.
const map = await readFile(join(ROOT, 'src/data/launch-videos.ts'), 'utf8');
for (const slug of Object.keys(TOOLS)) {
	if (!map.includes(`'${slug}':`)) fails.push(`${slug}: missing from src/data/launch-videos.ts`);
}

console.log('tool videos');
for (const r of rows) console.log('  ' + r);

if (fails.length) {
	console.error('\nFAIL');
	for (const f of fails) console.error('  ' + f);
	process.exit(1);
}
console.log(`\nok — ${rows.length} video(s) pass the embed contract`);
