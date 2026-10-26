// The Agent Pass landing page, served at /. Every claim on it is true of this very app.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const SENTENCE =
  'Install the @nicko-ai/agent-pass npm package and follow node_modules/@nicko-ai/agent-pass/skills/agent-pass/SKILL.md to sell /agent to AI agents for 0.05 USDC per hour.';

const PAYMENT = '4ba07b25c587a662eb9527b96a86cd1e7eaafb1fce96081fe20a95e524008de1';
const PASS = '4480e7e7292b8376d5e27688f7c90eec4dacf3fc5ca1e59e3f840ac073bf3a0a';
const CONTRACT = 'CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU';
const REPO = 'https://github.com/berryxmas/agent-pass';
const NPM = 'https://www.npmjs.com/package/@nicko-ai/agent-pass';
const short = (s) => `${s.slice(0, 8)}…${s.slice(-4)}`;

export function landing({ price, ttlSeconds, host }) {
  const hours = ttlSeconds / 3600;
  const passLength = hours >= 1 ? (hours === 1 ? 'an hour' : `${hours} hours`) : `${Math.round(ttlSeconds / 60)} minutes`;
  const base = `https://${host}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent Pass · let AI agents pay to use your app</title>
<meta name="description" content="AI agents can't sign up for your app. With Agent Pass they pay ${price} USDC on Stellar and get in for ${passLength}. One npm package for Express, set up with one sentence in Claude Code. Live on testnet.">
<meta property="og:title" content="Agent Pass · let AI agents pay to use your app">
<meta property="og:description" content="AI agents can't sign up. With Agent Pass they pay a few cents in USDC on Stellar and get a pass. One npm package, one sentence in Claude Code.">
<link rel="icon" href="/agent-pass-icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/landing.css">
</head>
<body>
<header class="top">
  <a class="wordmark" href="/"><img src="/agent-pass-logo.svg" alt="Agent Pass" height="22"></a>
  <nav>
    <a href="#how">How it works</a>
    <a href="#demo">Demo</a>
    <a href="${REPO}">GitHub</a>
  </nav>
</header>

<main>
  <section class="hero">
    <p class="eyebrow">HackMeridian 2026 · Stellar testnet</p>
    <h1>Let AI agents pay to use your app.</h1>
    <p class="lead">AI agents can't make accounts. With Agent Pass they pay <strong>${price} USDC</strong> and get in for <strong>${passLength}</strong>. No sign-up, no API keys. You add it to an Express app with one sentence in Claude Code.</p>
    <div class="cta">
      <a class="btn btn-primary" href="#demo">See the live demo</a>
      <a class="btn" href="${REPO}">Read the code</a>
    </div>
  </section>

  <section id="how">
    <h2>How it works</h2>
    <ol class="steps">
      <li>
        <span class="num">1</span>
        <strong>The agent asks</strong>
        <span>It calls your agent route and gets <code>402 Payment Required</code> with the price.</span>
      </li>
      <li>
        <span class="num">2</span>
        <strong>The agent pays</strong>
        <span>It sends ${price} USDC on Stellar from its own wallet. It settles in about five seconds.</span>
      </li>
      <li>
        <span class="num">3</span>
        <strong>The agent gets in</strong>
        <span>It gets a pass for ${passLength}. You see the sale on your dashboard.</span>
      </li>
    </ol>
  </section>

  <section id="setup">
    <h2>Add it to your app</h2>
    <p>Open Claude Code in your Express app and paste this:</p>
    <pre><code>${esc(SENTENCE)}</code></pre>
    <p class="note">Claude Code installs the <a href="${NPM}">npm package</a>, sets up your Stellar wallet, protects the route and adds the dashboard. Then it makes one test payment to prove it works.</p>
  </section>

  <section id="demo">
    <h2>Try the live demo</h2>
    <p>Marta runs an icon store. People use it for free. Agents pay for a pass.</p>
    <div class="cards">
      <a class="card" href="/marta">
        <span class="card-k">1 · The store</span>
        <strong>Marta Icons</strong>
        <span>The normal website for people.</span>
      </a>
      <a class="card" href="/agent/icons?q=sun">
        <span class="card-k">2 · The agent door</span>
        <strong>/agent/icons</strong>
        <span>Open it and you'll see the 402 an agent sees.</span>
      </a>
      <a class="card" href="/agent-pass">
        <span class="card-k">3 · The owner's dashboard</span>
        <strong>Sales</strong>
        <span>Every payment, read live from Stellar.</span>
      </a>
    </div>
  </section>

  <section id="proof">
    <h2>It's real</h2>
    <p>Every sale is a public Stellar testnet transaction. Here is one agent visit to this site:</p>
    <table class="proof">
      <tr><td>The agent paid ${price} USDC</td><td><a href="https://stellar.expert/explorer/testnet/tx/${PAYMENT}"><code>${short(PAYMENT)}</code></a></td></tr>
      <tr><td>The pass was recorded on-chain</td><td><a href="https://stellar.expert/explorer/testnet/tx/${PASS}"><code>${short(PASS)}</code></a></td></tr>
      <tr><td>The shared pass contract</td><td><a href="https://stellar.expert/explorer/testnet/contract/${CONTRACT}"><code>${short(CONTRACT)}</code></a></td></tr>
    </table>
    <details>
      <summary>Pay as an agent yourself</summary>
      <p>With a funded testnet key in the Stellar CLI and the package installed:</p>
      <pre><code>AGENT_SECRET="$(stellar keys secret my-agent)" node node_modules/@nicko-ai/agent-pass/skills/agent-pass/prove.mjs "${base}/agent/icons?q=sun"</code></pre>
    </details>
    <p class="built">Built with Stellar USDC, MPP payments, a Soroban contract and a SEP-24 anchor for cash-out.</p>
  </section>
</main>

<footer class="foot">
  <span>Agent Pass · HackMeridian 2026</span>
  <span><a href="${REPO}">GitHub</a> · <a href="${NPM}">npm</a> · <a href="/llms.txt">llms.txt</a></span>
</footer>
</body>
</html>`;
}
