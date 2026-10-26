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

The euro leg is shown, not moved. The test anchor lists only USDC, SRT and XLM, and its payout is a simulated USD bank transfer. Circle does issue EURC on Stellar testnet (`GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO`, from developers.circle.com), but no testnet anchor here pays euros out to a bank. The owner's dashboard shows euros at a display rate; on mainnet, a euro anchor does the real exchange.
