import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Keypair } from '@stellar/stellar-sdk';
import { PASS_HEADER, signPass } from '../middleware/index.ts';
import { PROOF_HEADER, signProof, verifyProof } from './honor.ts';
import { createApp } from './server.ts';

const AUDIENCE = 'reviews.test';
const seller = Keypair.random();
const agent = Keypair.random();
const pass = (by = seller, ttl = 3600) =>
  signPass({ app: by.publicKey(), agent: agent.publicKey(), exp: Math.floor(Date.now() / 1000) + ttl, payment: 'p', issue: 'i' }, by);

type Contract = (contract: string, app: string, agent: string) => Promise<boolean>;

/** Sends each header set in turn to one running second app over HTTP; the contract answers with `isValid`. */
async function calls(requests: Record<string, string>[], isValid: Contract = async () => true) {
  const asked: string[][] = [];
  const server = createApp({ apps: [seller.publicKey()], audience: AUDIENCE, isValid: (c, a, w) => (asked.push([a, w]), isValid(c, a, w)) }).listen(0);
  const port = (server.address() as AddressInfo).port;
  const send = (headers: Record<string, string>) =>
    new Promise<{ status: number; body: any }>((resolve, reject) => {
      request({ port, path: '/agent/reviews', headers }, (res) => {
        let text = '';
        res.on('data', (chunk) => (text += chunk)).on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(text) }));
      }).on('error', reject).end();
    });
  try {
    const results = [];
    for (const headers of requests) results.push(await send(headers));
    return { results, asked };
  } finally {
    server.close();
  }
}
const call = async (headers: Record<string, string>, isValid?: Contract) => {
  const { results, asked } = await calls([headers], isValid);
  return { ...results[0], asked };
};
const signed = (token: string, signer = agent, audience = AUDIENCE) => ({ [PASS_HEADER]: token, [PROOF_HEADER]: signProof(signer, audience) });

test('the agent that bought the pass gets in, once the contract says it is live', async () => {
  const r = await call(signed(pass()));
  assert.equal(r.status, 200);
  assert.equal(r.body.pass.agent, agent.publicKey());
  assert.deepEqual(r.asked, [[seller.publicKey(), agent.publicKey()]]);
});

test('no pass: 401', async () => {
  assert.equal((await call({})).status, 401);
});

test('a copied pass with no signature by the agent key: 401, contract not asked', async () => {
  const r = await call({ [PASS_HEADER]: pass() });
  assert.equal(r.status, 401);
  assert.deepEqual(r.asked, []);
});

test('a copied pass signed by another key: 401', async () => {
  assert.equal((await call(signed(pass(), Keypair.random()))).status, 401);
});

test('a signature the agent made for another app, sent with that app as Host: 401', async () => {
  const r = await call({ ...signed(pass(), agent, 'evil.example'), host: 'evil.example' });
  assert.equal(r.status, 401);
  assert.deepEqual(r.asked, []);
});

test('the same signature sent twice: the second gets 401', async () => {
  const headers = signed(pass());
  const { results } = await calls([headers, headers]);
  assert.deepEqual(results.map((r) => r.status), [200, 401]);
});

test('an expired pass: 401', async () => {
  assert.equal((await call(signed(pass(seller, -1)))).status, 401);
});

test('a pass from an app this app does not honor: 401', async () => {
  assert.equal((await call(signed(pass(Keypair.random())))).status, 401);
});

test('the contract has no live pass: 401', async () => {
  const r = await call(signed(pass()), async () => false);
  assert.equal(r.status, 401);
  assert.equal(r.asked.length, 1);
});

test('the contract cannot be reached: 502, nobody gets in', async () => {
  const r = await call(signed(pass()), async () => {
    throw new Error('rpc down');
  });
  assert.equal(r.status, 502);
});

test('a proof is bound to its app and to the minute', () => {
  const proof = signProof(agent, AUDIENCE, 1000);
  assert.equal(verifyProof(proof, agent.publicKey(), AUDIENCE, 1030), true);
  assert.equal(verifyProof(proof, agent.publicKey(), 'other.example', 1030), false);
  assert.equal(verifyProof(proof, agent.publicKey(), AUDIENCE, 1061), false);
  assert.equal(verifyProof(proof, Keypair.random().publicKey(), AUDIENCE, 1030), false);
  assert.equal(verifyProof('garbage', agent.publicKey(), AUDIENCE, 1000), false);
});
