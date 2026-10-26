# SDF test anchor: the owner's cash-out

Verified on 25 Oct 2026 from https://testanchor.stellar.org/.well-known/stellar.toml

| Field | Value |
| --- | --- |
| Operator | Stellar Development Foundation |
| Network | testnet (`Test SDF Network ; September 2015`) |
| SEP-6 (programmatic) | https://testanchor.stellar.org/sep6 |
| SEP-24 (interactive) | https://testanchor.stellar.org/sep24 |
| SEP-10 auth | https://testanchor.stellar.org/auth |
| SEP-12 KYC | https://testanchor.stellar.org/sep12 |
| Assets | USDC `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` (the same testnet USDC as our setup), SRT, XLM |

The Stellar wallet docs use it as the example anchor: `wallet.anchor({ homeDomain: "testanchor.stellar.org" })` (https://developers.stellar.org/docs/build/apps/wallet/intro).

## One withdrawal, done on Sunday at 16:22 UTC

demo-app withdrew 1 test USDC of its sales through SEP-24. It completed.

1. SEP-10: `GET /auth?account=<demo-app>` returns a challenge transaction; demo-app signs it and `POST /auth` returns a token.
2. `POST /sep24/transactions/withdraw/interactive` with `asset_code` USDC returns `interactive_customer_info_needed` and a URL on `anchor-ref-ui-testanchor.stellar.org`.
3. That URL shows one form: amount, first name, last name, email, bank, account. Nothing is checked; made-up test values pass, so the KYC is simulated. After Submit, one screen shows send 1 USDC, receive 0.9 USD, fee 0.1 USDC, status `pending_user_transfer_start`, a memo and the anchor's account.
4. demo-app pays 1 USDC to that account with that memo (type id): `3ee81124e5245ad7c79f91ad3c0c2bcee09ee6e1354b7e9b8c0f906f5b1ff70e`.
5. `GET /sep24/transaction?id=8fb2fb4a-4035-40b0-a776-4a34b0682983` then reads status `completed`, `amount_out` 0.9, `completed_at` 16:22:25 UTC, about one minute after the start.

Limits from `/sep24/info`: 1 to 10 USDC per withdrawal. The form charged a 0.1 USDC fee.

## The sample app's owner cashes out, Monday 26 Oct

The owner of https://agent-pass-sample.vercel.app, the sample app set up from the published package (a bookshop then, Marta Icons now, same owner key), withdrew its sales through the same anchor with [`scripts/cash-out.ts`](../../scripts/cash-out.ts). The anchor's minimum is 1 USDC, so each withdrawal came after 20 real passes at 0.05 USDC from three test agents.

```sh
AGENT_PASS_APP_SECRET="$(stellar keys secret <owner>)" node scripts/cash-out.ts 1
```

The 36-second screen capture of the second one, for the demo video: [../media/cash-out.mp4](../media/cash-out.mp4). It shows the dashboard at 1.00 USDC, the anchor's form, the anchor's page going to `completed`, the payment on the explorer, and the dashboard at 0.

The script signs in with SEP-10, starts the withdrawal, prints the form's address, pays the anchor once the form is sent, and waits. The anchor's own page polls the withdrawal and shows `completed` when it is done.

| Withdrawal | Payment to the anchor, 1 USDC | Out | Status |
| --- | --- | --- | --- |
| `1d5336db-b89d-4432-98a4-729db2f46c61`, the one in the video | [`0e32dfc878258139d39500b59f5829c700b3fd11d94b64067c02f6a50c86500d`](https://stellar.expert/explorer/testnet/tx/0e32dfc878258139d39500b59f5829c700b3fd11d94b64067c02f6a50c86500d) | 0.9 USD, fee 0.1 USDC | completed 00:48:13 UTC |
| `6fae4e90-e84a-42a8-b5bb-8618f9ea0e15`, the first try | [`9e4fccbc163183129fd22b0db1f30e5bb354e202e0f04a66d0d26658158dcf91`](https://stellar.expert/explorer/testnet/tx/9e4fccbc163183129fd22b0db1f30e5bb354e202e0f04a66d0d26658158dcf91) | 0.9 USD, fee 0.1 USDC | completed 00:40:43 UTC |

The owner's dashboard shows the cash-out as the balance going from 1.00 USDC to 0 while Earned and Passes sold stay the same, because it counts only USDC coming in. The USD payout is simulated by the test anchor; no real money moves.

The `more_info_url` the anchor returns answers 401 when opened later, so keep the form's page open to see `completed`.

The euro leg is shown, not moved. The test anchor lists only USDC, SRT and XLM, and its payout is a simulated USD bank transfer. Circle does issue EURC on Stellar testnet (`GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO`, from developers.circle.com), but no testnet anchor here pays euros out to a bank. The owner's dashboard shows euros at a display rate; on mainnet, a euro anchor does the real exchange.
