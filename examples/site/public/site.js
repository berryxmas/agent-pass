// Search, category chips, the icon panel and Copy SVG. The grid is already on the page.
const q = document.getElementById('q');
const grid = document.getElementById('grid');
const title = document.getElementById('grid-title');
const empty = document.getElementById('empty');
const tiles = [...grid.querySelectorAll('.tile')];
const chips = [...document.querySelectorAll('.chip')];
const detail = document.getElementById('detail');
let category = 'All';
let selected = null;

function apply() {
  const s = q.value.trim().toLowerCase();
  let shown = 0;
  for (const t of tiles) {
    const hit =
      (category === 'All' || t.dataset.category === category) &&
      (!s || t.dataset.name.toLowerCase().includes(s) || t.dataset.id.includes(s) || t.dataset.category.toLowerCase() === s);
    t.hidden = !hit;
    shown += hit ? 1 : 0;
  }
  title.textContent = s ? `${shown} icon${shown === 1 ? '' : 's'} for “${q.value.trim()}”` : category === 'All' ? 'Popular this week' : category;
  empty.hidden = shown > 0;
}

q.addEventListener('input', apply);
for (const c of chips) {
  c.addEventListener('click', () => {
    category = c.dataset.category;
    chips.forEach((x) => x.classList.toggle('is-active', x === c));
    apply();
  });
}

async function open(tile) {
  selected = tile.dataset.id;
  tiles.forEach((t) => t.classList.toggle('is-selected', t === tile));
  const art = tile.querySelector('.tile-art');
  document.getElementById('detail-name').textContent = tile.dataset.name;
  document.getElementById('detail-category').textContent = tile.dataset.category;
  const big = document.getElementById('detail-art');
  big.style.background = art.style.background;
  big.style.color = art.style.color;
  big.innerHTML = art.innerHTML;
  document.getElementById('download').href = `/icons/${selected}.svg`;
  const code = document.getElementById('detail-code');
  code.textContent = '…';
  detail.hidden = false;
  const res = await fetch(`/icons/${selected}.svg`);
  if (selected === tile.dataset.id) code.textContent = await res.text();
}

for (const t of tiles) t.addEventListener('click', () => open(t));
document.getElementById('detail-close').addEventListener('click', () => {
  detail.hidden = true;
  selected = null;
  tiles.forEach((t) => t.classList.remove('is-selected'));
});

const copy = document.getElementById('copy');
copy.addEventListener('click', async () => {
  const svg = document.getElementById('detail-code').textContent;
  try {
    await navigator.clipboard.writeText(svg);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('detail-code'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }
  copy.classList.add('is-done');
  copy.querySelector('span').textContent = 'Copied!';
  setTimeout(() => {
    copy.classList.remove('is-done');
    copy.querySelector('span').textContent = 'Copy SVG';
  }, 1600);
});
