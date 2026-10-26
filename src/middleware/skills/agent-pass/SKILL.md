---
name: agent-pass
description: Set up Agent Pass in this Express app, on Stellar testnet, for the website owner who runs it. Makes or loads the owner's Stellar key, funds it and turns on USDC, installs agent-pass, puts the paid gate on the agent route the owner names, serves the owner's sales dashboard, writes the settings to .env, and proves it with one real payment and pass. Use when the owner asks to add Agent Pass, sell access to AI agents, or put a pay-per-pass agent route on the app.
argument-hint: "[agent route] [price in USDC] [pass length], e.g. /agent 0.05 1h"
---

# Set up Agent Pass

You work for the owner of this website: the person who runs this Express app on their own machine and gets paid when AI agents use it. Everything below happens in their app, with their Stellar key, on their machine.

Agent Pass gives this app a second door for AI agents. The owner picks a route, say `/agent`. An agent that calls it without a pass gets `402 Payment Required`, pays the price in USDC on Stellar over MPP, and gets a pass: a token the gate creates and signs with the owner's Stellar key, recorded in the shared `agent_pass` contract. With the pass it gets in, with no payment, until the pass expires. Humans keep the normal site; nothing detects agents. The app also serves the owner a sales dashboard at `/agent-pass`: every pass sold, read live from the public Stellar ledger, with no database and no setup.

You do the whole setup, then prove it with one real testnet payment. Testnet only.

Fixed values, never ask for them:

- Network: Stellar testnet.
- USDC: `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- The shared `agent_pass` contract, deployed once for every app: `CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU`.
- Explorer: `https://stellar.expert/explorer/testnet`.

## The one rule for keys

The owner's secret key lives in the Stellar CLI and nowhere else. Read it only inside the command that uses it, as `"$(stellar keys secret <alias>)"`. Never print it, never write it to a file (not `.env` either), never put it in code, a commit or your reply. The same holds for the test agent's key.

## 1. Check, then ask once

Run these and read the results:

