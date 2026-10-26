# Bookshop: a sample app set up by Claude Code

A plain Express bookshop with a catalogue at `/api/books`. On Sunday night a fresh Claude Code, opened in this app's folder with no access to the Agent Pass repository, got the one sentence from the package README, with the key to be paid named at the end ("Pay to a new key called bookshop-owner"):

```text
Install the @nicko-ai/agent-pass npm package and follow node_modules/@nicko-ai/agent-pass/skills/agent-pass/SKILL.md to sell /agent to AI agents for 0.05 USDC per hour.
```

It installed the published package, made the owner's Stellar key `bookshop-owner`, funded it on testnet, turned on USDC, and added these lines to `server.js`:

```diff
+import { agentPass } from '@nicko-ai/agent-pass';
+
+const gate = agentPass({
+  price: process.env.AGENT_PASS_PRICE,
+  ttlSeconds: Number(process.env.AGENT_PASS_TTL_SECONDS),
+  appSecret: process.env.AGENT_PASS_APP_SECRET,
+  mppSecretKey: process.env.AGENT_PASS_MPP_SECRET,
+});
+app.use('/agent', gate);
+app.use('/agent-pass', gate.dashboard);
+
+app.get('/agent/books', books);
```

Then it paid once from a throwaway test agent and used the pass: payment [`2fb73c99...`](https://stellar.expert/explorer/testnet/tx/2fb73c99c08760f908986c21f98333300702246b9f8085e70e74df6867bbdb1f), pass [`3934caed...`](https://stellar.expert/explorer/testnet/tx/3934caed42e877b397db03d153504357e50cd7f08f7f12689ea5d0281f2c7a8f).

The same app runs on Vercel: https://agent-pass-sample.vercel.app. Humans use `/api/books`; agents call `/agent/books` and get `402 Payment Required` until they pay. The owner's sales are at https://agent-pass-sample.vercel.app/agent-pass.

## Run it

```sh
npm install
cp .env.example .env   # then put a long random string in AGENT_PASS_MPP_SECRET
AGENT_PASS_APP_SECRET="$(stellar keys secret bookshop-owner)" npm start
```

Use your own Stellar key in place of `bookshop-owner`: it needs a testnet account with a USDC trustline (the skill sets this up).
