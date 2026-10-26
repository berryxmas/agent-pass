# Agent Pass

Let AI agents pay to use any Express app. An agent that calls the app's agent route gets `402 Payment Required`, pays a small amount in USDC on Stellar over MPP, and gets a pass for as long as the owner chose. No account, no sign-up. The owner sets it all up by typing one sentence into Claude Code, and watches every sale on a dashboard the app serves itself.

HackMeridian 2026, Genesis path, **Stellar Composed** track. It composes an agent wallet from the Stellar CLI, MPP payments in USDC, a Soroban contract that records each pass, and a SEP-24 anchor for the owner's cash-out. Testnet only.

## See it live

- A sample bookshop app, set up from the published package by one sentence typed into Claude Code: https://agent-pass-sample.vercel.app ([its code](examples/bookshop))
- Its owner's sales dashboard, read live from the Stellar testnet ledger: https://agent-pass-sample.vercel.app/agent-pass
- Its agent door: https://agent-pass-sample.vercel.app/agent/books answers `402 Payment Required` with the price until an agent pays.
- The npm package: [@nicko-ai/agent-pass](https://www.npmjs.com/package/@nicko-ai/agent-pass), built from [src/middleware](src/middleware), with the Claude Code skill inside it.

## The problem

Most apps are built for people. An AI agent that needs a lookup, a converter or a catalogue stops at the sign-up page: make an account, confirm an email, pick a plan. The owner has no simple way to take the agent's money short of building a paid API. The agent's developer ends up holding dozens of accounts for one-time jobs.

## How it works

The owner opens Claude Code in their Express app and types:

```text
Install the @nicko-ai/agent-pass npm package and follow node_modules/@nicko-ai/agent-pass/skills/agent-pass/SKILL.md to sell /agent to AI agents for 0.05 USDC per hour.
```

Claude Code installs the package and follows the skill inside it: it makes or loads the owner's Stellar key in the Stellar CLI, funds it on testnet, turns on USDC, puts the gate on the route the owner named, mounts the sales dashboard on `/agent-pass`, writes the price and pass length to `.env`, then pays once from a throwaway test agent and shows both transactions on the explorer. The owner's secret key stays in the Stellar CLI; nothing writes it to a file. In the sample app this added 11 lines ([the diff](examples/bookshop#readme)).

Then an agent visits:

```
AI agent (Stellar CLI key)            Owner's Express app                         Stellar testnet
   |                                    |                                         |
   |-- GET /agent/books --------------->|                                         |
   |<-- 402 + MPP charge: the price ----|                                         |
   |-- signed USDC transfer (MPP) ----->|-- sends it, waits until settled ------->|  USDC to the owner
   |                                    |-- agent_pass.issue(app, agent, exp) --->|  Soroban contract
   |<-- 200 + Agent-Pass token ---------|                                         |
   |                                    | the token is signed by the owner's key  |
   |-- next calls with the token ------>|                                         |
   |                                    | checks signature and expiry locally     |
   |                                    |                                         |
Owner's dashboard (/agent-pass) reads every sale from the public ledger
Owner's USDC --> SEP-24 anchor --> bank
```

1. **402.** The gate answers a call with no pass with an MPP charge: the price, the owner's address, USDC on Stellar testnet.
2. **Payment.** The agent signs a USDC transfer with its own Stellar key and retries. There is no wallet popup and no approval step: the agent's key is in the Stellar CLI, the path Stellar is building for agent wallets ([stellar-cli#2628](https://github.com/stellar/stellar-cli/issues/2628)). The owner's server sends the transfer to the network and waits until it settles.
3. **Pass.** Only after the money settles, the owner's server records the pass in the shared `agent_pass` contract with the owner's key, and returns the request with an `Agent-Pass` header: a token **created and signed by the owner's server with the owner's Stellar key**, holding the agent's address, the expiry, the payment and the pass record. If the contract write fails, the agent gets a 502 with its payment hash and no pass.
4. **Next calls.** The agent sends the token. The gate checks the signature and the expiry on the owner's server, with no network call and no payment, until the pass expires.
5. **Dashboard.** The page at `/agent-pass` reads the owner's sales, balance and agents from the public Stellar ledger in the browser, so there is no database and nothing to set up, locally or on a host such as Vercel.
6. **Cash-out.** The owner's USDC leaves through an anchor. The sample bookshop's owner withdrew 1 USDC of its sales through the SDF test anchor over SEP-24, and the anchor marked it completed ([the 36-second capture](docs/media/cash-out.mp4), [how](docs/research/test-anchor.md)). [scripts/cash-out.ts](scripts/cash-out.ts) runs it. The test anchor pays out simulated US dollars, not real money.

Humans keep using the normal site. Nothing tries to tell people from agents: the gate sits only on the route the owner names for agents.

## Why MPP and Stellar

- **MPP has an official Stellar SDK** (`@stellar/mpp`). The agent uses the stock MPP client with no Agent Pass code; the owner's server uses the stock MPP server inside the gate.
- **No pass before the money settles.** The agent signs and the owner's server sends the payment and waits for the network, so a pass is never handed out against a payment that later fails.
- **A real price for a small pass.** A USDC payment on Stellar settles in about five seconds for a fraction of a cent, so 0.05 USDC per hour is a real price, with no card network in the loop.
- **One shared contract.** Every app writes its passes to the same `agent_pass` contract, keyed by app and agent. The selling app checks its own signed token. A second app that never took the money can honor the same pass: [Book Reviews](src/second-app) checks the seller's signature on the pass, a fresh signature by the agent's own key over its name and the time (used once, so a copied pass alone gets 401), and `valid(seller, agent)` on the shared contract, a free read. A pass sits in temporary storage that the ledger drops at expiry, so the owner pays no long-term rent (about 0.018 XLM per write).
- **Anchors reach the bank.** The same testnet USDC leaves through the SDF test anchor over SEP-24.
- **Why not x402.** Its Stellar packages needed a newer Stellar SDK than MPP's when we built this; MPP worked end to end on the first day.

## On-chain proofs

Every hash opens at `https://stellar.expert/explorer/testnet/tx/<hash>`. The contract's deploy record is in [docs/deploy.md](docs/deploy.md).

| What | Value |
| --- | --- |
| `agent_pass` contract | [`CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU`](https://stellar.expert/explorer/testnet/contract/CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU) |
| Bookshop owner, set up by Claude Code | [`GC3DF7VPQD6BLUYPGWVAT363AG3QORHCRY3OK4XTET6HDTMQ6MXLUNHD`](https://stellar.expert/explorer/testnet/account/GC3DF7VPQD6BLUYPGWVAT363AG3QORHCRY3OK4XTET6HDTMQ6MXLUNHD) |
| Test agent | [`GCIZIWMQKFGCSH7MIQW2EVJKAO5TWUDLXCGYVCQ2F4UY3XUE7BTMEIYI`](https://stellar.expert/explorer/testnet/account/GCIZIWMQKFGCSH7MIQW2EVJKAO5TWUDLXCGYVCQ2F4UY3XUE7BTMEIYI) |
| Claude Code's setup run: 0.05 USDC, agent to bookshop owner (25 Oct, 23:49 UTC) | [`2fb73c99c08760f908986c21f98333300702246b9f8085e70e74df6867bbdb1f`](https://stellar.expert/explorer/testnet/tx/2fb73c99c08760f908986c21f98333300702246b9f8085e70e74df6867bbdb1f) |
| Its pass, `agent_pass.issue` | [`3934caed42e877b397db03d153504357e50cd7f08f7f12689ea5d0281f2c7a8f`](https://stellar.expert/explorer/testnet/tx/3934caed42e877b397db03d153504357e50cd7f08f7f12689ea5d0281f2c7a8f) |
| The deployed sample on Vercel: 0.05 USDC (26 Oct, 00:03 UTC) | [`ffe3f2300f1e32bacd7feb758cb50c6634c4ce6efa7888141cc24968a78f083c`](https://stellar.expert/explorer/testnet/tx/ffe3f2300f1e32bacd7feb758cb50c6634c4ce6efa7888141cc24968a78f083c) |
| Its pass | [`46b18e497bae5fb37b2b9df4d9e5c322c4a7f457d0066f67f6d0240cf1d6507b`](https://stellar.expert/explorer/testnet/tx/46b18e497bae5fb37b2b9df4d9e5c322c4a7f457d0066f67f6d0240cf1d6507b) |
| An `issue` that failed on chain: the gate gave no pass | [`57c13df9a62a9df315ea4786faba407aaf2f5ec79fa7b16ea72cc745f6ef4ba2`](https://stellar.expert/explorer/testnet/tx/57c13df9a62a9df315ea4786faba407aaf2f5ec79fa7b16ea72cc745f6ef4ba2) |
| One pass, two apps: 0.05 USDC, an agent to the sample bookshop (26 Oct, 00:41 UTC) | [`56dae276da74d4327608246461db1617b9a4c99c925a80727812e0f798138baf`](https://stellar.expert/explorer/testnet/tx/56dae276da74d4327608246461db1617b9a4c99c925a80727812e0f798138baf) |
| The bookshop's pass; Book Reviews then let the agent in on it | [`9722bbb18de72767b92ff43f7e62f9dd940d2fb775c37308f97d66271a53aaac`](https://stellar.expert/explorer/testnet/tx/9722bbb18de72767b92ff43f7e62f9dd940d2fb775c37308f97d66271a53aaac) |
| Cash-out: 1 USDC of the bookshop's sales to the SDF test anchor, SEP-24 withdrawal completed (26 Oct, 00:48 UTC) | [`0e32dfc878258139d39500b59f5829c700b3fd11d94b64067c02f6a50c86500d`](https://stellar.expert/explorer/testnet/tx/0e32dfc878258139d39500b59f5829c700b3fd11d94b64067c02f6a50c86500d) |

## Run it yourself

Needs Node 23.6 or later for the tests (the package itself runs on Node 22.12 or later), Rust 1.91 or later with the `wasm32v1-none` target, and the [Stellar CLI](https://developers.stellar.org/docs/tools/cli/install-cli).

```sh
# The package and the second app: 24 tests (the signed pass, no pass when the contract write fails, the 402,
# the dashboard, a pass honored at a second app, a forged host, a replay, an expired pass)
npm install && npm test

# The contract: 8 tests, then build
cd src/contract && cargo test && stellar contract build
```

To sell your own Express app's route, type the sentence above into Claude Code in that app, or add the gate by hand ([the package README](src/middleware/README.md)). To run the sample app, see [examples/bookshop](examples/bookshop).

One pass, two apps: the agent buys a pass at the sample bookshop on Vercel (0.05 testnet USDC), then gets into Book Reviews with it.

```sh
npm run second-app                                                         # terminal 1: Book Reviews on :4100
STELLAR_SECRET="$(stellar keys secret <agent>)" npm run agent:second-app   # terminal 2: the agent
```

The owner's cash-out (1 to 10 USDC per withdrawal):

```sh
AGENT_PASS_APP_SECRET="$(stellar keys secret <owner>)" node scripts/cash-out.ts 1
```

## Threat model (STRIDE)

For the code in `src/`.

| Threat | Case | Answer |
| --- | --- | --- |
| Spoofing | An agent presents a pass it did not buy | The token is signed by the owner's key and names the paying address; a token signed by another key or with a changed expiry is refused (tested). The token is a bearer pass: whoever holds it gets in until it expires |
| Tampering | Someone extends a pass in the contract | Only the app's own key can call `issue` for that app; the contract rejects every other caller |
| Repudiation | The owner says a payment never arrived | Every payment is a testnet transaction with a hash, and every `issue` emits an event; the dashboard lists each sale with its link |
| Information disclosure | The ledger shows which agent used which app | The agent's address is a pseudonym; no personal data goes on chain. The dashboard shows only public ledger data |
| Denial of service | Many agents pay at once | The owner's one key signs every `issue`, so the gate sends them one at a time, about one per five-second ledger. Unpaid calls cost the owner nothing, since the 402 comes before any work |
| Elevation of privilege | The owner's key leaks | Whoever holds it can take the owner's USDC and mint free passes. The key stays in the Stellar CLI and reaches the server only as an environment variable; on the roadmap it moves into a smart account with a spending policy |

## Limits and roadmap

- Testnet only. Mainnet needs real USDC and a live anchor that pays out to a bank.
- Express only for now; the skill stops on any other server.
- The owner's one key signs every pass write, so writes go one at a time.
- Next: the owner's key in a policy-bound smart account; fee sponsorship so the agent holds no XLM; the cash-out inside the dashboard; a euro anchor on mainnet.

## Where everything lives

| Path | What it is |
| --- | --- |
| [src/middleware/](src/middleware) | The npm package `@nicko-ai/agent-pass`: the gate, the pass token, the dashboard, their tests, and the Claude Code skill in [skills/agent-pass/](src/middleware/skills/agent-pass) |
| [src/contract/](src/contract) | The `agent_pass` Soroban contract and its tests |
| [examples/bookshop/](examples/bookshop) | The sample app Claude Code set up, deployed at agent-pass-sample.vercel.app |
| [src/second-app/](src/second-app), [scripts/second-app-demo.ts](scripts/second-app-demo.ts) | Book Reviews, a second app that sells nothing and holds no key, and the agent run that buys a pass at the bookshop and uses it there |
| [scripts/cash-out.ts](scripts/cash-out.ts) | The owner's cash-out through the SDF test anchor (SEP-10, SEP-24) |
| [docs/deploy.md](docs/deploy.md) | The contract's deploy record and the first on-chain runs |
| [docs/research/test-anchor.md](docs/research/test-anchor.md) | The cash-out through the SDF test anchor |


## What exists and why we differ

| Product | What it does | Status | Rail |
| --- | --- | --- | --- |
| [Cloudflare Monetization Gateway](https://blog.cloudflare.com/birthday-week-2026-wrap-up/) | Charges agents per request over HTTP 402 / x402 | Beta since 30 Sep 2026, Cloudflare customers only | x402 |
| [Vellar](https://www.vellar.xyz/) | x402 facilitator plus a catalog of paid endpoints and an MCP search | First mainnet payments Sep 2026 | Stellar |
| [Stripe Link for agents](https://techcrunch.com/2026/04/30/stripe-link-digital-wallet-ai-agents-shopping/) | The user approves on their phone, the agent gets a one-time card | Live since Apr 2026, cards only | Cards |
| [Cloudflare Wallets](https://developers.cloudflare.com/wallets/) | Wallets for agents with spending caps | Handle reservations only, no funding or payments | None named |
| stipend.sh (npm `stipend`) | A USDC wallet for an agent, with spending limits in the signing path | Published Aug 2026 | Base |

Each of these charges per request or per card, or needs a platform account. Agent Pass is one npm package an owner adds to their own Express app in one sentence: the agent pays once over MPP and gets a pass for as long as the owner chose, with no account at the app, the pass is recorded in a shared Soroban contract, and the owner sees every sale on a dashboard the app serves itself.