- `cat package.json`: `express` must be a dependency. If it is not, stop and say Agent Pass supports Express only for now.
- `node --version`: needs 22.12 or later.
- `stellar --version`: if the Stellar CLI is missing, stop and give the owner its install line, `brew install stellar-cli` (or https://developers.stellar.org/docs/tools/cli/install-cli). Do not install it yourself.
- `stellar keys ls`: the keys already on this machine.
- Find the file that creates the Express app, its routes and their methods, how it starts (`start` script, `dotenv`, `nodemon`, `tsx`) and whether it reads `PORT`.

Then take what the owner already said (the route, price and pass length often come with the request) and ask the owner, in one message, only for what is missing:

1. The agent route, for example `/agent`.
2. What agents get behind it: which of the app's existing endpoints should answer there. Name the ones you found.
3. The price of one pass in USDC, for example `0.05`.
4. How long a pass lasts, for example 1 hour.
5. Which Stellar key gets paid: one from `stellar keys ls`, or a new one (default alias `agent-pass-app`).

## 2. The owner's Stellar key

With `<alias>` the key the owner chose:

```sh
stellar keys address <alias> || stellar keys generate <alias> --network testnet
APP=$(stellar keys address <alias>)
curl -sf -o /dev/null https://horizon-testnet.stellar.org/accounts/$APP || stellar keys fund <alias> --network testnet
stellar tx new change-trust --source <alias> --line USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet
stellar token balance --id USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --account <alias> --network testnet --decimal
```

The account now exists on testnet with free test XLM and can hold USDC (the trustline). The balance line prints its USDC.

## 3. Install the package

If `@nicko-ai/agent-pass` is not yet in `package.json`, run `npm install @nicko-ai/agent-pass`. Then read `node_modules/@nicko-ai/agent-pass/README.md` and the type declarations its `package.json` names for the exact options of `agentPass()`; they win over this file. The shared contract is the default, so the app passes no contract.

## 4. Settings in `.env`

Make sure both files end in a newline, then add what is missing, without printing the secret:

```sh
for f in .env .gitignore; do touch $f; [ -s $f ] && [ -n "$(tail -c1 $f)" ] && echo >> $f; done
grep -qxF '.env' .gitignore || echo '.env' >> .gitignore
grep -q '^AGENT_PASS_MPP_SECRET=' .env || echo "AGENT_PASS_MPP_SECRET=$(openssl rand -hex 32)" >> .env
```

Then set `AGENT_PASS_PRICE=<price>` and `AGENT_PASS_TTL_SECONDS=<seconds>` in `.env`: edit the line when it is already there (a run that changes the price), append it when it is not.

`AGENT_PASS_MPP_SECRET` ties each payment request to this server. The owner's secret key is not in `.env`: the app gets it as `AGENT_PASS_APP_SECRET` when it starts (step 6).

If the app does not load `.env` yet (no `dotenv`, no `--env-file`), add `--env-file-if-exists=.env` to the `node` command of its `start` script. With another runner (`nodemon`, `tsx`) or no `start` script, load `.env` the way that runner does, or add `dotenv` if the app already uses packages that way.

## 5. Mount the gate and the dashboard

In the file that creates the app, import the gate, mount it on the route before the handlers it protects, and mount its dashboard on `/agent-pass`:

```js
import { agentPass } from '@nicko-ai/agent-pass';

const gate = agentPass({
  price: process.env.AGENT_PASS_PRICE,
  ttlSeconds: Number(process.env.AGENT_PASS_TTL_SECONDS),
  appSecret: process.env.AGENT_PASS_APP_SECRET,
  mppSecretKey: process.env.AGENT_PASS_MPP_SECRET,
});
app.use('<route>', gate);
app.use('/agent-pass', gate.dashboard);
```

A CommonJS app (no `"type": "module"`, uses `require`) takes `const { agentPass } = require('@nicko-ai/agent-pass');` instead of the import. If `/agent-pass` is already a route of the app, mount the dashboard on `/agent-pass-dashboard` instead and say so in the report.

Then make the endpoints the owner picked answer under the route, reusing their existing handlers (for example `app.get('<route>/search', searchHandler)` next to `app.get('/search', searchHandler)`). Do not change the human routes. In a handler, `res.locals.agentPass` holds the pass: the agent's address and the expiry.

The dashboard is one page the app serves itself. It shows what the owner earned, the passes sold, the agents that paid, the account balance, a bar per day and every sale with its transaction link, all read from the public ledger by the browser, so it works the same on the owner's machine and on a host such as Vercel. It shows only public ledger data, which is why it needs no login.

## 6. Prove it with one real payment

A throwaway test agent pays from its own Stellar wallet. Make or load it and turn on USDC, then read its USDC balance:

```sh
stellar keys address agent-pass-test-agent || stellar keys generate agent-pass-test-agent --network testnet
AGENT=$(stellar keys address agent-pass-test-agent)
curl -sf -o /dev/null https://horizon-testnet.stellar.org/accounts/$AGENT || stellar keys fund agent-pass-test-agent --network testnet
stellar tx new change-trust --source agent-pass-test-agent --line USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet
stellar token balance --id USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --account agent-pass-test-agent --network testnet --decimal
```

If the balance is below the price, buy 1 test USDC with free test XLM on the testnet exchange:

```sh
stellar tx new path-payment-strict-receive --source agent-pass-test-agent --send-asset native --send-max 100000000 \
  --destination agent-pass-test-agent --dest-asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 \
  --dest-amount 10000000 --network testnet
```

Both amounts are in stroops: 10000000 is 1 USDC, and `--send-max` caps the XLM spent at 10. For a price above 1 USDC, raise both in step.

Start the app in the background on a free port, with the owner's key read from the CLI inside the command, and wait until it answers. If the app ignores `PORT`, use its own port and make sure nothing else holds it:

```sh
AGENT_PASS_APP_SECRET="$(stellar keys secret <alias>)" PORT=<port> npm start
```

Then pay and use the pass, against one endpoint under the route. Check first that the endpoint answers the method you send, since the payment is real. For a GET endpoint:

```sh
AGENT_SECRET="$(stellar keys secret agent-pass-test-agent)" node node_modules/@nicko-ai/agent-pass/skills/agent-pass/prove.mjs "http://localhost:<port><route>/<endpoint>"
```

For another method, add it and the JSON body: `... prove.mjs "<url>" POST '{"q":"refactor"}'`.

It prints the 402, the payment, the pass, the 200 and a second call on the pass with no payment, then one JSON line with the hashes. Then ask the shared contract, as any other app would:

```sh
stellar contract invoke --id CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU --source-account agent-pass-test-agent \
  --network testnet --send no -- valid --app <owner address> --agent <test agent address>
```

It prints `true`. Then check that the dashboard serves and that the ledger holds the payment, with the `payment` hash from the JSON line:

```sh
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:<port>/agent-pass
curl -s "https://horizon-testnet.stellar.org/transactions/<payment>" | grep -c '"successful": true'
```

Both print `200` then `1`. Stop the app you started.

If a step fails, show the error, fix the cause and run the step again. Never fake a result.

## 7. Report

End with:

- What changed: the files edited, the route, the price and the pass length.
- The proof, each as a link: the payment `.../tx/<payment>`, the pass `.../tx/<issue>`, the owner's account `.../account/<owner address>` and the contract `.../contract/CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU`.
- How to run it: `AGENT_PASS_APP_SECRET="$(stellar keys secret <alias>)" npm start`, then the dashboard at `http://localhost:<port>/agent-pass`, where the test payment is the first row.
- To deploy it, the host needs the three `AGENT_PASS_` settings from `.env` and `AGENT_PASS_APP_SECRET` as a secret, read from the CLI only inside the command that stores it. On Vercel the app deploys as it is, Express included, and `/agent-pass` on the deployed site shows the same sales.
