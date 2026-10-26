// The owner's dashboard: one page, served by the app itself, that reads the
// owner's real sales from the public ledger (Horizon, Stellar testnet). A sale
// is a USDC transfer to the owner's account that the owner's key then answered
// with an `issue` for the same agent in the agent_pass contract, so no database,
// no backend and no setup: the page asks Horizon from the browser and refreshes itself.
//
// The HTML lives in this file as a string so the compiled package needs no
// file reads at run time (Vercel bundles only the JavaScript it can trace).

import type { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';

export type DashboardConfig = {
  app: string; // the owner's Stellar address: paid, and the signer of every pass
  price: string; // USDC per pass
  ttlSeconds: number;
  contractId: string;
};

const HORIZON = 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const EXPLORER = 'https://stellar.expert/explorer/testnet';
// A display rate only, the same one the Agent Pass demo shows: ECB reference rate of
// 23 Oct 2026, 1 EUR = 1.1193 USD, 1 USDC counted as 1 USD. No exchange takes place.
const EUR_PER_USDC = 0.8934;

/** '30 minutes', 'one hour', '2 hours': the pass length in words. */
export function passLength(ttlSeconds: number): string {
  const unit = (n: number, one: string) => (n === 1 ? `one ${one}` : `${n} ${one}s`);
  if (ttlSeconds % 3600 === 0) return unit(ttlSeconds / 3600, 'hour');
  if (ttlSeconds % 60 === 0) return unit(ttlSeconds / 60, 'minute');
  return unit(ttlSeconds, 'second');
}

type HorizonOperation = {
  id: string;
  type: string;
  source_account: string;
  transaction_hash: string;
  transaction_successful: boolean;
  created_at: string;
  parameters?: { value: string }[];
  asset_balance_changes?: { asset_code?: string; asset_issuer?: string; from?: string; to?: string; amount: string }[] | null;
};
export type Sale = { hash: string; usdc: number; from: string; at: number };

/** The pass sales among the owner's ledger operations: each USDC payment to the owner that an
 * `issue` signed by the owner answered, for the same agent, later on the ledger. Any other USDC
 * (a gift, a test transfer, a payment whose pass failed) is not a sale. The page runs this same
 * function in the browser, so it uses only plain JavaScript. */
export function passSales(ops: HorizonOperation[], cfg: { app: string; contractId: string; usdcIssuer: string }): Sale[] {
  // A contract argument as Horizon shows it: the base64 XDR of an ScVal address.
  function addressArg(strkey: string) {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const raw: number[] = [];
    let bits = 0, value = 0;
    for (let i = 0; i < strkey.length; i++) {
      value = (value << 5) | ALPHABET.indexOf(strkey[i]);
      bits += 5;
      if (bits >= 8) { bits -= 8; raw.push((value >>> bits) & 255); value &= (1 << bits) - 1; }
    }
    // SCV_ADDRESS, then SC_ADDRESS_TYPE_CONTRACT and its hash, or SC_ADDRESS_TYPE_ACCOUNT, PUBLIC_KEY_TYPE_ED25519 and the key
    const head = strkey[0] === 'C' ? [0, 0, 0, 18, 0, 0, 0, 1] : [0, 0, 0, 18, 0, 0, 0, 0, 0, 0, 0, 0];
    return btoa(String.fromCharCode.apply(null, head.concat(raw.slice(1, 33))));
  }
  const ISSUE = 'AAAADwAAAAVpc3N1ZQAAAA=='; // the symbol `issue`
  const contract = addressArg(cfg.contractId), app = addressArg(cfg.app);
  const payments: (Sale & { id: bigint; agent: string; sold?: boolean })[] = [];
  const issues: { id: bigint; agent: string }[] = [];
  ops.forEach(function (op) {
    if (!op.transaction_successful) return;
    const p = op.parameters || [];
    if (op.source_account === cfg.app && op.type === 'invoke_host_function' && p.length === 5 &&
        p[0].value === contract && p[1].value === ISSUE && p[2].value === app) {
      issues.push({ id: BigInt(op.id), agent: p[3].value });
    }
    (op.asset_balance_changes || []).forEach(function (c) {
      if (c.asset_code === 'USDC' && c.asset_issuer === cfg.usdcIssuer && c.to === cfg.app && c.from) {
        payments.push({ id: BigInt(op.id), agent: addressArg(c.from), hash: op.transaction_hash, usdc: Number(c.amount), from: c.from, at: new Date(op.created_at).getTime() });
      }
    });
  });
  const newestFirst = function (a: { id: bigint }, b: { id: bigint }) { return a.id < b.id ? 1 : a.id > b.id ? -1 : 0; };
  issues.sort(newestFirst);
  payments.sort(newestFirst);
  const sales: Sale[] = [];
  // Each pass takes the newest payment from its agent that came before it and no other pass took.
  issues.forEach(function (issue) {
    const paid = payments.find(function (s) { return !s.sold && s.agent === issue.agent && s.id < issue.id; });
    if (paid) { paid.sold = true; sales.push({ hash: paid.hash, usdc: paid.usdc, from: paid.from, at: paid.at }); }
  });
  return sales;
}

// The brand mark, from the designer's Icon Color.svg.
const ICON =
  '<svg width="22" height="16" viewBox="0 0 278 194" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M81.9459 190.276C98.2466 193.358 114.38 191.961 130.347 186.085C146.129 180.051 160.21 169.826 172.592 155.411C184.656 141.366 191.873 122.47 194.349 105.006L147 105.006C145.908 113.381 142.504 120.895 136.79 127.548C130.916 134.386 124.015 139.056 116.085 141.558C108.155 144.06 100.148 144.409 92.0635 142.603C83.7947 140.639 75.8717 136.403 68.2947 129.895C60.7177 123.386 55.3346 116.193 52.1454 108.315C48.9563 100.437 48.0133 92.5619 49.3163 84.6887C50.4346 76.6568 53.9304 69.2219 59.8038 62.3841C65.5014 55.7509 61.8285 4.83412 69.666 2.05125C53.0165 7.63958 38.7473 17.3542 26.8585 31.1951C14.4768 45.6099 6.66536 61.0601 3.42432 77.5457C-0.00153328 93.8725 1.03872 109.86 6.54509 125.51C12.0514 141.159 21.9196 155.095 36.1497 167.318C50.1949 179.382 65.4603 187.035 81.9459 190.276Z" fill="#2767FF"/><path d="M197.777 3.6074C181.509 0.354375 165.362 1.582 149.334 7.29025C133.49 13.1592 119.302 23.2358 106.77 37.52C94.5589 51.438 87.5695 70.7536 84.9108 88.1908L131.832 88.1908C133.012 79.8272 136.494 72.3491 142.278 65.7564C148.223 58.9805 155.173 54.3832 163.129 51.9644C171.085 49.5457 179.095 49.2813 187.16 51.1712C195.408 53.2219 203.286 57.5409 210.794 64.1284C218.302 70.7158 223.61 77.965 226.716 85.8758C229.823 93.7867 230.683 101.672 229.297 109.531C228.095 117.55 224.522 124.948 218.577 131.724C212.81 138.297 215.949 189.25 208.083 191.95C224.79 186.537 239.16 176.972 251.193 163.257C263.725 148.973 271.698 133.605 275.112 117.154C278.709 100.864 277.836 84.8665 272.494 69.1605C267.152 53.4546 257.431 39.4158 243.33 27.0442C229.412 14.8334 214.227 7.0211 197.777 3.6074Z" fill="#000D2A"/></svg>';

const CSS = `
:root{--bg:#fff;--bg-subtle:#f6f8fa;--text-strong:#1a1f36;--text:#353a44;--text-2:#687385;--border:#ebeef1;--accent:#2767ff;--green:#006908;--green-bg:#d7f7c2;--radius:8px;--radius-xl:12px;--shadow-card:0 2px 5px rgba(60,66,87,.08),0 1px 1px rgba(0,0,0,.06)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1040px;margin:0 auto;padding:0 28px 48px}
.top{display:flex;align-items:center;justify-content:space-between;height:56px;border-bottom:1px solid var(--border)}
.brand{display:flex;align-items:center;gap:9px;font-weight:700;color:var(--text-strong);letter-spacing:-.01em}
.live{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-2)}
.dot{width:8px;height:8px;border-radius:50%;background:#3fb950;box-shadow:0 0 0 0 rgba(63,185,80,.5);animation:pulse 1.8s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 7px rgba(63,185,80,0)}100%{box-shadow:0 0 0 0 rgba(63,185,80,0)}}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
.head{display:flex;align-items:flex-end;justify-content:space-between;padding:28px 0 18px}
h1{margin:0;font-size:32px;line-height:40px;font-weight:700;letter-spacing:-.02em;color:var(--text-strong)}
.sub{color:var(--text-2);font-size:13px}
.card{border:1px solid var(--border);border-radius:var(--radius-xl);background:var(--bg);box-shadow:var(--shadow-card)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.kpi{padding:18px 20px}.kpi+.kpi{border-left:1px solid var(--border)}
.kpi .l{font-size:14px;color:var(--text-2)}
.kpi .v{margin-top:4px;font-size:30px;line-height:38px;font-weight:700;letter-spacing:-.02em;color:var(--text-strong);font-variant-numeric:tabular-nums}
.kpi .s{margin-top:4px;font-size:13px;color:var(--text-2)}
.flash{animation:flash .9s ease}@keyframes flash{0%{color:var(--green)}}
.sect{display:flex;align-items:baseline;justify-content:space-between;margin:28px 0 12px}
h2{margin:0;font-size:18px;line-height:26px;font-weight:700;letter-spacing:-.01em;color:var(--text-strong)}
.chart{padding:16px 20px 10px;overflow:hidden}.chart svg{display:block}
.bar{fill:var(--accent)}.bar:hover{fill:#1556f0}.grid{stroke:var(--border)}.tick{fill:var(--text-2);font-size:11px}
#rows{overflow-x:auto}table{width:100%;border-collapse:collapse}
th{text-align:left;font-weight:500;font-size:12px;color:var(--text-2);padding:10px 16px;border-bottom:1px solid var(--border)}
td{padding:11px 16px;border-bottom:1px solid var(--border);color:var(--text-strong);white-space:nowrap}
tr:last-child td{border-bottom:0}td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
.pill{display:inline-block;padding:1px 7px;border-radius:4px;background:var(--green-bg);color:var(--green);font-size:12px;font-weight:600}
.empty{padding:40px 16px;text-align:center;color:var(--text-2)}.empty strong{display:block;color:var(--text-strong);margin-bottom:4px}
.settings{display:flex;flex-wrap:wrap;gap:8px 28px;margin-top:28px;padding:14px 20px}
.settings div{font-size:13px;color:var(--text-2);min-width:0;max-width:100%}.settings b{display:block;font-weight:600;color:var(--text-strong);margin-top:2px;overflow-wrap:anywhere}
.fine{margin-top:16px;font-size:12px;color:var(--text-2)}
.err{margin-top:16px;padding:12px 16px;border-radius:var(--radius);background:#ffe7ec;color:#c0123c}
@media (max-width:760px){.kpis{grid-template-columns:1fr 1fr}.kpi:nth-child(3){border-left:0}.kpi:nth-child(n+3){border-top:1px solid var(--border)}.kpi .v{font-size:22px;line-height:30px}.wrap{padding:0 16px 32px}}
@media (max-width:560px){td:nth-child(2),th:nth-child(2),td:nth-child(4),th:nth-child(4),td .sub{display:none}td,th{padding-left:10px;padding-right:10px}}
`;

// Plain browser JavaScript: no template literals here, so this file can hold it in one.
// passSales comes in as its own source.
const JS = `
var cfg = JSON.parse(document.getElementById('cfg').textContent);
var HORIZON = cfg.horizon, EXPLORER = cfg.explorer;
var $ = function (id) { return document.getElementById(id); };
var seen = null;

function short(id) { return id.slice(0, 4) + '\\u2026' + id.slice(-4); }
function usdc(n) { return n.toFixed(n < 1 ? 3 : 2) + ' USDC'; }
function eur(n) { return '\\u20ac' + (n * cfg.eurPerUsdc).toFixed(2); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function when(ms) {
  var d = new Date(ms), now = new Date();
  var sameDay = d.toDateString() === now.toDateString();
  var t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? 'Today ' + t : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + t;
}

function fetchJson(url) {
  return fetch(url).then(function (r) {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('Horizon answered ' + r.status);
    return r.json();
  });
}

${passSales}

// The owner's latest 2000 operations, newest first: the payments in and the passes issued, about 1000 sales.
function fetchSales() {
  var ops = [];
  function page(url, left) {
    return fetchJson(url).then(function (body) {
      if (!body) return ops;
      var records = body._embedded.records;
      ops = ops.concat(records);
      if (records.length < 200 || left <= 1) return ops;
      return page(body._links.next.href, left - 1);
    });
  }
  return page(HORIZON + '/accounts/' + cfg.app + '/operations?order=desc&limit=200', 10).then(function (all) { return passSales(all, cfg); });
}

function fetchBalance() {
  return fetchJson(HORIZON + '/accounts/' + cfg.app).then(function (a) {
    if (!a) return null;
    var b = (a.balances || []).filter(function (x) { return x.asset_code === 'USDC' && x.asset_issuer === cfg.usdcIssuer; })[0];
    return b ? Number(b.balance) : 0;
  });
}

function setValue(id, text) {
  var el = $(id);
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

function renderKpis(sales, balance) {
  var total = sales.reduce(function (n, s) { return n + s.usdc; }, 0);
  var agents = {};
  sales.forEach(function (s) { agents[s.from] = true; });
  var dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  var today = sales.filter(function (s) { return s.at >= dayStart.getTime(); });
  var todayUsdc = today.reduce(function (n, s) { return n + s.usdc; }, 0);
  setValue('earned', usdc(total));
  $('earned-sub').textContent = sales.length ? eur(total) + ' at the display rate' : 'Nothing sold yet';
  setValue('passes', String(sales.length));
  $('passes-sub').textContent = today.length + ' today, ' + usdc(todayUsdc);
  setValue('agents', String(Object.keys(agents).length));
  $('agents-sub').textContent = Object.keys(agents).length === 1 ? 'distinct wallet paid you' : 'distinct wallets paid you';
  if (balance === null) { setValue('balance', '\\u2014'); $('balance-sub').textContent = 'Account not on testnet yet'; }
  else { setValue('balance', usdc(balance)); $('balance-sub').textContent = eur(balance) + ' at the display rate'; }
}

function renderChart(sales) {
  var W = Math.max(320, $('chart').clientWidth - 40), H = 220, L = 44, R = 12, T = 12, B = 28, N = 30;
  var days = [];
  var start = new Date(); start.setHours(0, 0, 0, 0);
  for (var i = N - 1; i >= 0; i--) { var d = new Date(start); d.setDate(start.getDate() - i); days.push({ date: d, usdc: 0, n: 0 }); }
  sales.forEach(function (s) {
    var day = new Date(s.at); day.setHours(0, 0, 0, 0);
    var idx = N - 1 + Math.round((day.getTime() - start.getTime()) / 864e5);
    if (idx >= 0 && idx < N) { days[idx].usdc += s.usdc; days[idx].n++; }
  });
  var max = Math.max.apply(null, days.map(function (d) { return d.usdc; }));
  if (max === 0) { $('chart').innerHTML = '<div class="empty"><strong>Your first 30 days will show up here</strong>One bar per day, as agents pay.</div>'; return; }
  var nice = Math.pow(10, Math.floor(Math.log10(max))); nice = Math.ceil(max / nice) * nice;
  var slot = (W - L - R) / N, plotH = H - T - B, every = W < 560 ? 10 : 5;
  var y = function (v) { return T + (1 - v / nice) * plotH; };
  var tick = function (v) { return v === 0 ? '0' : v < 1 ? v.toFixed(2) : Number.isInteger(v) ? String(v) : v.toFixed(1); };
  var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
  [0, 0.5, 1].forEach(function (f) {
    out += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(nice * f) + '" y2="' + y(nice * f) + '"/>';
    out += '<text class="tick" x="' + (L - 8) + '" y="' + (y(nice * f) + 4) + '" text-anchor="end">' + tick(nice * f) + '</text>';
  });
  days.forEach(function (d, i) {
    var x = L + slot * i + slot * 0.2, w = slot * 0.6;
    if (d.usdc > 0) {
      out += '<rect class="bar" x="' + x + '" y="' + y(d.usdc) + '" width="' + w + '" height="' + (y(0) - y(d.usdc)) + '" rx="2"><title>' +
        esc(d.date.toLocaleDateString([], { day: 'numeric', month: 'short' })) + ': ' + d.n + (d.n === 1 ? ' pass, ' : ' passes, ') + esc(usdc(d.usdc)) + '</title></rect>';
    }
    if (i % every === every - 1 || i === 0) {
      out += '<text class="tick" x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.date.toLocaleDateString([], { day: 'numeric', month: 'short' })) + '</text>';
    }
  });
  $('chart').innerHTML = out + '</svg>';
}

function renderTable(sales) {
  if (!sales.length) {
    $('rows').innerHTML = '<div class="empty"><strong>No passes sold yet</strong>The first agent that pays shows up here within seconds.</div>';
    return;
  }
  var rows = sales.slice(0, 25).map(function (s) {
    return '<tr><td>' + esc(when(s.at)) + '</td>' +
      '<td><a class="mono" href="' + EXPLORER + '/account/' + esc(s.from) + '" target="_blank" rel="noopener">' + esc(short(s.from)) + '</a></td>' +
      '<td class="r">' + esc(usdc(s.usdc)) + ' <span class="sub">' + esc(eur(s.usdc)) + '</span></td>' +
      '<td class="r"><span class="pill">Paid</span></td>' +
      '<td class="r"><a class="mono" href="' + EXPLORER + '/tx/' + esc(s.hash) + '" target="_blank" rel="noopener">' + esc(short(s.hash)) + '</a></td></tr>';
  }).join('');
  $('rows').innerHTML = '<table><thead><tr><th>When</th><th>Agent</th><th class="r">Paid</th><th class="r"></th><th class="r">Transaction</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function load() {
  Promise.all([fetchSales(), fetchBalance()]).then(function (r) {
    var sales = r[0], balance = r[1];
    sales.sort(function (a, b) { return b.at - a.at; });
    renderKpis(sales, balance);
    renderChart(sales);
    renderTable(sales);
    $('err').hidden = true;
    $('updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }).catch(function (e) {
    $('err').hidden = false;
    $('err').textContent = 'Could not read the ledger: ' + e.message + '. Retrying.';
  });
}
load();
setInterval(load, 5000);
`;

export function dashboardHtml(config: DashboardConfig): string {
  const cfg = JSON.stringify({
    app: config.app,
    price: config.price,
    ttlSeconds: config.ttlSeconds,
    contractId: config.contractId,
    horizon: HORIZON,
    explorer: EXPLORER,
    usdcIssuer: USDC_ISSUER,
    eurPerUsdc: EUR_PER_USDC,
  }).replace(/</g, '\\u003c');
  const h = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  const length = h(passLength(config.ttlSeconds));
  const price = h(config.price), app = h(config.app), contractId = h(config.contractId);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Agent Pass · Sales</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="brand">${ICON}Agent Pass</div>
    <div class="live"><i class="dot"></i>Live · Stellar testnet · <a class="mono" href="${EXPLORER}/account/${config.app}" target="_blank" rel="noopener">${config.app.slice(0, 4)}…${config.app.slice(-4)}</a></div>
  </header>

  <div class="head">
    <h1>Sales</h1>
    <span class="sub" id="updated">Reading the ledger…</span>
  </div>

  <section class="card kpis">
    <div class="kpi"><div class="l">Earned</div><div class="v" id="earned">…</div><div class="s" id="earned-sub"></div></div>
    <div class="kpi"><div class="l">Passes sold</div><div class="v" id="passes">…</div><div class="s" id="passes-sub"></div></div>
    <div class="kpi"><div class="l">Agents</div><div class="v" id="agents">…</div><div class="s" id="agents-sub"></div></div>
    <div class="kpi"><div class="l">In your account</div><div class="v" id="balance">…</div><div class="s" id="balance-sub"></div></div>
  </section>

  <div class="sect"><h2>Last 30 days</h2><span class="sub">USDC earned per day</span></div>
  <section class="card chart" id="chart"></section>

  <div class="sect"><h2>Latest passes</h2><span class="sub">Each row is one real transaction</span></div>
  <section class="card" id="rows"></section>

  <section class="card settings">
    <div>Price<b>${price} USDC per pass</b></div>
    <div>Pass lasts<b>${length}</b></div>
    <div>Paid to<b class="mono"><a href="${EXPLORER}/account/${app}" target="_blank" rel="noopener">${app}</a></b></div>
    <div>Pass contract<b class="mono"><a href="${EXPLORER}/contract/${contractId}" target="_blank" rel="noopener">${contractId.slice(0, 4)}…${contractId.slice(-4)}</a></b></div>
  </section>

  <div class="err" id="err" hidden></div>
  <p class="fine">Paid in USDC on Stellar testnet, straight into your account. Euro amounts use a display rate; no exchange takes place. This page reads the public ledger and shows no private data.</p>
</div>
<script id="cfg" type="application/json">${cfg}</script>
<script>${JS}</script>
</body>
</html>
`;
}

/** Serves the dashboard at the path it is mounted on: `app.use('/agent-pass', gate.dashboard)`. */
export function dashboardHandler(config: DashboardConfig) {
  const html = dashboardHtml(config);
  return function agentPassDashboard(req: ExpressRequest, res: ExpressResponse, next: NextFunction) {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || (req.path !== '/' && req.path !== '')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(html);
  };
}
