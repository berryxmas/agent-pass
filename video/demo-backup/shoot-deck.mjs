import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto('file://' + path.join(here, 'deck.html'));
for (const id of ['s1', 's2', 's3', 's4']) {
  await p.evaluate((id) => { document.querySelectorAll('.slide').forEach((s) => s.classList.toggle('on', s.id === id)); }, id);
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(here, 'out', 'deck', `${id}.png`) });
}
await b.close(); console.log('deck shot');
