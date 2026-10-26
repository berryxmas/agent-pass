// The Agent Pass landing page, served at /. Every claim on it is true of this very app.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const SENTENCE =
  'Install the @nicko-ai/agent-pass npm package and follow node_modules/@nicko-ai/agent-pass/skills/agent-pass/SKILL.md to sell /agent to AI agents for 0.05 USDC per hour.';

const PAYMENT = '4ba07b25c587a662eb9527b96a86cd1e7eaafb1fce96081fe20a95e524008de1';
const PASS = '4480e7e7292b8376d5e27688f7c90eec4dacf3fc5ca1e59e3f840ac073bf3a0a';
const CONTRACT = 'CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU';
const REPO = 'https://github.com/berryxmas/agent-pass';
const NPM = 'https://www.npmjs.com/package/@nicko-ai/agent-pass';

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
    <a href="#live">Live on testnet</a>
    <a href="${NPM}">npm</a>
    <a href="${REPO}">GitHub</a>
  </nav>
</header>

<main>
  <section class="hero">
    <p class="eyebrow">HackMeridian 2026 · Stellar Composed · testnet</p>
    <h1>Let AI agents pay to use your Express app.</h1>
    <p class="lead">An agent that calls your agent route gets <code>402 Payment Required</code>, pays ${price} USDC on Stellar, and gets a pass for ${passLength}. No account, no sign-up. You watch every sale on a dashboard your app serves itself.</p>
    <div class="cta">
      <a class="btn btn-primary" href="/marta">Open the sample store</a>
      <a class="btn" href="/agent-pass">See the owner's sales</a>
    </div>
    <p class="trust">Every number on the dashboard is read live from the public Stellar ledger. Each row links to its transaction.</p>
  </section>

  <section class="sentence">
    <h2>Set it up with one sentence</h2>
    <p>Open Claude Code in your Express app and type:</p>
    <pre><code>${esc(SENTENCE)}</code></pre>
    <p>Claude Code installs <a href="${NPM}">@nicko-ai/agent-pass</a>, makes or loads your Stellar key in the Stellar CLI, puts the gate on your route, mounts the dashboard on <code>/agent-pass</code>, and pays once from a test agent to prove it. Your secret key never leaves the Stellar CLI.</p>
  </section>

  <section id="how" class="how">
    <h2>How a visit works</h2>
    <ol>
      <li><strong>402.</strong> The agent calls <code>/agent/icons?q=sun</code> with no pass. The gate answers with an MPP charge: the price, your address, USDC on Stellar.</li>
      <li><strong>Payment.</strong> The agent signs a USDC transfer with its own key and retries. Your server sends it to the network and waits until it settles. No wallet popup, no approval step.</li>
      <li><strong>Pass.</strong> Your server records the pass in the shared <code>agent_pass</code> contract with your key and answers with a token it signed. Money first, pass second.</li>
      <li><strong>Next calls.</strong> The agent sends the token. The gate checks the signature and the expiry locally, with no network call and no payment, until the pass expires.</li>
    </ol>
  </section>

  <section id="live" class="live">
    <h2>Live on testnet, right here</h2>
    <div class="cards">
      <a class="card" href="/marta">
        <span class="card-k">The sample store</span>
        <strong>Marta Icons</strong>
        <span>Marta's icon store in Lisbon, a plain Express app with the gate added. People search and copy icons for free.</span>
      </a>
      <a class="card" href="/agent/icons?q=sun">
        <span class="card-k">The agent door</span>
        <strong>GET /agent/icons?q=sun</strong>
        <span>Answers 402 with the price until an agent pays. Open it in your browser to see the charge.</span>
      </a>
      <a class="card" href="/agent-pass">
        <span class="card-k">The owner's dashboard</span>
        <strong>/agent-pass</strong>
        <span>Earned, passes sold, agents, balance and every sale with its transaction link. No database.</span>
      </a>
    </div>
    <h3>One real visit through this site</h3>
    <table class="proof">
      <tr><td>Payment, ${price} USDC from a test agent to the store's owner</td><td><a href="https://stellar.expert/explorer/testnet/tx/${PAYMENT}"><code>${PAYMENT.slice(0, 8)}…${PAYMENT.slice(-4)}</code></a></td></tr>
      <tr><td>The pass, written in the shared contract by the owner's key</td><td><a href="https://stellar.expert/explorer/testnet/tx/${PASS}"><code>${PASS.slice(0, 8)}…${PASS.slice(-4)}</code></a></td></tr>
      <tr><td>The <code>agent_pass</code> contract, one for every app</td><td><a href="https://stellar.expert/explorer/testnet/contract/${CONTRACT}"><code>${CONTRACT.slice(0, 8)}…${CONTRACT.slice(-4)}</code></a></td></tr>
    </table>
    <p class="try">Try it from a terminal with a funded testnet key:</p>
    <pre><code>AGENT_SECRET="$(stellar keys secret my-agent)" node node_modules/@nicko-ai/agent-pass/skills/agent-pass/prove.mjs "${base}/agent/icons?q=sun"</code></pre>
  </section>

  <section class="why">
    <h2>Why MPP and Stellar</h2>
    <ul>
      <li><strong>Stock MPP, both sides.</strong> The agent uses the official Stellar MPP client; the gate uses the MPP server. No Agent Pass code in the agent.</li>
      <li><strong>No pass before the money settles.</strong> A USDC payment on Stellar settles in about five seconds for a fraction of a cent, so ${price} USDC for ${passLength} is a real price.</li>
      <li><strong>One pass, many apps.</strong> Every app writes its passes to the same contract. A second app that never took the money can honor the pass after a free read.</li>
      <li><strong>Cash-out through an anchor.</strong> The owner's USDC leaves over SEP-24 to the SDF test anchor; the sample store's owner withdrew 1 USDC of its sales.</li>
    </ul>
  </section>
</main>

<footer class="foot">
  <span>Agent Pass · HackMeridian 2026</span>
  <span><a href="${REPO}">Code on GitHub</a> · <a href="${NPM}">@nicko-ai/agent-pass on npm</a> · <a href="/marta">Marta Icons</a> · <a href="/agent-pass">Dashboard</a></span>
</footer>
</body>
</html>`;
}
