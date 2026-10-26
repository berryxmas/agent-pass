import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, rpc } from '@stellar/stellar-sdk';
import { confirmIssued, passLength, signPass, verifyPass, type PassClaims } from './index.ts';

const app = Keypair.random();
const claims = (exp: number): PassClaims => ({ app: app.publicKey(), agent: Keypair.random().publicKey(), exp, payment: 'p', issue: 'i' });

test('a fresh pass verifies locally', () => {
  const c = claims(2000);
  assert.deepEqual(verifyPass(signPass(c, app), app.publicKey(), 1000), c);
});

test('an expired pass is refused', () => {
  assert.equal(verifyPass(signPass(claims(1000), app), app.publicKey(), 1000), null);
});

test('a pass signed by another key is refused', () => {
  assert.equal(verifyPass(signPass(claims(2000), Keypair.random()), app.publicKey(), 1000), null);
});

test('a pass with a changed expiry is refused', () => {
  const [, sig] = signPass(claims(2000), app).split('.');
  const body = Buffer.from(JSON.stringify(claims(9999))).toString('base64url');
  assert.equal(verifyPass(`${body}.${sig}`, app.publicKey(), 1000), null);
});

test('garbage is refused', () => {
  assert.equal(verifyPass('not-a-token', app.publicKey()), null);
});

const sent = (status?: rpc.Api.GetTransactionStatus) =>
  ({ sendTransactionResponse: { hash: 'abc' }, getTransactionResponse: status && { status } }) as unknown as Parameters<typeof confirmIssued>[0];

test('an issue that succeeded on chain gives its hash', () => {
  assert.equal(confirmIssued(sent(rpc.Api.GetTransactionStatus.SUCCESS)), 'abc');
});

test('an issue that failed on chain gives no pass', () => {
  assert.throws(() => confirmIssued(sent(rpc.Api.GetTransactionStatus.FAILED)), /abc ended with status FAILED/);
});

test('an issue with no final status gives no pass', () => {
  assert.throws(() => confirmIssued(sent()), /status unknown/);
});

test('the 402 names the pass length the owner set', () => {
  assert.equal(passLength(3600), 'one hour');
  assert.equal(passLength(1800), '30 minutes');
  assert.equal(passLength(7200), '2 hours');
  assert.equal(passLength(90), '90 seconds');
});
