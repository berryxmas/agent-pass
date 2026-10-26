// Replays a pseudo-terminal recording (record_pty.py) byte for byte in xterm.js and records the window as video.
// node record-terminal.mjs <rec.json> <out.webm> [--title T] [--slow A:B] [--fast F] [--cap C] [--hold S] [--start-at S]
//   --slow A:B  keep original timing between A and B seconds of the recording (default: everything)
//   --fast F    outside the slow window, play F times faster (default 1), with every gap capped at --cap seconds (default 0.4)
//   --hold S    keep the final frame for S seconds (default 3)
//   --end-at S  drop everything after S seconds of the recording (shows the state at that moment)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [recPath, outPath] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const title = opt('--title', 'Terminal');
const [slowA, slowB] = (opt('--slow', '0:1e9')).split(':').map(Number);
const [slowC, slowD] = (opt('--slow2', '-1:-1')).split(':').map(Number);
let slow2At = null;
const fast = Number(opt('--fast', 1)), cap = Number(opt('--cap', 0.4)), hold = Number(opt('--hold', 3));
const endAt = Number(opt('--end-at', 1e9)), startHold = Number(opt('--start-hold', 0.8));

const rec = JSON.parse(fs.readFileSync(recPath, 'utf8'));
const outs = rec.events.filter((e) => e[1] === 'out' && e[0] <= endAt);
// Re-time: inside [slowA, slowB] keep real gaps; outside, divide gaps by `fast` and cap them.
const timeline = []; let t = startHold, prev = 0;
for (const [ts, , data] of outs) {
  let gap = ts - prev; prev = ts;
  const inSlow = (ts >= slowA && ts <= slowB) || (ts >= slowC && ts <= slowD);
  if (!inSlow) gap = Math.min(gap / fast, cap);
  t += gap; timeline.push([Number(t.toFixed(3)), data]);
  if (slow2At === null && ts >= slowC && slowC >= 0) slow2At = t;
}
const total = t + hold;
console.log(`events ${outs.length}, recording ${prev.toFixed(1)}s -> video ${total.toFixed(1)}s; second slow window starts at ${slow2At === null ? 'n/a' : slow2At.toFixed(1)}s`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: path.join(here, 'out', 'tmpvideo'), size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
await page.addInitScript(({ rec, title }) => { window.REC = rec; window.TITLE = title; }, { rec: { cols: rec.cols, rows: rec.rows }, title });
await page.goto('file://' + path.join(here, 'replay.html'));
await page.waitForFunction(() => window.READY);
await page.waitForTimeout(300);
const played = await page.evaluate((tl) => window.play(tl), timeline);
await page.waitForTimeout(hold * 1000);
const video = page.video();
await ctx.close();
const tmp = await video.path();
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.renameSync(tmp, outPath);
await browser.close();
console.log(`played ${played.toFixed(1)}s -> ${outPath}`);
