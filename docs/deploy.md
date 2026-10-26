# Deploy (testnet)

Deployed on Sunday 25 October from `src/contract`. Every hash opens at `https://stellar.expert/explorer/testnet/tx/<hash>`.

## The `agent_pass` contract

The live contract, redeployed at 16:16 UTC so that a pass sits in temporary storage:

| What | Value |
| --- | --- |
| Contract ID | `CDLR2ABHIPQ7SNWJKT3S5EE7DFTZ2VB2FJLISODIFNLYCRUCZKBFYJKU` |
| Wasm hash | `5712ebf9c400743e4e21362f2c39f217be5f14744fa3c3e657d0f1a254db8a62` (1748 bytes, soroban-sdk 28) |
| Wasm upload (fee bump) | `4109c665e7d8d5cf0cb1d3dbd19f6e4ea1d4125ad4dcf299c2b666a69b4ae7a4` |
| Contract create | `b715aba01cc5ce3d2622ae253c9e13928d2e5f358892b5906c3e70c2337df6bc` |

The first deploy, `CAELB5AVBEO7V5RIDQBYCXU7466AEFYUNYU7JCSIELYUWBNR4XU6KSE3` (wasm `5c75d5ba...`, upload `a31a0e22...`, create `1f039fa7...`), kept each pass in persistent storage. The network's minimum TTL for a persistent entry is about 180 days, so the first pass for a new (app, agent) pair cost 4.297447 XLM in rent (`f9e08d18...`) for a one-hour pass. On the new contract the same first pass cost 0.0181391 XLM (`15541d98...`), and the entry's `liveUntilLedgerSeq` is 5385015, the pass's own expiry ledger. The old contract's entry still lives until ledger 8494063.

Uploading the wasm costs testnet XLM: 422.58 XLM for the first upload and 600.99 XLM for the second, paid by demo-app.

Functions: `issue(app, agent, expiry_ledger)` needs the app's signature and emits `Issued { app, agent, expiry_ledger }`. `valid(app, agent) -> bool` is a free read.

## The demo app's account

`demo-app` is the toy app's Stellar account. It receives the USDC, signs `issue` and signs the session tokens. Its secret key stays in `~/.config/stellar/identity/demo-app.toml` and reaches the server only as `APP_SECRET="$(stellar keys secret demo-app)"`.

| What | Value |
| --- | --- |
| demo-app address | `GAIKLUWDHJ63562M5Q56D4ZBEE7TN4XVZJCX7KP2OFMW2D5SJALROIPM` |
| Funded by friendbot | `0439ee3075036117ac60a3d5cd4844efd48f5adec2569fecfcfbec88d4bf6428` |
| USDC trustline | `cc62608cd5864b0ade19165e87d74b6aa08046bae29e35838b8385116f1c2425` |

## The first end-to-end run on the live contract (16:17 UTC)

agent-1 (`GA3CI5...E4HY`) against Saturday's toy app on localhost, run by its agent script with `PORT=3044` and `APP_URL=http://localhost:3044`:

| Step | Result |
| --- | --- |
| 1. GET `/agent/search?q=cursor` | 402 Payment Required, MPP challenge for 0.50 USDC |
| 2. MPP charge, 0.50 USDC agent-1 to demo-app | `48b2a83922b9351a830c79193254deb89e5a2314b67c9b325ff6875da3c4a655` |
| 3. `agent_pass.issue`, expiry ledger 5385015 | `15541d98c4f64f3f02e1ad11db088451916cb84517b8193b2f7d55f42425342d` |
| 4. Same request, paid | 200 with the result and a signed one-hour token |
| 5. Next request with the token only | 200, no payment |
| 6. `agent_pass.valid(demo-app, agent-1)` | `true` |

## One pass, two apps (26 Oct, 00:41 UTC)

`npm run agent:second-app` with agent-1, against the sample app on Vercel (then a bookshop, since replaced by Marta Icons at the same address and owner; built from the published package, owner `GC3DF7VPQD6BLUYPGWVAT363AG3QORHCRY3OK4XTET6HDTMQ6MXLUNHD`) and Book Reviews on this Mac (`PORT=4103 npm run second-app`, because a test server held the default port 4100; the agent then ran with `SECOND_APP_URL=http://localhost:4103/agent/reviews`):

