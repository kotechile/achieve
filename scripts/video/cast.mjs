/**
 * Casting — which voice narrates which tool, and over which bed.
 *
 * Two rules, in tension, and both matter:
 *
 *   1. **Variety.** A catalogue where every brief is read by the same voice over the same bed reads
 *      as one asset duplicated. Voices and beds are drawn from shuffled pools with no repeat until a
 *      pool is exhausted, so no two tools in a build share a voice or a bed unless they have to.
 *
 *   2. **Reproducibility.** A render is a committed artifact; `npm run video:build` must not silently
 *      produce a different file because the RNG moved. The draw is therefore written to
 *      `content/tool-videos/<slug>/casting.json` and printed, and `--keep` replays it exactly.
 *
 * Default is a fresh draw (variety); `--keep` replays the frozen casting (reproducibility). `CAST_SEED`
 * replays a specific draw without the files, for CI.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { TOOLS } from './tools.mjs';

/** English Kokoro voices only — the narration is English and a mis-set phonemizer mangles it. */
export const VOICES = [
	'af_heart',
	'af_nova',
	'af_sky',
	'am_adam',
	'am_michael',
	'bf_emma',
	'bf_isabella',
	'bm_george'
];

/** The /brag beds vendored under assets/audio/music. */
export const BEDS = [
	'happy-beats-business-moves-vol-9-by-ende-dot-app.mp3',
	'happy-beats-business-moves-vol-10-by-ende-dot-app.mp3',
	'happy-beats-business-moves-vol-11-by-ende-dot-app.mp3',
	'happy-beats-business-moves-vol-12-by-ende-dot-app.mp3'
];

/** Mulberry32 — small, seedable, and stable across Node versions (Math.random is neither). */
function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle(list, random) {
	const out = [...list];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

export function newSeed() {
	return Number(process.env.CAST_SEED || Math.floor(Math.random() * 2 ** 31));
}

/**
 * Draw a casting for every slug. Voices and beds are dealt round-robin from independently shuffled
 * pools, so with 2 tools and 8 voices nobody shares, and with 12 tools the pools wrap evenly.
 */
export function drawCast(slugs, seed) {
	const random = rng(seed);
	const beds = shuffle(BEDS, random);

	// Gender is alternated rather than drawn freely. An unconstrained shuffle of eight voices happily
	// deals two women in a row, which is the one pairing that makes a two-video catalogue sound cast
	// by accident.
	const fem = shuffle(
		VOICES.filter((v) => v.startsWith('af_') || v.startsWith('bf_')),
		random
	);
	const masc = shuffle(
		VOICES.filter((v) => v.startsWith('am_') || v.startsWith('bm_')),
		random
	);
	let f = 0;
	let m = 0;

	return slugs.map((slug, i) => ({
		slug,
		voice:
			TOOLS[slug]?.pinnedVoice ||
			(i % 2 === 0 ? fem[f++ % fem.length] : masc[m++ % masc.length]),
		bed: TOOLS[slug]?.pinnedBed || beds[(i + 1) % beds.length], // +1: same slot would pin voice 1 to bed 1
		seed
	}));
}

export async function readCasting(dir, slug) {
	const file = join(dir, slug, 'casting.json');
	if (!existsSync(file)) return null;
	try {
		return JSON.parse(await readFile(file, 'utf8'));
	} catch {
		return null;
	}
}

export async function writeCasting(dir, cast) {
	await mkdir(join(dir, cast.slug), { recursive: true });
	await writeFile(join(dir, cast.slug, 'casting.json'), JSON.stringify(cast, null, 2) + '\n', 'utf8');
}
