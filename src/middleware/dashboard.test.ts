import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import { AGENT_PASS_CONTRACT, agentPass, dashboardHandler, dashboardHtml } from './index.ts';

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