```
1. first app  https://agent-pass-sample.vercel.app/agent/books
   402, paying 0.0500000 USDC to GC3DF7VPQD6BLUYPGWVAT363AG3QORHCRY3OK4XTET6HDTMQ6MXLUNHD
   paid  56dae276da74d4327608246461db1617b9a4c99c925a80727812e0f798138baf
   pass  9722bbb18de72767b92ff43f7e62f9dd940d2fb775c37308f97d66271a53aaac  (in the shared contract)

2. second app http://localhost:4103/agent/reviews  (no payment, no key of the first app)
   no pass: 401  No pass. Buy one at an app we honor.
   the pass, copied by someone without the agent key: 401  No fresh signature by the pass's agent key.
   the pass + signed by the agent key: 200  3 reviews, on the pass sold by GC3D...UNHD
```

Book Reviews logged `agent_pass.valid(GC3D..., GA3C...) on CDLR...: true` for the 200. A token signed by a real account that never called `issue` got 401 "The contract has no live pass for this agent", so the contract, not the token, decides. The agent's signature names the app it was made for (Book Reviews' own name, `AUDIENCE`, never the request's Host header) and is let in once, so a signature made for another app, or replayed, gets 401 (`src/second-app/honor.test.ts`).

`passIsValid()` simulates the read with the selling app's address as the source account, so it throws when that account does not exist on testnet. A real seller always exists, since it is paid; Book Reviews answers 502 in that case and lets nobody in.

Rerun on Monday 26 Oct, 09:55 WET, after the sample app became Marta Icons: the agent bought its pass at `https://agent-pass-sample.vercel.app/agent/icons?q=sun` (payment `6809e4b7fc355c12f59b70c65b31c337d7d3a5623537e0bdbb1ac428f29006a8`, pass `eb18c5731440587fa4f02e1c1a3d2eddfb209aa1a0a79194f00503b352ccad3d`) and Book Reviews let it in on it: no pass 401, copied pass 401, pass plus the agent's signature 200.

## An `issue` that fails on chain gives no pass

`signAndSend()` in stellar-sdk 15.1.0 resolves even when the transaction lands with status FAILED; it throws only when sending fails or the transaction is never found. The middleware now hands out a pass only when the status is SUCCESS (`confirmIssued` in `src/middleware/index.ts`), and a failed `issue` takes the 502 path.

Proof on testnet: one `issue` built with `expiry_ledger` one ledger ahead and sent 12 seconds later, so the contract refused it with `ExpiryInPast`. `signAndSend()` resolved with status FAILED, and `confirmIssued` threw:

```
signAndSend resolved: hash 57c13df9a62a9df315ea4786faba407aaf2f5ec79fa7b16ea72cc745f6ef4ba2, status FAILED, ledger 5384288
confirmIssued threw: agent_pass.issue 57c13df9...4ba2 ended with status FAILED  -> the middleware answers 502
```

## The first end-to-end run on the first contract (15:24 UTC)

| Step | Result |
| --- | --- |
| MPP charge, 0.50 USDC agent-1 to demo-app | `032b7b479b3657f69f0a5d2b73b26a8e3cdd678b1797ef1b3efc89497121d750` |
| `agent_pass.issue`, expiry ledger 5384377 | `f9e08d181c4a1fb279dc1f18df64427a063f7a8d640add8d7752d58874f63821` |

A second run at 15:27 UTC, with the same commands, gave the same output: charge `0ac873b3f49bb1ca7bbb79715e3d138d458258726859f9a7c48e0dc04612b7cf`, issue `e86c695da3c52a0e5cd9bb9eb2cdeaf7dad08125a66631d0e25be169c05ce4a4`.

## Two extra `Issued` events on the first contract

The first contract has two more `Issued` events for the same pair, from a manual check, not from a sale:

- `5e896d5299dd5c4b33021f0379f9d91379f4bab7248fba4ffa7510e536a74afd`: `stellar contract invoke ... issue` with agent-1 as the source still succeeded, because the Stellar CLI signs a contract's auth entry with any key it holds locally, and the machine that ran it held demo-app's key. The contract did demand demo-app's signature (the transaction carries demo-app's signed auth entry). Without that key the call cannot be signed; `cargo test` covers it (`issue_without_signature_fails`).
- `a92a5620bbf2b3d67c7556e32ff4761a1457f5a829f725b6c521443caa406f44`: put the pass back to its original expiry ledger, 5384377.

Count passes sold from the payments, or skip these two hashes when counting `Issued` events.
