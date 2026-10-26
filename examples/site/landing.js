// The Agent Pass landing page, served at /. Every claim on it is true of this very app.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const SENTENCE =
  'Install the @nicko-ai/agent-pass npm package and follow node_modules/@nicko-ai/agent-pass/skills/agent-pass/SKILL.md to sell /agent to AI agents for 0.05 USDC per hour.';

const PAYMENT = '4ba07b25c587a662eb9527b96a86cd1e7eaafb1fce96081fe20a95e524008de1';
const PASS = '4480e7e7292b8376d5e27688f7c90eec4dacf3fc5ca1e59e3f840ac073bf3a0a';
const CONTRACT = 'CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU';
const REPO = 'https://github.com/berryxmas/agent-pass';
const NPM = 'https://www.npmjs.com/package/@nicko-ai/agent-pass';
const short = (h) => `${h.slice(0, 8)}…${h.slice(-4)}`;

export function landing({ price, ttlSeconds, host }) {
  const hours = ttlSeconds / 3600;
  const passLength = hours >= 1 ? (hours === 1 ? 'an hour' : `${hours} hours`) : `${Math.round(ttlSeconds / 60)} minutes`;
  const base = `https://${host}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent Pass · let AI agents pay to use your Express app</title>
<meta name="description" content="One npm package. An AI agent gets 402 Payment Required, pays ${price} USDC on Stellar over MPP, and gets a pass for ${passLength}. No account, no sign-up. Live on testnet with a sample store and its sales dashboard.">
<meta property="og:title" content="Agent Pass · let AI agents pay to use your Express app">
<meta property="og:description" content="An agent gets 402, pays USDC on Stellar, gets a pass. One npm package, one sentence in Claude Code. Live on testnet.">
<meta property="og:image" content="${base}/shot-dashboard.png">
<link rel="icon" href="/agent-pass-icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/landing.css">
</head>
<body>
<div class="hero-wrap">
<header class="top">
  <a class="wordmark" href="/"><img src="/agent-pass-logo.svg" alt="Agent Pass" height="22"></a>
  <nav>
    <a href="#how">How it works</a>
    <a href="#live">Live on testnet</a>
    <a href="${NPM}">npm</a>
    <a href="${REPO}">GitHub</a>
  </nav>
</header>

<section class="hero">
  <div class="hero-text">
    <p class="eyebrow">HackMeridian 2026 · Stellar Composed · live on testnet</p>
    <h1>Let AI agents pay to use your Express app.</h1>
    <p class="lead">An agent calls your route, gets <code>402 Payment Required</code>, pays ${price} USDC on Stellar and gets a pass for ${passLength}. No account, no sign-up, no wallet popup.</p>
    <div class="cta">
      <a class="btn btn-primary" href="/marta">Open the sample store</a>
      <a class="btn btn-ghost" href="/agent-pass">See the owner's sales</a>
    </div>
    <ol class="flow" aria-label="One visit">
      <li><span class="flow-k">1</span><span><strong>402</strong> the gate names the price</span></li>
      <li><span class="flow-k">2</span><span><strong>${price} USDC</strong> settles on Stellar</span></li>
      <li><span class="flow-k">3</span><span><strong>Pass</strong> good for ${passLength}</span></li>
    </ol>
  </div>
  <figure class="hero-shot">
    <a href="/agent-pass" aria-label="Open the owner's dashboard">
      <span class="browser"><span></span><span></span><span></span><em>${esc(host)}/agent-pass</em></span>
      <img src="/shot-dashboard.png" width="1280" height="800" alt="The owner's sales dashboard: earned, passes sold, agents, balance and every sale">
    </a>
    <figcaption>The owner's dashboard, read live from the public Stellar ledger.</figcaption>
  </figure>
</section>
</div>

<main>
  <section id="live" class="live">
    <div class="sec-head">
      <h2>Live on testnet, right here</h2>
      <p>Three doors on this one Express app. Open any of them.</p>
    </div>
    <div class="doors">
      <a class="door door-store" href="/marta">
        <img src="/shot-store.png" width="1280" height="800" alt="Marta Icons, the sample store">
        <span class="door-body">
          <span class="door-k">The sample store</span>
          <strong>Marta Icons</strong>
          <span>Marta's icon store in Lisbon. A plain Express app with the gate added. People search and copy icons for free.</span>
        </span>
      </a>
      <a class="door door-402" href="/agent/icons?q=sun">
        <pre class="door-code"><code><span class="c-m">GET</span> /agent/icons?q=sun
<span class="c-s">HTTP/1.1 402 Payment Required</span>

{
  <span class="c-k">"title"</span>: <span class="c-v">"Payment Required"</span>,
  <span class="c-k">"detail"</span>: <span class="c-v">"Payment is required (Agent Pass, one hour)."</span>,
  <span class="c-k">"challengeId"</span>: <span class="c-v">"hPUQIarpBo3-…"</span>
}</code></pre>
        <span class="door-body">
          <span class="door-k">The agent door</span>
          <strong>GET /agent/icons?q=sun</strong>
          <span>Answers 402 with the price until an agent pays. Open it in your browser to see the charge.</span>
        </span>
      </a>
      <a class="door door-dash" href="/agent-pass">
        <img src="/shot-dashboard.png" width="1280" height="800" alt="The owner's dashboard">
        <span class="door-body">
          <span class="door-k">The owner's dashboard</span>
          <strong>/agent-pass</strong>
          <span>Earned, passes sold, agents, balance and every sale with its transaction link. No database.</span>
        </span>
      </a>
    </div>
  </section>

  <section class="sentence">
    <div class="sentence-grid">
      <div>
        <h2>Set it up with one sentence</h2>
        <p>Open Claude Code in your Express app and type the sentence. Claude Code installs <a href="${NPM}">@nicko-ai/agent-pass</a>, makes or loads your Stellar key in the Stellar CLI, puts the gate on your route, mounts the dashboard on <code>/agent-pass</code>, and pays once from a test agent to prove it.</p>
        <p class="note">Your secret key never leaves the Stellar CLI.</p>
      </div>
      <pre class="prompt"><span class="prompt-bar">Claude Code</span><code>${esc(SENTENCE)}</code></pre>
    </div>
  </section>

  <section id="how" class="how">
    <div class="sec-head">
      <h2>How a visit works</h2>
      <p>Money first, pass second. Four steps, two of them on chain.</p>
    </div>
    <ol class="steps">
      <li><span class="n">01</span><strong>402</strong><p>The agent calls <code>/agent/icons?q=sun</code> with no pass. The gate answers with an MPP charge: the price, your address, USDC on Stellar.</p></li>
      <li><span class="n">02</span><strong>Payment</strong><p>The agent signs a USDC transfer with its own key and retries. Your server sends it to the network and waits until it settles.</p></li>
      <li><span class="n">03</span><strong>Pass</strong><p>Your server records the pass in the shared <code>agent_pass</code> contract with your key and answers with a token it signed.</p></li>
      <li><span class="n">04</span><strong>Next calls</strong><p>The agent sends the token. The gate checks the signature and the expiry locally, with no network call and no payment, until the pass expires.</p></li>
    </ol>
  </section>

  <section class="proof-sec">
    <div class="proof-grid">
      <div>
        <h2>One real visit through this site</h2>
        <p>Every hash opens on the public Stellar testnet explorer.</p>
        <p class="try">Repeat it from a terminal with a funded testnet key:</p>
        <pre><code>AGENT_SECRET="$(stellar keys secret my-agent)" node node_modules/@nicko-ai/agent-pass/skills/agent-pass/prove.mjs "${base}/agent/icons?q=sun"</code></pre>
      </div>
      <ul class="receipt">
        <li><span>Payment, ${price} USDC from a test agent to the store's owner</span><a href="https://stellar.expert/explorer/testnet/tx/${PAYMENT}"><code>${short(PAYMENT)}</code></a></li>
        <li><span>The pass, written in the shared contract by the owner's key</span><a href="https://stellar.expert/explorer/testnet/tx/${PASS}"><code>${short(PASS)}</code></a></li>
        <li><span>The <code>agent_pass</code> contract, one for every app</span><a href="https://stellar.expert/explorer/testnet/contract/${CONTRACT}"><code>${short(CONTRACT)}</code></a></li>
      </ul>
    </div>
  </section>

  <section class="why">
    <div class="sec-head">
      <h2>Why MPP and Stellar</h2>
    </div>
    <ul class="why-grid">
      <li><strong>Stock MPP, both sides.</strong> The agent uses the official Stellar MPP client; the gate uses the MPP server. No Agent Pass code in the agent.</li>
      <li><strong>No pass before the money settles.</strong> A USDC payment on Stellar settles in about five seconds for a fraction of a cent, so ${price} USDC for ${passLength} is a real price.</li>
      <li><strong>One pass, many apps.</strong> Every app writes its passes to the same contract. A second app that never took the money can honor the pass after a free read.</li>
      <li><strong>Cash-out through an anchor.</strong> The owner's USDC leaves over SEP-24 to the SDF test anchor; the sample store's owner withdrew 1 USDC of its sales.</li>
    </ul>
  </section>

  <section class="end">
    <h2>See it take a payment.</h2>
    <div class="cta">
      <a class="btn btn-primary" href="/marta">Open the sample store</a>
      <a class="btn" href="/agent-pass">See the owner's sales</a>
    </div>
  </section>
</main>

<footer class="foot">
  <span>Agent Pass · HackMeridian 2026</span>
  <span><a href="${REPO}">Code on GitHub</a> · <a href="${NPM}">@nicko-ai/agent-pass on npm</a> · <a href="/marta">Marta Icons</a> · <a href="/agent-pass">Dashboard</a></span>
</footer>
</body>
</html>`;
}
