// The owner cashes out: a SEP-24 withdrawal of the app's testnet USDC through
// the SDF test anchor, which pays out simulated US dollars.
//
//   AGENT_PASS_APP_SECRET="$(stellar keys secret <owner>)" node scripts/cash-out.ts [amount]
//
// It signs in to the anchor with the owner's key (SEP-10), starts a withdrawal
// and prints the anchor's form. Once the form is sent, it pays the USDC to the
// anchor with the anchor's memo and waits for the status completed. The secret
// comes in the environment and is never printed.

import { Asset, Horizon, Keypair, Memo, Operation, TransactionBuilder, WebAuth } from '@stellar/stellar-sdk';

const DOMAIN = 'testanchor.stellar.org';
const ANCHOR = `https://${DOMAIN}`;
const ANCHOR_KEY = 'GCHLHDBOKG2JWMJQBTLSL5XG6NO7ESXI2TAQKZXCXWXB5WI2X6W233PR'; // SIGNING_KEY in its stellar.toml
const PASSPHRASE = 'Test SDF Network ; September 2015';
const USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
const tx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deadline = Date.now() + 15 * 60_000; // give up after 15 minutes
const fail = (why: string) => { console.error(why); process.exit(1); };

if (!process.env.AGENT_PASS_APP_SECRET) fail('usage: AGENT_PASS_APP_SECRET="$(stellar keys secret <owner>)" node scripts/cash-out.ts [amount]');
const owner = Keypair.fromSecret(process.env.AGENT_PASS_APP_SECRET!);
const amount = process.argv[2] ?? '1';
console.log(`owner   ${owner.publicKey()}`);

// 1. SEP-10: check the anchor's challenge, sign it with the owner's key, get a token.
const challenge = await (await fetch(`${ANCHOR}/auth?account=${owner.publicKey()}`)).json();
const { tx: signIn } = WebAuth.readChallengeTx(challenge.transaction, ANCHOR_KEY, PASSPHRASE, DOMAIN, DOMAIN);
signIn.sign(owner);
const auth = await fetch(`${ANCHOR}/auth`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ transaction: signIn.toXDR() }),
});
const { token } = await auth.json();
if (!token) fail(`sign-in refused: ${auth.status}`);
const headers = { authorization: `Bearer ${token}` };
console.log('\n1. signed in to testanchor.stellar.org (SEP-10)');

// 2. SEP-24: start the withdrawal; the anchor answers with its form.
const start = await (await fetch(`${ANCHOR}/sep24/transactions/withdraw/interactive`, {
  method: 'POST',
  headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({ asset_code: 'USDC', asset_issuer: USDC.getIssuer(), account: owner.publicKey(), amount }),
})).json();
if (!start.url) fail(`withdrawal refused: ${JSON.stringify(start)}`);
console.log(`\n2. withdrawal ${start.id}: fill in the anchor's form`);
console.log(`FORM ${start.url}`);

const read = async () =>
  (await (await fetch(`${ANCHOR}/sep24/transaction?id=${start.id}`, { headers })).json()).transaction;

// 3. Once the form is sent, pay the anchor the USDC with its memo.
let t = await read();
while (t.status === 'incomplete' || (t.status === 'pending_user_transfer_start' && !t.withdraw_anchor_account)) {
  if (Date.now() > deadline) fail('the form was not sent in time');
  await sleep(2000);
  t = await read();
}
if (t.status !== 'pending_user_transfer_start') fail(`unexpected status ${t.status}`);
if (Number(t.amount_in) !== Number(amount)) fail(`the form asks for ${t.amount_in} USDC, not ${amount}: nothing paid`);
console.log(`\n3. paying ${t.amount_in} USDC to the anchor ${t.withdraw_anchor_account}`);
const memo =
  t.withdraw_memo_type === 'id' ? Memo.id(t.withdraw_memo)
  : t.withdraw_memo_type === 'hash' ? Memo.hash(Buffer.from(t.withdraw_memo, 'base64').toString('hex'))
  : Memo.text(t.withdraw_memo);
const payment = new TransactionBuilder(await horizon.loadAccount(owner.publicKey()), { fee: '1000', networkPassphrase: PASSPHRASE })
  .addOperation(Operation.payment({ destination: t.withdraw_anchor_account, asset: USDC, amount: t.amount_in }))
  .addMemo(memo)
  .setTimeout(60)
  .build();
payment.sign(owner);
const sent = await horizon.submitTransaction(payment);
console.log(`   paid    ${tx(sent.hash)}`);

// 4. Wait until the anchor marks the withdrawal completed.
while (!['completed', 'error', 'refunded', 'expired'].includes(t.status)) {
  if (Date.now() > deadline) fail(`the anchor did not finish in time, status ${t.status}`);
  await sleep(3000);
  t = await read();
  console.log(`   status  ${t.status}`);
}
if (t.status !== 'completed') fail(`withdrawal ended ${t.status}`);
console.log(`\n4. completed: ${t.amount_out} USD out to the bank (simulated by the test anchor), fee ${t.fee_details?.total ?? t.amount_fee} USDC`);
console.log(JSON.stringify({ id: t.id, payment: sent.hash, amount_in: t.amount_in, amount_out: t.amount_out, fee: t.fee_details?.total ?? t.amount_fee, completed_at: t.completed_at }));
