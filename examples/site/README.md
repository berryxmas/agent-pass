# The live site: the landing page, Marta Icons and the dashboard

One Express app, live at https://agent-pass-sample.vercel.app. Its front page is the Agent Pass landing page. Behind it is the sample app: Marta runs an icon store in Lisbon at `/marta`, a plain Express store where people search the icons, open one, copy its SVG or download it (the design is the store from the team's demo screens). The owner's sales dashboard is at `/agent-pass`.

Agent Pass gives the same app a second door for AI agents, from the published package, with the lines below in [`server.js`](server.js):

```js
import { agentPass } from '@nicko-ai/agent-pass';

const gate = agentPass({
  price: process.env.AGENT_PASS_PRICE,
  ttlSeconds: Number(process.env.AGENT_PASS_TTL_SECONDS),
  appSecret: process.env.AGENT_PASS_APP_SECRET,
  mppSecretKey: process.env.AGENT_PASS_MPP_SECRET,
});
app.use('/agent', gate);
app.use('/agent-pass', gate.dashboard);

app.get('/agent/icons', icons);
app.get('/agent/icons/:id.svg', icon);
```

| Who | Route | What |
| --- | --- | --- |
| Anyone | `/` | The Agent Pass landing page |
| People | `/marta`, `/api/icons?q=sun`, `/icons/sun.svg` | The store, the search, the SVG file |
| AI agents | `/agent/icons?q=sun`, `/agent/icons/sun.svg` | The same search and file, `402 Payment Required` until the agent pays 0.05 USDC for an hour |
| The owner | `/agent-pass` | Every sale, read live from the Stellar testnet ledger: https://agent-pass-sample.vercel.app/agent-pass |

First real visit through the live app on Vercel, 26 Oct 09:48 WET, from a test agent: payment [`4ba07b25...`](https://stellar.expert/explorer/testnet/tx/4ba07b25c587a662eb9527b96a86cd1e7eaafb1fce96081fe20a95e524008de1), pass [`4480e7e7...`](https://stellar.expert/explorer/testnet/tx/4480e7e7292b8376d5e27688f7c90eec4dacf3fc5ca1e59e3f840ac073bf3a0a).

## Files

| File | What |
| --- | --- |
| `server.js` | The Express app: the gate, the dashboard, the routes |
| `landing.js`, `public/landing.css` | The Agent Pass landing page |
| `icons.js` | The catalogue: 36 icons, each a real SVG from `lucide-static` (ISC license) in Marta's colours |
| `page.js` | Marta's store page, rendered on the server |
| `public/style.css`, `public/site.js` | The look, and the search, chips, icon panel and Copy SVG in the browser |

## Run it

```sh
npm install
cp .env.example .env   # then put a long random string in AGENT_PASS_MPP_SECRET
AGENT_PASS_APP_SECRET="$(stellar keys secret <owner>)" npm start
```

The owner's key needs a testnet account with a USDC trustline (the package's skill sets this up). One real agent visit against your copy:

```sh
AGENT_SECRET="$(stellar keys secret <test agent>)" node node_modules/@nicko-ai/agent-pass/skills/agent-pass/prove.mjs "http://localhost:3000/agent/icons?q=sun"
```

## Deploy

The folder deploys as it is to Vercel (`npx vercel deploy --prod` inside it) with the four settings from `.env.example` as environment variables; the dashboard needs no database.
