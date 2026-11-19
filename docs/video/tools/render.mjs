// Grava docs/video/index.html quadro a quadro e gera o MP4 (H.264 + trilha AAC).
//
//   node docs/video/tools/render.mjs                       → docs/video/sangueconecta-apresentacao.mp4
//   node docs/video/tools/render.mjs --stills 3,12.5,40    → PNGs de conferência em --out-dir
//
// Precisa de: dependências do repositório (npm ci, para as fontes), Playwright com Chromium e ffmpeg.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const VIDEO_DIR = path.resolve(import.meta.dirname, '..');
const ROOT = path.resolve(VIDEO_DIR, '../..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]] : null)).filter(Boolean),
);
const FPS = Number(args.fps || 30);
const WORKERS = Number(args.workers || Math.max(1, Math.min(4, os.cpus().length)));
const OUT = path.resolve(args.out || path.join(VIDEO_DIR, 'sangueconecta-apresentacao.mp4'));
const AUDIO = path.resolve(args.audio || path.join(VIDEO_DIR, 'assets/trilha.wav'));
const TMP = path.resolve(args['tmp-dir'] || path.join(os.tmpdir(), 'sangueconecta-video'));

// ---------- servidor estático mínimo (as fontes precisam de http) ----------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_BASE = `http://127.0.0.1:${server.address().port}/docs/video/index.html?render`;

// CHROMIUM_PATH aponta para outro Chromium quando o do Playwright do repositório não está instalado.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(args.scale || 1) });
  page.on('pageerror', (e) => console.error('erro na página:', e.message));
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(URL_BASE);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}

if (args.stills) {
  const dir = path.resolve(args['out-dir'] || path.join(TMP, 'stills'));
  fs.mkdirSync(dir, { recursive: true });
  const page = await openPage();
  for (const t of String(args.stills).split(',').map(Number)) {
    await page.evaluate((tt) => window.seek(tt), t);
    const f = path.join(dir, `t${String(t.toFixed(2)).padStart(6, '0')}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close(); server.close();
  process.exit(0);
}

// ---------- vídeo ----------
const probe = await openPage();
const DURATION = Number(args.duration || (await probe.evaluate(() => window.DURATION)));
await probe.close();
const FRAMES = Math.round(DURATION * FPS);
fs.mkdirSync(TMP, { recursive: true });
console.log(`${FRAMES} quadros (${DURATION}s a ${FPS} fps) em ${WORKERS} partes`);

function encodeSegment(file) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 18), '-pix_fmt', 'yuv420p', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  return { stdin: ff.stdin, done };
}

const per = Math.ceil(FRAMES / WORKERS);
const started = Date.now();
let rendered = 0;
const segments = await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const from = w * per, to = Math.min(FRAMES, from + per);
  const file = path.join(TMP, `parte-${w}.mp4`);
  const page = await openPage();
  const enc = encodeSegment(file);
  for (let f = from; f < to; f++) {
    await page.evaluate((tt) => window.seek(tt), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    rendered++;
    if (rendered % 150 === 0) {
      const el = (Date.now() - started) / 1000;
      console.log(`${rendered}/${FRAMES} quadros · ${el.toFixed(0)}s · faltam ~${((el / rendered) * (FRAMES - rendered)).toFixed(0)}s`);
    }
  }
  enc.stdin.end();
  await enc.done;
  await page.close();
  return file;
}));
await browser.close(); server.close();

const list = path.join(TMP, 'partes.txt');
fs.writeFileSync(list, segments.map((s) => `file '${s}'`).join('\n'));
const hasAudio = fs.existsSync(AUDIO);
const ffArgs = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
if (hasAudio) ffArgs.push('-i', AUDIO, '-c:a', 'aac', '-b:a', '192k', '-shortest');
ffArgs.push('-c:v', 'copy', '-movflags', '+faststart', OUT);
await new Promise((res, rej) => spawn('ffmpeg', ffArgs, { stdio: 'inherit' }).on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
console.log(`pronto: ${OUT}${hasAudio ? '' : ' (sem trilha: gere assets/trilha.wav com tools/trilha.py)'} · ${((Date.now() - started) / 1000).toFixed(0)}s`);
