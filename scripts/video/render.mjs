#!/usr/bin/env node
/**
 * Frame renderer — dependency-free.
 *
 * The composition is a pure function of time (`window.__seek(ms)`), so rendering is: open it once in
 * headless Chrome, then for each frame seek and screenshot. No animation library, no browser
 * automation package: Node 22 ships `fetch` and `WebSocket`, which is all CDP needs.
 *
 *   node scripts/video/render.mjs <composition.html> <outDir> [fps] [durationMs]
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const CHROME =
	process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const FPS = 24;
const DURATION = 14000;
const W = 1280;
const H = 720;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal CDP client over the DevTools WebSocket. */
function connect(wsUrl) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(wsUrl);
		let id = 0;
		const pending = new Map();
		ws.addEventListener('message', (ev) => {
			const msg = JSON.parse(ev.data);
			if (msg.id && pending.has(msg.id)) {
				const { ok, fail } = pending.get(msg.id);
				pending.delete(msg.id);
				msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
			}
		});
		ws.addEventListener('error', () => reject(new Error('CDP socket error')));
		ws.addEventListener('open', () =>
			resolve({
				send: (method, params = {}) =>
					new Promise((ok, fail) => {
						const mid = ++id;
						pending.set(mid, { ok, fail });
						ws.send(JSON.stringify({ id: mid, method, params }));
					}),
				close: () => ws.close()
			})
		);
	});
}

async function waitForDevtools(port, timeoutMs = 20000) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/json/version`);
			if (res.ok) return;
		} catch {
			/* not up yet */
		}
		await sleep(120);
	}
	throw new Error('Chrome DevTools did not open on port ' + port);
}

export async function renderFrames({ composition, outDir, fps = FPS, durationMs = DURATION }) {
	if (!existsSync(CHROME)) throw new Error('Chrome not found at ' + CHROME);
	await rm(outDir, { recursive: true, force: true });
	await mkdir(outDir, { recursive: true });

	const port = 9300 + Math.floor(Math.random() * 400);
	const profile = join(tmpdir(), 'toolvideo-' + randomUUID());
	const chrome = spawn(
		CHROME,
		[
			'--headless=new',
			`--remote-debugging-port=${port}`,
			`--user-data-dir=${profile}`,
			'--hide-scrollbars',
			'--force-device-scale-factor=1',
			'--disable-gpu',
			'--no-first-run',
			'--no-default-browser-check',
			'--allow-file-access-from-files',
			`--window-size=${W},${H}`,
			'about:blank'
		],
		{ stdio: 'ignore' }
	);

	try {
		await waitForDevtools(port);
		const url = 'file://' + composition + '?v=' + Date.now();
		const target = await (
			await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
		).json();
		const cdp = await connect(target.webSocketDebuggerUrl);

		await cdp.send('Page.enable');
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: W,
			height: H,
			deviceScaleFactor: 1,
			mobile: false
		});

		// Wait until the composition has mounted and reported itself ready.
		for (let i = 0; i < 100; i++) {
			const r = await cdp.send('Runtime.evaluate', {
				expression: '!!(window.__ready && window.__seek)',
				returnByValue: true
			});
			if (r.result.value) break;
			await sleep(100);
		}

		const total = Math.round((durationMs / 1000) * fps);
		for (let i = 0; i < total; i++) {
			const ms = (i * 1000) / fps;
			await cdp.send('Runtime.evaluate', {
				expression: `window.__seek(${ms.toFixed(2)})`,
				returnByValue: true
			});
			const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
			await writeFile(join(outDir, `frame-${String(i).padStart(4, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
		}

		cdp.close();
		return { frames: total, fps, width: W, height: H };
	} finally {
		chrome.kill('SIGKILL');
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const [, , compPath, outDir, fpsArg, durArg] = process.argv;
	if (!compPath || !outDir) {
		console.error('usage: render.mjs <composition.html> <outDir> [fps=24] [durationMs=14000]');
		process.exit(2);
	}
	renderFrames({
		composition: compPath,
		outDir,
		fps: Number(fpsArg || FPS),
		durationMs: Number(durArg || DURATION)
	})
		.then((r) => console.log(`rendered ${r.frames} frames @${r.fps}fps → ${outDir}`))
		.catch((e) => {
			console.error('render failed:', e.message);
			process.exit(1);
		});
}
