import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Address, Keypair, nativeToScVal } from '@stellar/stellar-sdk';
import { AGENT_PASS_CONTRACT, agentPass, dashboardHandler, dashboardHtml } from './index.ts';
import { passSales } from './dashboard.ts';

const app = Keypair.random();
const config = { app: app.publicKey(), price: '0.05', ttlSeconds: 1800, contractId: AGENT_PASS_CONTRACT };

test('the dashboard page carries the owner address, the price, the pass length and the contract', () => {
  const html = dashboardHtml(config);
  assert.match(html, /<!doctype html>/);
  assert.ok(html.includes(`"app":"${app.publicKey()}"`));
  assert.ok(html.includes('0.05 USDC per pass'));
  assert.ok(html.includes('<b>30 minutes</b>'));
  assert.ok(html.includes(`/contract/${AGENT_PASS_CONTRACT}`));
  assert.ok(html.includes('horizon-testnet.stellar.org'));
  // no fixed numbers: the page has nothing to show before the ledger answers
  assert.ok(!/\d+ passes/.test(html));
});

test('the settings the owner typed render as text, never as markup', () => {
  const html = dashboardHtml({ ...config, price: '0.05<b>x</b>' });
  assert.ok(!html.includes('0.05<b>x</b>'));
  assert.ok(html.includes('0.05&lt;b&gt;x&lt;/b&gt; USDC per pass'));
});

type Call = { status?: number; type?: string; body?: string; headers: Record<string, string>; next: number };
function fakeResponse(): Call & { res: object } {
  const call: Call = { headers: {}, next: 0 };
  const res = {
    setHeader: (k: string, v: string) => void (call.headers[k] = v),
    type: (t: string) => void (call.type = t) ?? res,
    send: (b: string) => void (call.body = b),
    status: (s: number) => void (call.status = s) ?? res,
  };
  return Object.assign(call, { res });
}

test('the dashboard handler serves the page at its mount root and passes everything else on', () => {
  const handler = dashboardHandler(config);
  const root = fakeResponse();
  handler({ method: 'GET', path: '/' } as never, root.res as never, () => root.next++);
  assert.equal(root.next, 0);
  assert.equal(root.type, 'html');
  assert.equal(root.headers['Cache-Control'], 'no-store');
  assert.ok(root.body!.includes('<h1>Sales</h1>'));

  const deeper = fakeResponse();
  handler({ method: 'GET', path: '/other' } as never, deeper.res as never, () => deeper.next++);
  assert.equal(deeper.next, 1);
  assert.equal(deeper.body, undefined);

  const post = fakeResponse();
  handler({ method: 'POST', path: '/' } as never, post.res as never, () => post.next++);
  assert.equal(post.next, 1);
});

test('the gate carries its dashboard, built from the same settings', () => {
  const gate = agentPass({ price: '0.02', ttlSeconds: 1800, appSecret: app.secret(), mppSecretKey: 'x'.repeat(64) });
  assert.equal(typeof gate, 'function');
  const call = fakeResponse();
  gate.dashboard({ method: 'GET', path: '/' } as never, call.res as never, () => call.next++);
  assert.ok(call.body!.includes('0.02 USDC per pass'));
  assert.ok(call.body!.includes(app.publicKey()));
  assert.ok(!call.body!.includes(app.secret()));
});

// Horizon operations as the owner's /operations feed shows them, with arguments encoded by the SDK.
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const arg = (address: string) => ({ value: new Address(address).toScVal().toXDR('base64') });
let ledger = 1000;
const op = (source: string) => ({
  id: String((BigInt(++ledger) << 32n) | 4097n), type: 'invoke_host_function', source_account: source,
  transaction_hash: `tx-${ledger}`, transaction_successful: true, created_at: new Date(ledger * 5000).toISOString(),
});
const paid = (from: string, amount = '0.0500000') => ({
  ...op(from),
  asset_balance_changes: [{ asset_code: 'USDC', asset_issuer: USDC_ISSUER, from, to: app.publicKey(), amount }],
});
const issued = (agent: string, { by = app.publicKey(), contractId = AGENT_PASS_CONTRACT, ok = true } = {}) => ({
  ...op(by), transaction_successful: ok, asset_balance_changes: null,
  parameters: [arg(contractId), { value: nativeToScVal('issue', { type: 'symbol' }).toXDR('base64') }, arg(by), arg(agent), { value: nativeToScVal(ledger + 720, { type: 'u32' }).toXDR('base64') }],
});
// Horizon answers newest first.
const sold = (ops: object[]) => passSales([...ops].reverse() as never, { app: app.publicKey(), contractId: AGENT_PASS_CONTRACT, usdcIssuer: USDC_ISSUER }).map((s) => s.hash);

test('a payment followed by its pass is a sale; USDC with no pass after it is not', () => {
  const agent = Keypair.random().publicKey(), gift = Keypair.random().publicKey();
  const ops = [paid(agent), issued(agent), paid(gift, '5.0000000')];
  assert.deepEqual(sold(ops), [ops[0].transaction_hash]);
});

test('a payment whose pass failed on chain or went to another agent is not a sale', () => {
  const a = Keypair.random().publicKey(), b = Keypair.random().publicKey();
  assert.deepEqual(sold([paid(a), issued(a, { ok: false }), issued(b)]), []);
});

test('only a pass the owner signed, in the pass contract, makes a sale', () => {
  const agent = Keypair.random().publicKey(), other = Keypair.random().publicKey();
  assert.deepEqual(sold([paid(agent), issued(agent, { by: other }), issued(agent, { contractId: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA' })]), []);
});

test('a pass issued before the payment does not count it', () => {
  const agent = Keypair.random().publicKey();
  assert.deepEqual(sold([issued(agent), paid(agent)]), []);
});

test('each pass counts one payment: two passes for two payments, the newest payment after a failed one', () => {
  const agent = Keypair.random().publicKey();
  const twice = [paid(agent), paid(agent), issued(agent), issued(agent)];
  assert.deepEqual(sold(twice).sort(), [twice[0].transaction_hash, twice[1].transaction_hash].sort());
  const retry = [paid(agent), paid(agent), issued(agent)];
  assert.deepEqual(sold(retry), [retry[1].transaction_hash]);
});

test('the page runs the same sale rule in the browser, on the operations feed', () => {
  const html = dashboardHtml(config);
  assert.ok(html.includes(passSales.toString()));
  assert.ok(html.includes('/operations?order=desc'));
});
