# @nicko-ai/agent-pass

Let AI agents pay to use your Express app. An agent that calls your agent route gets `402 Payment Required`, pays a small amount in USDC on Stellar, and gets a pass for as long as you choose. No account, no sign-up. Your human pages stay as they are, and you watch every sale on a dashboard your app serves itself.

Testnet only for now.

## Set it up with Claude Code

Open Claude Code in your Express app and type:

```text
Install the @nicko-ai/agent-pass npm package and follow node_modules/@nicko-ai/agent-pass/skills/agent-pass/SKILL.md to sell /agent to AI agents for 0.05 USDC per hour.
```

Claude Code then does the whole setup:

- makes or loads your Stellar key in the Stellar CLI, funds it on testnet and turns on USDC;
- adds the gate on the route you named, in front of the endpoints you pick, and your sales dashboard on `/agent-pass`;
- writes the price, the pass length and a server secret to `.env`;
- pays once from a throwaway test agent, uses the pass, and shows you both transactions on the Stellar explorer.

You need Node 22.12 or later, Express, and the [Stellar CLI](https://developers.stellar.org/docs/tools/cli/install-cli). Your secret key stays in the Stellar CLI; nothing writes it to a file.

The skill is the folder `skills/agent-pass` inside this package. To use it as a Claude Code skill (`/agent-pass`), copy that folder into `.claude/skills/`.

## Or add it by hand

```js
import express from 'express';
import { agentPass } from '@nicko-ai/agent-pass';

const app = express();

const gate = agentPass({
  price: '0.05',                                   // USDC per pass
  ttlSeconds: 3600,                                // how long a pass lasts
  appSecret: process.env.AGENT_PASS_APP_SECRET,    // your Stellar secret key: gets paid, signs passes
  mppSecretKey: process.env.AGENT_PASS_MPP_SECRET, // any long random string, e.g. openssl rand -hex 32
});
app.use('/agent', gate);              // agents pay here
app.use('/agent-pass', gate.dashboard); // you watch your sales here

app.get('/agent/search', (req, res) => {
  res.json({ results: [], pass: res.locals.agentPass });
});
```

Your Stellar account must exist on testnet and hold a USDC trustline:

```sh
stellar keys generate my-app --network testnet --fund
stellar tx new change-trust --source my-app --line USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet
AGENT_PASS_APP_SECRET="$(stellar keys secret my-app)" AGENT_PASS_MPP_SECRET="$(openssl rand -hex 32)" node server.js
```

| Option | Required | Meaning |
| --- | --- | --- |
| `price` | yes | USDC per pass, as a string, e.g. `'0.05'` |
| `appSecret` | yes | Your Stellar secret key. Payments go to its address; it signs every pass |
| `mppSecretKey` | yes | A random secret that ties each payment request to your server |
| `ttlSeconds` | no | Pass length in seconds. Default 3600 |
| `contractId` | no | The pass contract. Default: the shared `agent_pass` contract on testnet |

## How a visit works

1. An agent calls your route with no pass. The gate answers `402` with an MPP charge: the price, your address, USDC on Stellar testnet.
2. The agent signs a USDC transfer to your address and sends it with the retried request. Your server broadcasts it and waits until the network confirms it.
3. Your server records the pass in the shared `agent_pass` contract with your key. Your account pays the network fee for that write, about 0.018 XLM.
4. The request goes through with an `Agent-Pass` header: a token your server signs with your Stellar key. It holds the agent's address, the expiry, the payment and the pass record.
5. The agent sends that header on its next calls. The gate checks the signature and the expiry on your server, with no network call and no payment, until the pass expires.

In a handler, `res.locals.agentPass` holds the pass. Any other app can ask the shared contract whether an agent holds a live pass at your app: `passIsValid(AGENT_PASS_CONTRACT, appAddress, agentAddress)`.

## Your dashboard

`gate.dashboard` is one page your app serves itself, at the path you mount it on. It shows what you earned, the passes sold, the agents that paid, your USDC balance, a bar per day for the last 30 days and every sale with its transaction link. The browser reads all of it from the public Stellar ledger, so there is no database and nothing to set up: it works the same on your machine and on a host such as Vercel. A sale is a USDC payment that your key answered with a pass for the same agent; other USDC sent to you shows only in your balance. It shows only public ledger data, which is why it needs no login; put it behind your own login if you prefer.

## Exports

- `agentPass(options)`: the Express middleware, with `.dashboard`, the owner's sales page.
- `dashboardHandler({ app, price, ttlSeconds, contractId })`: the same page for an address you name.
- `passIsValid(contractId, app, agent)`: asks the contract; read-only, no fee.
- `verifyPass(token, appAddress)` and `signPass(claims, keypair)`: the pass token.
- `AGENT_PASS_CONTRACT`, `PASS_HEADER`, `passLength(ttlSeconds)`.

## Limits

- Testnet only.
- Your one key signs every pass write, so writes go one at a time, about one per five seconds.
- The pass is a bearer token: whoever holds it gets in until it expires.

MIT license.
