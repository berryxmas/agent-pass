// Records the live sites headless, with a drawn cursor, one clip per shot.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const CURSOR = `
  const c = document.createElement('div'); c.id = '__cur';
  c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:30px;z-index:2147483647;pointer-events:none;transition:transform .55s cubic-bezier(.2,.7,.2,1);transform:translate(640px,420px)';
  c.innerHTML = '<svg viewBox="0 0 22 30" width="22" height="30"><path d="M2 2 L2 23 L7.5 18 L11 27 L15 25.5 L11.5 17 L19 17 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.documentElement.appendChild(c);
  window.__cursor = (x, y) => { c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  window.__click = () => { c.animate([{ transform: c.style.transform + ' scale(1)' }, { transform: c.style.transform + ' scale(.8)' }, { transform: c.style.transform + ' scale(1)' }], { duration: 220 }); };
`;
async function clip(name, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: path.join(here, 'out', 'tmpvideo'), size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  const cursor = async (x, y, click = false) => { await page.evaluate(([x, y]) => window.__cursor(x, y), [x, y]); await page.waitForTimeout(650); if (click) { await page.evaluate(() => window.__click()); await page.mouse.click(x + 2, y + 2); } };
  const inject = () => page.evaluate(CURSOR).catch(() => {});
  await fn(page, cursor, inject);
  const video = page.video(); await ctx.close();
  const out = path.join(here, 'out', 'clips', `${name}.webm`); fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.renameSync(await video.path(), out); await browser.close(); console.log('clip', name);
}
const smoothScroll = async (page, y, ms) => { await page.evaluate(([y, ms]) => new Promise((r) => { const s = window.scrollY, t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / ms); const e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k; window.scrollTo(0, s + (y - s) * e); if (k < 1) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }), [y, ms]); };

if (!process.env.ONLY) await clip('site', async (page, cursor, inject) => {
  await page.goto('https://agent-pass-sample.vercel.app', { waitUntil: 'networkidle' }); await inject();
  await page.waitForTimeout(1500); await cursor(640, 280); await page.waitForTimeout(800);
  await smoothScroll(page, 520, 2200); await page.waitForTimeout(1600); await smoothScroll(page, 0, 1500); await page.waitForTimeout(1500);
});

if (!process.env.ONLY) await clip('dashboard', async (page, cursor, inject) => {
  await page.goto('https://agent-pass-sample.vercel.app/agent-pass', { waitUntil: 'networkidle' }); await inject();
  await page.waitForTimeout(2500); await cursor(300, 210); await page.waitForTimeout(800); await cursor(560, 210); await page.waitForTimeout(600); await cursor(1010, 210); await page.waitForTimeout(900);
  await smoothScroll(page, 560, 2000); await page.waitForTimeout(2200); await cursor(640, 400); await page.waitForTimeout(1500);
});

await clip('explorer', async (page, cursor, inject) => {
  await page.goto('https://agent-pass-sample.vercel.app/agent-pass', { waitUntil: 'networkidle' }); await inject();
  await page.waitForTimeout(2000); await smoothScroll(page, 560, 1600); await page.waitForTimeout(1200);
  const link = page.locator('table a[href*="/tx/"]').first();
  const href = await link.getAttribute('href'); const box = await link.boundingBox();
  await cursor(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(600);
  await page.evaluate(() => window.__click()); await page.waitForTimeout(300);
  await page.goto(href, { waitUntil: 'domcontentloaded' }); await inject(); await page.waitForTimeout(3500);
  await cursor(150, 214); await page.waitForTimeout(2500);
  fs.writeFileSync(path.join(here, 'out', 'clips', 'explorer-link.txt'), href);
});
