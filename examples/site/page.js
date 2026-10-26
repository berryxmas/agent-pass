// The storefront page, rendered on the server so it reads without JavaScript.
import { CATEGORIES, ICONS } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function page({ price, ttlSeconds }) {
  const hours = ttlSeconds / 3600;
  const passLength = hours >= 1 ? `${hours === 1 ? 'an hour' : `${hours} hours`}` : `${Math.round(ttlSeconds / 60)} minutes`;
  const tiles = ICONS.map(
    (i) => `<button class="tile" type="button" data-id="${i.id}" data-name="${esc(i.name)}" data-category="${i.category}">
        <span class="tile-art" style="background:${i.bg};color:${i.fg}">${i.svg}</span>
        <span class="tile-name">${esc(i.name)}</span>
      </button>`,
  );
  const chips = CATEGORIES.map((c, n) => `<button class="chip${n === 0 ? ' is-active' : ''}" type="button" data-category="${c}">${c}</button>`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Marta Icons · hand-drawn icons for brighter products</title>
<meta name="description" content="${ICONS.length} hand-drawn icons made in Lisbon. SVG, PNG and Figma. Free for personal projects. AI agents pay ${price} USDC for ${passLength}.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23ffcf4a'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-family='Inter,Arial,sans-serif' font-weight='800' font-size='18' fill='%232b2118'%3EM%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="nav">
  <a class="logo" href="/marta">M</a>
  <a class="brand" href="/marta">Marta Icons</a>
  <nav>
    <a href="/marta" class="is-current">Icons</a>
    <a href="#packs">Packs</a>
    <a href="#illustrations">Illustrations</a>
    <a href="#pricing">Pricing</a>
  </nav>
  <span class="nav-right">
    <a href="#sign-in">Sign in</a>
    <a class="pro" href="#pricing">Get Pro</a>
  </span>
</header>

<main>
  <section class="hero">
    <h1>2,140 hand-drawn icons for brighter products.</h1>
    <p>Made in Lisbon. SVG, PNG and Figma. Free for personal projects.</p>
    <form class="search" role="search" onsubmit="return false">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="q" type="search" placeholder="Search icons, e.g. sun, coffee, tram" autocomplete="off" aria-label="Search icons">
    </form>
    <div class="chips">${chips.join('')}</div>
  </section>

  <section class="grid-wrap">
    <div class="grid-head">
      <strong id="grid-title">Popular this week</strong>
      <span>Sorted by popularity</span>
    </div>
    <div class="grid" id="grid">${tiles.join('')}</div>
    <p class="empty" id="empty" hidden>No icon matches that. Try “sun”, “coffee” or “tram”.</p>
  </section>

  <aside class="detail" id="detail" hidden>
    <div class="detail-head">
      <strong id="detail-name"></strong>
      <button class="detail-close" id="detail-close" type="button" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="detail-art" id="detail-art"></div>
    <div class="detail-tags"><span id="detail-category"></span><span>Hand-drawn</span><span>24 px</span></div>
    <div class="detail-actions">
      <button class="btn btn-primary" id="copy" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span>Copy SVG</span>
      </button>
      <a class="btn" id="download" href="/icons/sun.svg" download>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5"/></svg>
        SVG
      </a>
    </div>
    <pre class="code" id="detail-code"></pre>
  </aside>
</main>

<footer class="foot">
  <span>Marta Icons · Lisbon</span>
  <span class="foot-agents">
    AI agents pay ${price} USDC for ${passLength} at <code>GET /agent/icons?q=sun</code>
    · <a href="/agent-pass">Sales dashboard</a> · <a href="/">Agent Pass</a>
  </span>
</footer>

<script src="/site.js" defer></script>
</body>
</html>`;
}
